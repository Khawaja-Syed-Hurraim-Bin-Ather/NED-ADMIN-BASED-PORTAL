"""
Tests for the privacy validator.
Playbook ref: Section 2 ("A test proves the rejection works.")

Run with:  python -m pytest pipeline/core/test_privacy_validator.py -v
"""

import pytest
from pipeline.core.privacy_validator import validate_record, validate_batch, FYP_V2_ALLOWED_FIELDS

# ── Fixtures ───────────────────────────────────────────────────────────────────

VALID_RECORD = {
    "schema_version": "fyp.v2",
    "title": "Smart Traffic Management Using Deep Learning",
    "year": 2024,
    "proposal_outcome": "accepted",
    "outcome_evidence": "heading",
    "companies_approached": ["Careem", "Uber Pakistan"],
    "raw_company_text": "Careem; Uber Pakistan",
    "supervisor": "Dr. Aisha Siddiqui",
    "supervisor_title": "Dr.",
    "program": "CSE",
    "department": "Computer & Information Systems Engineering",
    "university": "NED University of Engineering & Technology",
    "team_size": 3,
    "domain_tags": ["ai-ml", "computer-vision"],
    "tags_source": "derived",
    "tools": ["Python", "YOLO"],
    "status": "completed",
    "relevance": "in_scope",
    "relevance_reason": ["department:cse", "domain:ai-ml"],
    "source_file": "SOP FYDP list-2024.pdf",
    "source_page": 4,
    "raw_text_redacted": "[REDACTED] | [REDACTED] | Smart Traffic Management Using Deep Learning | Dr. Aisha Siddiqui",
    "extracted_at": "2026-10-25T12:00:00Z",
    "confidence": 0.92,
}

# ── Test: valid record passes ──────────────────────────────────────────────────

def test_valid_record_passes():
    ok, errors = validate_record(VALID_RECORD)
    assert ok, f"Expected valid record to pass. Errors: {errors}"
    assert errors == []

# ── Test: forbidden fields are rejected ───────────────────────────────────────

@pytest.mark.parametrize("bad_field", ["team", "students", "student_name", "members", "names"])
def test_forbidden_field_rejected(bad_field):
    record = dict(VALID_RECORD, **{bad_field: "some_value"})
    ok, errors = validate_record(record)
    assert not ok
    assert any("FORBIDDEN_FIELD" in e for e in errors), f"Expected FORBIDDEN_FIELD error. Got: {errors}"

# ── Test: unknown fields are rejected ─────────────────────────────────────────

def test_unknown_field_rejected():
    record = dict(VALID_RECORD, student_id="CS-24040")
    ok, errors = validate_record(record)
    assert not ok
    assert any("UNKNOWN_FIELDS" in e for e in errors), f"Expected UNKNOWN_FIELDS error. Got: {errors}"

# ── Test: roll-number pattern in title is rejected ────────────────────────────

@pytest.mark.parametrize("roll_value", [
    "CS-24040",
    "SE-21-005",
    "CIS-22001",
    "BS-2023",
])
def test_roll_number_in_title_rejected(roll_value):
    record = dict(VALID_RECORD, title=f"Project by {roll_value}")
    ok, errors = validate_record(record)
    assert not ok
    assert any("ROLL_NUMBER_DETECTED" in e for e in errors), f"Expected ROLL_NUMBER_DETECTED. Got: {errors}"

# ── Test: roll-number in raw_text_redacted is rejected ────────────────────────

def test_roll_number_in_raw_text_rejected():
    record = dict(VALID_RECORD, raw_text_redacted="CS-21040 | Smart Traffic | Dr. Ahmed")
    ok, errors = validate_record(record)
    assert not ok
    assert any("ROLL_NUMBER_DETECTED" in e for e in errors)

# ── Test: roll-number in companies_approached is rejected ─────────────────────

def test_roll_number_in_list_field_rejected():
    record = dict(VALID_RECORD, companies_approached=["Careem", "CS-24040-Company"])
    ok, errors = validate_record(record)
    assert not ok
    assert any("ROLL_NUMBER_DETECTED" in e for e in errors)

# ── Test: batch validation counts correctly ───────────────────────────────────

def test_batch_validation():
    bad_record = dict(VALID_RECORD, team="Group A")
    records = [VALID_RECORD, VALID_RECORD, bad_record]
    passed, failed, failures = validate_batch(records)
    assert passed == 2
    assert failed == 1
    assert len(failures) == 1
    assert failures[0]["index"] == 2

# ── Test: team_size=3 (number, not names) passes ─────────────────────────────

def test_team_size_number_passes():
    record = dict(VALID_RECORD, team_size=4)
    ok, errors = validate_record(record)
    assert ok, f"Expected team_size=4 to pass. Errors: {errors}"

# ── Test: allowed fields are all present in the validator's allowlist ─────────

def test_valid_record_keys_are_all_allowed():
    for key in VALID_RECORD:
        assert key in FYP_V2_ALLOWED_FIELDS, f"Key '{key}' is in the test fixture but not in FYP_V2_ALLOWED_FIELDS"
