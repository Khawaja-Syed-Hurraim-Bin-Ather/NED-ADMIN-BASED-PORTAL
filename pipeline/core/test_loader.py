"""
Unit tests for Card F4 Phase 2: FYP Data Loader
Tests data transformation, natural key validation, privacy check integration,
batch preparation, and idempotent conflict handling.
"""

import pytest
from unittest.mock import MagicMock, patch
from pipeline.core.loader import (
    prepare_fyp_payload,
    load_jsonl_records,
    LoaderSummary,
    FypLoader,
)


@pytest.fixture
def sample_valid_record():
    return {
        "schema_version": "fyp.v2",
        "title": "Autonomous Drone Surveillance System",
        "raw_title": "Autonomous Drone Surveillance System\nfor Smart Campus",
        "year": 2024,
        "proposal_outcome": "accepted",
        "outcome_reason": "Default accepted (D9)",
        "outcome_evidence": "",
        "supervisor": "Dr. Muhammad Ali",
        "supervisor_title": "Dr.",
        "co_supervisor": "Engr. Fatima",
        "program": "CSE",
        "department": "Computer & Information Systems Engineering",
        "university": "NED University of Engineering & Technology",
        "team_size": 4,
        "domain_tags": ["robotics-embedded", "ai-ml"],
        "tags_source": "derived",
        "tools": ["ROS", "Python", "OpenCV"],
        "companies_approached": ["TPS Worldwide"],
        "raw_company_text": "TPS",
        "status": "extracted",
        "relevance": "in_scope",
        "relevance_reason": ["Source file is from NED CISE department FYP list"],
        "source_file": "SOP FYDP list-2024.pdf",
        "source_page": 2,
        "raw_text_redacted": "Autonomous Drone Surveillance System Dr. Muhammad Ali",
        "extracted_at": "2026-10-25T13:51:06+00:00",
        "confidence": 0.92,
        "natural_key": "abc123def456789012345678901234567890abcd",
    }


def test_prepare_fyp_payload_valid(sample_valid_record):
    payload = prepare_fyp_payload(sample_valid_record)
    assert payload["natural_key"] == sample_valid_record["natural_key"]
    assert payload["title"] == "Autonomous Drone Surveillance System"
    assert payload["year"] == 2024
    assert payload["review_status"] == "extracted"
    assert payload["proposal_outcome"] == "accepted"
    assert payload["relevance"] == "in_scope"
    assert payload["team_size"] == 4
    assert payload["domain_tags"] == ["robotics-embedded", "ai-ml"]
    assert payload["tools"] == ["ROS", "Python", "OpenCV"]
    # Ensure PII forbidden fields are not in the payload
    assert "student_name" not in payload
    assert "student_names" not in payload
    assert "roll_no" not in payload
    assert "roll_number" not in payload


def test_prepare_fyp_payload_sets_extracted_review_status(sample_valid_record):
    sample_valid_record["status"] = "extracted"
    payload = prepare_fyp_payload(sample_valid_record)
    assert payload["review_status"] == "extracted"


def test_prepare_fyp_payload_missing_natural_key(sample_valid_record):
    del sample_valid_record["natural_key"]
    with pytest.raises(ValueError, match="natural_key"):
        prepare_fyp_payload(sample_valid_record)


def test_prepare_fyp_payload_missing_title(sample_valid_record):
    sample_valid_record["title"] = ""
    with pytest.raises(ValueError, match="title"):
        prepare_fyp_payload(sample_valid_record)


def test_loader_rejects_pii_record(sample_valid_record):
    # If a record somehow contains student_name, loader must refuse
    sample_valid_record["student_name"] = "Alice Student"
    loader = FypLoader(supabase_client=None)
    with pytest.raises(ValueError, match="Privacy validation failed"):
        loader.validate_and_prepare(sample_valid_record)


def test_load_jsonl_records(tmp_path, sample_valid_record):
    import json
    jsonl_file = tmp_path / "test_fyp.jsonl"
    with open(jsonl_file, "w", encoding="utf-8") as f:
        f.write(json.dumps(sample_valid_record) + "\n")

    records = load_jsonl_records(jsonl_file)
    assert len(records) == 1
    assert records[0]["title"] == sample_valid_record["title"]


def test_loader_dry_run(sample_valid_record):
    loader = FypLoader(supabase_client=None)
    summary = loader.load_records([sample_valid_record], dry_run=True)
    assert summary.total_seen == 1
    assert summary.staged == 1
    assert summary.errors == 0
    assert summary.loaded == 0  # Dry run does not commit
