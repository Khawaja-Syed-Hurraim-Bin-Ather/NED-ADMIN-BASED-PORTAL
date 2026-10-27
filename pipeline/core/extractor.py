"""
EduCompass Pipeline — Phase 1 FYP Data Extractor
Playbook ref: Sections 5, 6.1-6.10

Reads every FYP PDF from pipeline/raw/fyp/, extracts project records,
applies privacy rules, domain/tool tagging, and writes clean JSONL to
pipeline/extracted/.

Rules enforced:
  - Student names and roll numbers are NEVER stored (Playbook rule 1, D6).
  - Outcome default = 'accepted' (D9).
  - In-scope programs: CSE, CS, SE only (D10).
  - Domain/tool tags: only if keyword appears literally in the title.
  - Company names normalised using company_aliases.json.
  - Every record is validated by privacy_validator before writing.
  - Extracted status = 'extracted' — Admin review required before 'published'.

Usage:
    python pipeline/core/extractor.py
    # Produces: pipeline/extracted/fyp_YEAR.jsonl
    # Counts:   pipeline/reports/phase_1_extraction_counts.json

Requires: pdfplumber
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

from pipeline.core.privacy_validator import validate_record

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent
RAW_FYP_DIR = ROOT / "pipeline" / "raw" / "fyp"
EXTRACTED_DIR = ROOT / "pipeline" / "extracted"
VOCAB_DIR = ROOT / "pipeline" / "vocab"
REPORTS_DIR = ROOT / "pipeline" / "reports"
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ── Load Vocabularies ─────────────────────────────────────────────────────────
_domains_json = json.loads((VOCAB_DIR / "domains.json").read_text(encoding="utf-8"))
DOMAIN_KEYWORDS: dict[str, list[str]] = _domains_json["domain_keywords"]

_tools_json = json.loads((VOCAB_DIR / "tools.json").read_text(encoding="utf-8"))
TOOLS_LIST: list[str] = _tools_json["tools"]

_aliases_json = json.loads((VOCAB_DIR / "company_aliases.json").read_text(encoding="utf-8"))
COMPANY_ALIASES: dict[str, list[str]] = _aliases_json["aliases"]
# Build a reverse lookup: variant -> canonical
_ALIAS_REVERSE: dict[str, str] = {}
for canonical, variants in COMPANY_ALIASES.items():
    for v in variants:
        _ALIAS_REVERSE[v.lower().strip()] = canonical

# ── PII Patterns ──────────────────────────────────────────────────────────────
ROLL_NUMBER_RE = re.compile(r"\b[A-Z]{2,4}-\d{4,6}\b")

# ── In-scope program detection ────────────────────────────────────────────────
# D10: only CSE, CS, SE are in scope
IN_SCOPE_KEYWORDS = [
    "software", "computer science", "computer systems", "cse", "se", "cs",
]
OUT_OF_SCOPE_KEYWORDS = [
    "electrical", "mechanical", "civil", "chemical", "industrial", "telecom",
]


# ── Dataclass for a canonical FYP v2 record ───────────────────────────────────
@dataclass
class FypRecord:
    schema_version: str = "fyp.v2"
    title: str = ""
    raw_title: str = ""
    year: Optional[int] = None
    proposal_outcome: str = "accepted"  # D9: default accepted
    outcome_reason: str = "Default: no status specified in source list"
    outcome_evidence: str = ""
    supervisor: str = ""
    supervisor_title: str = ""
    co_supervisor: str = ""
    program: str = ""
    department: str = "Computer & Information Systems Engineering"
    university: str = "NED University of Engineering & Technology"
    team_size: Optional[int] = None
    domain_tags: list[str] = field(default_factory=list)
    tags_source: str = "derived"
    tools: list[str] = field(default_factory=list)
    companies_approached: list[str] = field(default_factory=list)
    raw_company_text: str = ""
    status: str = "extracted"  # Admin must approve before published
    relevance: str = "uncertain"
    relevance_reason: list[str] = field(default_factory=list)
    source_file: str = ""
    source_page: int = 0
    raw_text_redacted: str = ""
    extracted_at: str = ""
    confidence: float = 0.0
    natural_key: str = ""  # sha1 of (title + year + supervisor)


# ── Helper functions ──────────────────────────────────────────────────────────

def _tag_domains(title: str) -> list[str]:
    """Return domain tags whose keywords appear literally in the lowercased title.
    Only tags if keyword appears — never infers."""
    title_lower = title.lower()
    tags: list[str] = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in title_lower:
                tags.append(domain)
                break
    return sorted(set(tags))


def _tag_tools(title: str) -> list[str]:
    """Return tool tags where the exact tool name appears in the title.
    Case-insensitive match but must be an exact token boundary match."""
    title_lower = title.lower()
    found: list[str] = []
    for tool in TOOLS_LIST:
        # Use word-boundary matching
        pattern = re.compile(r'\b' + re.escape(tool.lower()) + r'\b')
        if pattern.search(title_lower):
            found.append(tool)
    return sorted(set(found))


def _normalise_company(raw: str) -> str:
    """Return canonical company slug if known, else a simple slug of the raw name."""
    key = raw.lower().strip()
    if key in _ALIAS_REVERSE:
        return _ALIAS_REVERSE[key]
    # Fallback: slugify
    slug = re.sub(r'[^a-z0-9]+', '-', key).strip('-')
    return slug or "unknown"


def _extract_companies(industry_text: str) -> tuple[list[str], str]:
    """Parse the Industry column, returning (normalised_company_slugs, raw_text)."""
    if not industry_text or industry_text.strip() in ("-", "", "N/A", "n/a", "None"):
        return [], ""
    # Multiple companies may be comma or slash separated
    raw_companies = re.split(r'[,/|]', industry_text)
    normalised = []
    for c in raw_companies:
        c = c.strip()
        if c and c not in ("-", "N/A", "n/a"):
            normalised.append(_normalise_company(c))
    return normalised, industry_text.strip()


def _classify_relevance(title: str, supervisor: str, source_file: str) -> tuple[str, list[str]]:
    """Classify whether a project is in_scope / out_of_scope / uncertain.
    D10: CSE, CS, SE titles are in_scope; known out-of-scope keywords = out_of_scope."""
    reasons: list[str] = []
    title_lower = title.lower()

    # Check for out-of-scope signals first
    for kw in OUT_OF_SCOPE_KEYWORDS:
        if kw in title_lower:
            return "out_of_scope", [f"Title contains out-of-scope keyword: '{kw}'"]

    # All FYP PDFs from CISE dept are assumed in-scope by default
    # (they're from the CS/SE/CSE department lists)
    reasons.append("Source file is from NED CISE department FYP list")
    return "in_scope", reasons


def _compute_natural_key(title: str, year: Optional[int], supervisor: str) -> str:
    """SHA-1 of (title + year + supervisor) for idempotent loading."""
    raw = f"{title.lower().strip()}|{year}|{supervisor.lower().strip()}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()


def _parse_supervisor(supervisor_raw: str) -> tuple[str, str, str]:
    """Split 'Dr. X / Co-Supervisor: Y' into (title, name, co_supervisor)."""
    if not supervisor_raw:
        return "", "", ""

    parts = re.split(r'[/,]', supervisor_raw, maxsplit=1)
    primary = parts[0].strip()
    co = parts[1].strip() if len(parts) > 1 else ""

    # Extract title prefix
    title = ""
    name = primary
    for prefix in ("Dr.", "Prof.", "Mr.", "Ms.", "Mrs."):
        if primary.startswith(prefix):
            title = prefix
            name = primary[len(prefix):].strip()
            break

    return title, name, co


def _clean_title(raw: str) -> str:
    """Normalise whitespace, strip quotes, control chars."""
    if not raw:
        return ""
    cleaned = re.sub(r'\s+', ' ', raw).strip().strip('"\'')
    return cleaned


# ── PDF-specific parsers ──────────────────────────────────────────────────────

def _parse_standard_sop_table(table: list[list], page_num: int, source_file: str, year: int) -> list[FypRecord]:
    """
    Parse the standard SOP FYDP list format (2022-2025).
    Columns: S.No. | Project Title | Student Name (DROP) | Supervisor/Co-Supervisor | Industry

    The first row is the header. Subsequent rows are data rows.
    The 'Student Name' column is identified and skipped — NEVER stored.
    """
    records: list[FypRecord] = []
    if not table or len(table) < 2:
        return records

    header = [str(c or "").strip().lower() for c in table[0]]

    # Find column indices by name
    title_idx = next((i for i, h in enumerate(header) if "title" in h or "project" in h), None)
    supervisor_idx = next((i for i, h in enumerate(header) if "supervisor" in h), None)
    industry_idx = next((i for i, h in enumerate(header) if "industry" in h or "company" in h), None)
    # PII columns — intentionally not stored, but we detect their index to skip
    pii_idxes = [i for i, h in enumerate(header) if any(kw in h for kw in ["student", "name", "roll", "team", "member"])]

    if title_idx is None:
        return records  # Can't parse without title column

    for row in table[1:]:
        if not row or len(row) <= (title_idx or 0):
            continue

        raw_title = str(row[title_idx] or "").strip()
        if not raw_title or raw_title.lower() in ("project title", ""):
            continue  # Skip header repetitions

        # Count team size from the student column (count names) — without storing the names
        team_size = None
        for pii_idx in pii_idxes:
            if pii_idx < len(row) and row[pii_idx]:
                names_text = str(row[pii_idx])
                # Count numbered entries (1. 2. 3. 4.)
                numbered = re.findall(r'\d+\.', names_text)
                if numbered:
                    team_size = len(numbered)
                else:
                    # Fall back to comma-counting
                    team_size = len([n for n in names_text.split('\n') if n.strip()]) or None
                break  # Only use first PII column for team size

        supervisor_raw = ""
        if supervisor_idx is not None and supervisor_idx < len(row):
            supervisor_raw = str(row[supervisor_idx] or "").strip()

        industry_raw = ""
        if industry_idx is not None and industry_idx < len(row):
            industry_raw = str(row[industry_idx] or "").strip()

        title = _clean_title(raw_title)
        sup_title, sup_name, co_sup = _parse_supervisor(supervisor_raw)
        companies, raw_company_text = _extract_companies(industry_raw)
        domain_tags = _tag_domains(title)
        tools = _tag_tools(title)
        relevance, relevance_reason = _classify_relevance(title, sup_name, source_file)
        nat_key = _compute_natural_key(title, year, sup_name)

        # Build redacted text (for search — no PII)
        redacted_text = ROLL_NUMBER_RE.sub("[ROLL_REDACTED]", f"{title} {sup_name} {industry_raw}")

        record = FypRecord(
            title=title,
            raw_title=raw_title,
            year=year,
            proposal_outcome="accepted",
            outcome_reason="Default: no status specified in source list (D9)",
            supervisor=sup_name,
            supervisor_title=sup_title,
            co_supervisor=co_sup,
            department="Computer & Information Systems Engineering",
            university="NED University of Engineering & Technology",
            team_size=team_size,
            domain_tags=domain_tags,
            tools=tools,
            companies_approached=companies,
            raw_company_text=raw_company_text,
            status="extracted",
            relevance=relevance,
            relevance_reason=relevance_reason,
            source_file=source_file,
            source_page=page_num,
            raw_text_redacted=redacted_text[:500],  # cap at 500 chars
            extracted_at=datetime.now(timezone.utc).isoformat(),
            confidence=0.85 if supervisor_raw else 0.6,
            natural_key=nat_key,
        )
        records.append(record)

    return records


def _parse_fyp_2022_format(table: list[list], page_num: int, source_file: str, year: int) -> list[FypRecord]:
    """
    Parse the 2022 FYP list format (older, non-SOP format).
    Columns: Group ID | Name (DROP) | Roll No. (DROP) | Project Title | Internal Advisor(s) | [extra]

    Name and Roll No. columns are detected and skipped — NEVER stored.
    Roll numbers in cell values are also dropped.
    """
    records: list[FypRecord] = []
    if not table or len(table) < 2:
        return records

    header = [str(c or "").strip().lower() for c in table[0]]

    # If the first row looks like it's already a data row (header was the first data row itself)
    # e.g. when pdfplumber picks up "7 | Syed Maaz Hassan | CS-18054 | Point Pay..." as the header
    # Detect this by checking if header[0] looks numeric
    if header and re.match(r'^\d+$', header[0]):
        # This table's header row is actually a data row — treat entire table as data rows
        # Use known column order: [group_id, name, roll, title, advisor]
        data_rows = table
        title_idx = 3
        advisor_idx = 4
        pii_idxes = [1, 2]
    else:
        title_idx = next((i for i, h in enumerate(header) if "title" in h or "project" in h), 3)
        advisor_idx = next((i for i, h in enumerate(header) if "advisor" in h or "supervisor" in h), 4)
        pii_idxes = [i for i, h in enumerate(header) if any(kw in h for kw in ["name", "roll", "team", "student", "member"])]
        data_rows = table[1:]

    for row in data_rows:
        if not row:
            continue

        # Skip rows that are clearly roll numbers (PII row)
        if len(row) > 2 and ROLL_NUMBER_RE.match(str(row[0] or "").strip()):
            continue

        if title_idx >= len(row):
            continue
        raw_title = str(row[title_idx] or "").strip()
        if not raw_title or len(raw_title) < 5:
            continue

        # Count team size from PII column (counting only, not storing)
        team_size = None
        for pii_idx in pii_idxes:
            if pii_idx < len(row) and row[pii_idx]:
                names_text = str(row[pii_idx])
                numbered = re.findall(r'\d+\.', names_text)
                if numbered:
                    team_size = len(numbered)
                else:
                    lines = [l.strip() for l in names_text.split('\n') if l.strip()]
                    team_size = len(lines) if lines else None
                break

        supervisor_raw = ""
        if advisor_idx < len(row):
            supervisor_raw = str(row[advisor_idx] or "").strip()

        title = _clean_title(raw_title)
        sup_title, sup_name, co_sup = _parse_supervisor(supervisor_raw)
        domain_tags = _tag_domains(title)
        tools = _tag_tools(title)
        relevance, relevance_reason = _classify_relevance(title, sup_name, source_file)
        nat_key = _compute_natural_key(title, year, sup_name)

        redacted_text = ROLL_NUMBER_RE.sub("[ROLL_REDACTED]", f"{title} {sup_name}")

        record = FypRecord(
            title=title,
            raw_title=raw_title,
            year=year,
            proposal_outcome="accepted",
            outcome_reason="Default: no status specified in source list (D9)",
            supervisor=sup_name,
            supervisor_title=sup_title,
            co_supervisor=co_sup,
            department="Computer & Information Systems Engineering",
            university="NED University of Engineering & Technology",
            team_size=team_size,
            domain_tags=domain_tags,
            tools=tools,
            companies_approached=[],
            raw_company_text="",
            status="extracted",
            relevance=relevance,
            relevance_reason=relevance_reason,
            source_file=source_file,
            source_page=page_num,
            raw_text_redacted=redacted_text[:500],
            extracted_at=datetime.now(timezone.utc).isoformat(),
            confidence=0.75,
            natural_key=nat_key,
        )
        records.append(record)

    return records


def extract_fyp_pdf(pdf_path: Path) -> tuple[list[dict], dict]:
    """
    Extract records from a single FYP PDF.
    Returns (clean_records, counts) where counts = {seen, extracted, dropped, pii_rejected}.
    """
    year_match = re.search(r"(\d{4})", pdf_path.name)
    year = int(year_match.group(1)) if year_match else None
    source_file = pdf_path.name
    is_sop_format = pdf_path.name.lower().startswith("sop")

    counts = {"seen": 0, "extracted": 0, "dropped": 0, "pii_rejected": 0}
    all_records: list[dict] = []
    seen_keys: set[str] = set()

    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, start=1):
            tables = page.extract_tables()
            for table in tables:
                if not table or len(table) < 2:
                    continue

                if is_sop_format:
                    raw_records = _parse_standard_sop_table(table, page_num, source_file, year)
                else:
                    raw_records = _parse_fyp_2022_format(table, page_num, source_file, year)

                for rec in raw_records:
                    counts["seen"] += 1

                    # Deduplicate by natural key
                    if rec.natural_key in seen_keys:
                        counts["dropped"] += 1
                        continue
                    seen_keys.add(rec.natural_key)

                    # Skip records with no title
                    if not rec.title:
                        counts["dropped"] += 1
                        continue

                    rec_dict = asdict(rec)

                    # Privacy validation — hard gate
                    ok, errors = validate_record(rec_dict)
                    if not ok:
                        counts["pii_rejected"] += 1
                        print(f"    [PII REJECTED] {rec.title[:60]}: {errors}")
                        continue

                    counts["extracted"] += 1
                    all_records.append(rec_dict)

    return all_records, counts


def run_extraction() -> dict:
    """Run extraction on all FYP PDFs and return total counts."""
    fyp_pdfs = sorted(RAW_FYP_DIR.glob("*.pdf"))
    if not fyp_pdfs:
        print(f"WARNING: No PDFs found in {RAW_FYP_DIR}")
        return {}

    total_counts: dict[str, int] = {"seen": 0, "extracted": 0, "dropped": 0, "pii_rejected": 0}
    per_file_counts: dict[str, dict] = {}

    for pdf_path in fyp_pdfs:
        print(f"  Extracting: {pdf_path.name} ...", end=" ", flush=True)
        records, counts = extract_fyp_pdf(pdf_path)
        print(f"seen={counts['seen']}, extracted={counts['extracted']}, dropped={counts['dropped']}, pii_rejected={counts['pii_rejected']}")

        # Write per-year JSONL
        year_match = re.search(r"(\d{4})", pdf_path.name)
        year = year_match.group(1) if year_match else "unknown"
        prefix = "sop_" if pdf_path.name.lower().startswith("sop") else ""
        out_file = EXTRACTED_DIR / f"fyp_{prefix}{year}.jsonl"
        with out_file.open("w", encoding="utf-8") as f:
            for rec in records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")

        per_file_counts[pdf_path.name] = counts
        for k in total_counts:
            total_counts[k] += counts[k]

    return {"total": total_counts, "per_file": per_file_counts}


if __name__ == "__main__":
    print("=== EduCompass Phase 1 - FYP Extractor ===")
    print(f"Source: {RAW_FYP_DIR}")
    print(f"Output: {EXTRACTED_DIR}")
    print()

    results = run_extraction()

    print()
    print("=== EXTRACTION COMPLETE ===")
    t = results.get("total", {})
    print(f"  Seen:          {t.get('seen', 0)}")
    print(f"  Extracted:     {t.get('extracted', 0)}")
    print(f"  Dropped (dup): {t.get('dropped', 0)}")
    print(f"  PII rejected:  {t.get('pii_rejected', 0)}")

    # Write counts report
    counts_path = REPORTS_DIR / "phase_1_extraction_counts.json"
    counts_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[OK] Counts written to: {counts_path}")
    print("[OK] JSONL files written to: pipeline/extracted/")
    print()
    print("Next step: Ram reviews extracted files, then run loader.py to push to Supabase.")
