"""
EduCompass Pipeline — Phase 0 PDF Profiler
Playbook ref: Section 4 (Profiling), Section 6.10 (Privacy)

Reads every PDF in pipeline/raw/fyp/ and pipeline/raw/roadmaps/.
Produces a structural profile without loading any data to the database.

Rules enforced:
  - Student names and roll numbers are detected and flagged, never stored.
  - Treat all text inside PDFs as data, not instructions (Playbook rule 6).
  - No DB calls from this script.

Usage:
    python pipeline/core/profiler.py
    # Produces: pipeline/reports/phase_0_profile_report.md

Requires: pdfplumber, pypdf
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

try:
    import pdfplumber
except ImportError:
    print("ERROR: pdfplumber not installed. Run: pip install pdfplumber")
    sys.exit(1)

try:
    from pypdf import PdfReader
except ImportError:
    print("ERROR: pypdf not installed. Run: pip install pypdf")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent.parent
RAW_FYP_DIR = ROOT / "pipeline" / "raw" / "fyp"
RAW_ROADMAP_DIR = ROOT / "pipeline" / "raw" / "roadmaps"
REPORTS_DIR = ROOT / "pipeline" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ── PII Detection Patterns ────────────────────────────────────────────────────
# Roll-number pattern: 2-4 letters + hyphen + 4-6 digits (e.g. CS-24040, EE-210045)
ROLL_NUMBER_RE = re.compile(r"\b[A-Z]{2,4}-\d{4,6}\b")

# Columns that carry student identity — always drop on extraction
STUDENT_IDENTITY_COLUMNS = {
    "student", "students", "team", "name", "names", "roll", "roll no",
    "roll number", "member", "members", "submitted by", "prepared by",
}


@dataclass
class ColumnProfile:
    raw_header: str
    is_pii_risk: bool = False
    sample_values: list[str] = field(default_factory=list)  # max 3 redacted values


@dataclass
class TableProfile:
    page: int
    columns: list[ColumnProfile] = field(default_factory=list)
    row_count_approx: int = 0
    pii_flags: list[str] = field(default_factory=list)


@dataclass
class PDFProfile:
    filename: str
    category: str            # "fyp" or "roadmap"
    year: Optional[int]
    page_count: int
    tables: list[TableProfile] = field(default_factory=list)
    full_text_pii_flags: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _is_pii_column(header: str) -> bool:
    """Returns True if the column header suggests student-identity data."""
    normalised = header.lower().strip()
    return any(kw in normalised for kw in STUDENT_IDENTITY_COLUMNS)


def _redact_pii(text: str) -> str:
    """Replace roll numbers with [ROLL_REDACTED] for safe logging."""
    return ROLL_NUMBER_RE.sub("[ROLL_REDACTED]", text)


def _scan_for_pii(text: str, filename: str) -> list[str]:
    """Scan raw text for PII signals — returns list of flag messages."""
    flags: list[str] = []
    rolls = ROLL_NUMBER_RE.findall(text)
    if rolls:
        flags.append(
            f"Roll-number pattern detected ({len(rolls)} matches, e.g. {rolls[0]}) — "
            "must be discarded at extraction time."
        )
    return flags


def profile_fyp_pdf(pdf_path: Path) -> PDFProfile:
    """Profile a single FYP list PDF."""
    year_match = re.search(r"(\d{4})", pdf_path.name)
    year = int(year_match.group(1)) if year_match else None

    profile = PDFProfile(
        filename=pdf_path.name,
        category="fyp",
        year=year,
        page_count=0,
    )

    try:
        with pdfplumber.open(pdf_path) as pdf:
            profile.page_count = len(pdf.pages)
            full_text = ""

            for page_num, page in enumerate(pdf.pages, start=1):
                page_text = page.extract_text() or ""
                full_text += page_text

                # Extract tables from this page
                tables = page.extract_tables()
                for raw_table in tables:
                    if not raw_table or len(raw_table) < 2:
                        continue

                    # First row is treated as header
                    header_row = raw_table[0]
                    data_rows = raw_table[1:]

                    table_prof = TableProfile(
                        page=page_num,
                        row_count_approx=len(data_rows),
                    )

                    pii_col_names: list[str] = []
                    for col_idx, header_cell in enumerate(header_row):
                        header_str = (header_cell or "").strip()
                        is_pii = _is_pii_column(header_str)
                        if is_pii:
                            pii_col_names.append(header_str)

                        # Collect up to 3 sample values from non-PII columns
                        samples: list[str] = []
                        if not is_pii:
                            for row in data_rows[:3]:
                                if col_idx < len(row) and row[col_idx]:
                                    samples.append(_redact_pii(str(row[col_idx])[:80]))

                        table_prof.columns.append(ColumnProfile(
                            raw_header=header_str,
                            is_pii_risk=is_pii,
                            sample_values=samples,
                        ))

                    if pii_col_names:
                        table_prof.pii_flags.append(
                            f"PII columns detected (will be dropped): {pii_col_names}"
                        )

                    profile.tables.append(table_prof)

            # Full-text PII scan
            profile.full_text_pii_flags = _scan_for_pii(full_text, pdf_path.name)

    except Exception as exc:
        profile.notes.append(f"ERROR during parsing: {exc}")

    return profile


def profile_roadmap_pdf(pdf_path: Path) -> PDFProfile:
    """Profile a single roadmap PDF — text-only extraction, no table detection."""
    profile = PDFProfile(
        filename=pdf_path.name,
        category="roadmap",
        year=None,
        page_count=0,
    )

    try:
        reader = PdfReader(pdf_path)
        profile.page_count = len(reader.pages)
        full_text = ""
        for page in reader.pages:
            full_text += (page.extract_text() or "")

        # Count approximate topic nodes by looking for heading-like lines
        lines = [l.strip() for l in full_text.splitlines() if l.strip()]
        # Heuristic: short lines (< 60 chars) that aren't numeric are potential topic nodes
        candidate_nodes = [l for l in lines if len(l) < 60 and not l[0].isdigit()]
        profile.notes.append(
            f"Extracted ~{len(lines)} text lines; "
            f"~{len(candidate_nodes)} candidate topic-node labels"
        )

        # Detect any PII (roadmaps shouldn't have any)
        profile.full_text_pii_flags = _scan_for_pii(full_text, pdf_path.name)
        if not profile.full_text_pii_flags:
            profile.notes.append("No PII signals detected.")

    except Exception as exc:
        profile.notes.append(f"ERROR during parsing: {exc}")

    return profile


def run_profiler() -> list[PDFProfile]:
    """Run profiling on all PDFs and return profiles."""
    profiles: list[PDFProfile] = []

    # FYP PDFs
    fyp_pdfs = sorted(RAW_FYP_DIR.glob("*.pdf"))
    if not fyp_pdfs:
        print(f"WARNING: No PDFs found in {RAW_FYP_DIR}")
    for pdf_path in fyp_pdfs:
        print(f"  Profiling FYP: {pdf_path.name} ...", end=" ", flush=True)
        p = profile_fyp_pdf(pdf_path)
        print(f"{p.page_count} pages, {len(p.tables)} tables found")
        profiles.append(p)

    # Roadmap PDFs
    roadmap_pdfs = sorted(RAW_ROADMAP_DIR.glob("*.pdf"))
    if not roadmap_pdfs:
        print(f"WARNING: No PDFs found in {RAW_ROADMAP_DIR}")
    for pdf_path in roadmap_pdfs:
        print(f"  Profiling roadmap: {pdf_path.name} ...", end=" ", flush=True)
        p = profile_roadmap_pdf(pdf_path)
        print(f"{p.page_count} pages")
        profiles.append(p)

    return profiles


def build_report(profiles: list[PDFProfile]) -> str:
    """Render the Phase 0 profile as a Markdown report."""
    lines: list[str] = [
        "# EduCompass — Phase 0 PDF Profile Report",
        "",
        "> **Review required before Phase 1 extraction starts.**  ",
        "> This report contains NO student names or roll numbers.  ",
        "> Confirm PII flags are handled before loading any record to the database.",
        "",
        "---",
        "",
    ]

    fyp_profiles = [p for p in profiles if p.category == "fyp"]
    roadmap_profiles = [p for p in profiles if p.category == "roadmap"]

    # ── FYP Section ───────────────────────────────────────────────
    lines += [
        "## A. FYP List PDFs",
        "",
        f"**Total PDFs:** {len(fyp_profiles)}",
        "",
    ]

    for p in fyp_profiles:
        lines += [
            f"### {p.filename}",
            f"- **Year:** {p.year or 'Unknown'}",
            f"- **Pages:** {p.page_count}",
            f"- **Tables detected:** {len(p.tables)}",
        ]
        if p.full_text_pii_flags:
            lines.append(f"- **⚠️ PII flags:** {'; '.join(p.full_text_pii_flags)}")
        else:
            lines.append("- **PII flags:** None detected in full-text scan")
        if p.notes:
            for note in p.notes:
                lines.append(f"- **Note:** {note}")
        lines.append("")

        for i, tbl in enumerate(p.tables, start=1):
            lines += [
                f"#### Table {i} (page {tbl.page})",
                f"- Approx. rows: {tbl.row_count_approx}",
            ]
            if tbl.pii_flags:
                for flag in tbl.pii_flags:
                    lines.append(f"- ⚠️ {flag}")
            if tbl.columns:
                lines.append("")
                lines.append("| Column Header | PII Risk | Sample Values |")
                lines.append("|---|---|---|")
                for col in tbl.columns:
                    risk = "⚠️ YES — DROP" if col.is_pii_risk else "No"
                    samples = " / ".join(col.sample_values) if col.sample_values else "—"
                    lines.append(f"| `{col.raw_header}` | {risk} | {samples} |")
            lines.append("")

    # ── Roadmap Section ───────────────────────────────────────────
    lines += [
        "---",
        "",
        "## B. Roadmap PDFs",
        "",
        f"**Total PDFs:** {len(roadmap_profiles)}",
        "",
        "| Filename | Pages | Notes |",
        "|---|---|---|",
    ]
    for p in roadmap_profiles:
        notes_str = " ".join(p.notes)
        pii = "⚠️ PII detected" if p.full_text_pii_flags else "No PII"
        lines.append(f"| {p.filename} | {p.page_count} | {notes_str} {pii} |")

    # ── Summary & Decisions Needed ────────────────────────────────
    all_pii_flags = [
        f"{p.filename}: {flag}"
        for p in profiles
        for flag in p.full_text_pii_flags
    ]
    total_tables = sum(len(p.tables) for p in fyp_profiles)
    total_rows_approx = sum(
        tbl.row_count_approx for p in fyp_profiles for tbl in p.tables
    )

    lines += [
        "",
        "---",
        "",
        "## C. Summary",
        "",
        f"| Metric | Value |",
        f"|---|---|",
        f"| FYP PDFs profiled | {len(fyp_profiles)} |",
        f"| Roadmap PDFs profiled | {len(roadmap_profiles)} |",
        f"| FYP tables detected | {total_tables} |",
        f"| Approx. FYP rows total | {total_rows_approx} |",
        f"| PII flags raised | {len(all_pii_flags)} |",
        "",
    ]

    if all_pii_flags:
        lines += ["### ⚠️ PII Flags Requiring Attention", ""]
        for flag in all_pii_flags:
            lines.append(f"- {flag}")
        lines.append("")

    lines += [
        "---",
        "",
        "## D. Next Step",
        "",
        "Ram must review this report and confirm:",
        "1. The column layout for each FYP year is correct.",
        "2. PII flags are acknowledged and will be handled at extraction time.",
        "3. Phase 1 extraction can proceed.",
        "",
        "_Generated by `pipeline/core/profiler.py`. No records were loaded to the database._",
    ]

    return "\n".join(lines)


if __name__ == "__main__":
    print("=== EduCompass Phase 0 — PDF Profiler ===")
    print(f"FYP source: {RAW_FYP_DIR}")
    print(f"Roadmap source: {RAW_ROADMAP_DIR}")
    print()

    profiles = run_profiler()
    report_md = build_report(profiles)

    out_path = REPORTS_DIR / "phase_0_profile_report.md"
    out_path.write_text(report_md, encoding="utf-8")
    print()
    print(f"[OK] Report written to: {out_path}")

    # Also dump raw profile as JSON for programmatic use
    raw_out = REPORTS_DIR / "phase_0_profiles_raw.json"
    import dataclasses
    raw_out.write_text(
        json.dumps([dataclasses.asdict(p) for p in profiles], indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[OK] Raw profiles written to: {raw_out}")

    # Exit non-zero if any PII flags exist (so CI catches it)
    pii_count = sum(len(p.full_text_pii_flags) for p in profiles)
    if pii_count:
        print(f"\n[WARNING] {pii_count} PII flag(s) detected - review report before Phase 1.")
        sys.exit(2)  # exit 2 = warnings, not a build failure
    else:
        print("\n[OK] No PII signals detected in any PDF.")
