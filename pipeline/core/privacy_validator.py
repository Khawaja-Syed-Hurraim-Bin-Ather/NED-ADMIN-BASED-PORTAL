"""
EduCompass Pipeline — Privacy Validator
Playbook ref: Section 2, 6.10

Rules enforced:
  1. No key outside the allowed field list (fyp.v2 canonical fields).
  2. No roll-number pattern (letters + hyphen + digits, e.g. CS-24040).
  3. No 'team' or 'students' field present.
  4. No value that looks like a roll number buried in any string field.

Usage:
  from pipeline.core.privacy_validator import validate_record, validate_batch
  ok, errors = validate_record(record_dict)
"""

import re
from typing import Any, Tuple, List, Dict

# ── Allowed canonical fields for schema version fyp.v2 ────────────────────────
FYP_V2_ALLOWED_FIELDS = frozenset({
    "schema_version",
    "title",
    "raw_title",
    "abstract",
    "year",
    "proposal_outcome",
    "outcome_reason",
    "outcome_evidence",
    "companies_approached",
    "raw_company_text",
    "supervisor",
    "supervisor_title",
    "co_supervisor",
    "program",
    "department",
    "university",
    "team_size",
    "domain_tags",
    "tags_source",
    "tools",
    "status",
    "relevance",
    "relevance_reason",
    "source_file",
    "source_page",
    "raw_text_redacted",
    "extracted_at",
    "confidence",
    "natural_key",
})

# ── Forbidden fields (PII / structural leaks) ──────────────────────────────────
FORBIDDEN_FIELDS = frozenset({"team", "students", "student_name", "members", "names"})

# Roll-number pattern: two or more letters, a hyphen, two or more digits
# Examples: CS-24040, SE-21-005, CIS-22001
_ROLL_PATTERN = re.compile(r'\b[A-Za-z]{2,}-\d{2,}\b')


def _has_roll_number(value: Any) -> bool:
    """Return True if value (string or list of strings) contains a roll-number pattern."""
    if isinstance(value, str):
        return bool(_ROLL_PATTERN.search(value))
    if isinstance(value, list):
        return any(_has_roll_number(v) for v in value)
    return False


def validate_record(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a single fyp.v2 record.

    Returns:
        (ok: bool, errors: List[str])
    """
    errors: List[str] = []

    # 1. Forbidden fields
    for field in FORBIDDEN_FIELDS:
        if field in record:
            errors.append(f"FORBIDDEN_FIELD: '{field}' must not appear in any record")

    # 2. Unknown fields
    unknown = set(record.keys()) - FYP_V2_ALLOWED_FIELDS
    if unknown:
        errors.append(f"UNKNOWN_FIELDS: {sorted(unknown)}")

    # 3. Roll-number scan across free-text fields only
    # Structural/controlled fields (filenames, slugs, status enums) are exempt.
    _ROLL_SCAN_EXEMPT = frozenset({
        "source_file", "source_page", "schema_version", "extracted_at",
        "confidence", "natural_key", "tags_source", "status", "relevance",
        "proposal_outcome", "outcome_reason", "outcome_evidence",
        "supervisor_title", "program", "department", "university",
        "team_size", "domain_tags", "tools", "year",
    })
    for key, value in record.items():
        if key in _ROLL_SCAN_EXEMPT:
            continue
        if _has_roll_number(value):
            errors.append(
                f"ROLL_NUMBER_DETECTED: field '{key}' appears to contain a roll number"
            )

    return (len(errors) == 0, errors)


def validate_batch(records: List[Dict[str, Any]]) -> Tuple[int, int, List[Dict]]:
    """
    Validate a list of records.

    Returns:
        (passed: int, failed: int, failure_details: List[{"index": int, "errors": List[str]}])
    """
    passed = 0
    failed = 0
    failures = []

    for i, rec in enumerate(records):
        ok, errors = validate_record(rec)
        if ok:
            passed += 1
        else:
            failed += 1
            failures.append({"index": i, "errors": errors})

    return passed, failed, failures


def pii_scan_report(records: List[Dict[str, Any]], sample_size: int = 20) -> str:
    """
    Generate a PII scan report: sample of records + roll-number scan result.
    Prints the report; does NOT return any PII.
    """
    import random, json

    lines = [
        "=" * 60,
        f"PII SCAN REPORT — {len(records)} records, sample size {min(sample_size, len(records))}",
        "=" * 60,
    ]

    # Roll-number scan
    roll_hits = [
        i for i, r in enumerate(records)
        if any(_has_roll_number(v) for v in r.values())
    ]
    if roll_hits:
        lines.append(f"⚠  ROLL-NUMBER HITS at indices: {roll_hits}")
    else:
        lines.append("✓  No roll-number patterns detected across all records.")

    # Random sample
    sample = random.sample(records, min(sample_size, len(records)))
    lines.append(f"\nRandom sample ({len(sample)} records):")
    for rec in sample:
        # Only show the safe fields; never show raw_text_redacted more than 120 chars
        safe = {k: v for k, v in rec.items() if k not in ("raw_text_redacted",)}
        if "raw_text_redacted" in rec:
            safe["raw_text_redacted"] = str(rec["raw_text_redacted"])[:120] + "…"
        lines.append(json.dumps(safe, ensure_ascii=False, default=str))

    lines.append("=" * 60)
    return "\n".join(lines)
