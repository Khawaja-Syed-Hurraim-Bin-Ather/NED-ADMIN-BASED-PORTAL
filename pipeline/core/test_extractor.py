"""
Tests for pipeline/core/extractor.py
Playbook ref: Section 2, 6.10

Run with:
    cd <repo root>
    python -m pytest pipeline/core/test_extractor.py -v

Uses fixture data only — no real PDFs opened, no DB calls, no LLM calls.
"""

from __future__ import annotations

import pytest
from pipeline.core.extractor import (
    _tag_domains,
    _tag_tools,
    _normalise_company,
    _extract_companies,
    _classify_relevance,
    _compute_natural_key,
    _clean_title,
    _parse_supervisor,
    _parse_standard_sop_table,
    _parse_fyp_2022_format,
)


# ── Domain tagging ────────────────────────────────────────────────────────────

class TestTagDomains:
    def test_ai_ml_tagged_from_title(self):
        tags = _tag_domains("Deep Learning for Fraud Detection")
        assert "ai-ml" in tags

    def test_nlp_tagged(self):
        tags = _tag_domains("NLP-based Chatbot for Customer Support")
        assert "nlp" in tags

    def test_computer_vision_tagged(self):
        tags = _tag_domains("Object Detection using YOLO for Traffic Analysis")
        assert "computer-vision" in tags

    def test_blockchain_tagged(self):
        tags = _tag_domains("Smart Contract for Decentralized Voting")
        assert "blockchain" in tags

    def test_iot_tagged(self):
        tags = _tag_domains("IoT Based Air Quality Monitoring System")
        assert "iot" in tags

    def test_healthcare_tagged(self):
        tags = _tag_domains("Diabetic Retinopathy Detection using CNN")
        assert "healthcare-tech" in tags

    def test_no_tags_for_unrelated_title(self):
        tags = _tag_domains("Design of a Novel Algorithm")
        assert tags == []

    def test_multiple_tags_possible(self):
        # Both ai-ml and healthcare-tech
        tags = _tag_domains("Deep Learning for Medical Image Diagnosis")
        assert "ai-ml" in tags
        assert "healthcare-tech" in tags

    def test_case_insensitive(self):
        tags = _tag_domains("MACHINE LEARNING BASED SYSTEM")
        assert "ai-ml" in tags


# ── Tool tagging ──────────────────────────────────────────────────────────────

class TestTagTools:
    def test_yolo_tagged(self):
        tools = _tag_tools("Real-Time Object Detection using YOLO")
        assert "YOLO" in tools

    def test_tensorflow_tagged(self):
        tools = _tag_tools("Image Classification using TensorFlow")
        assert "TensorFlow" in tools

    def test_flutter_tagged(self):
        tools = _tag_tools("Mobile App built with Flutter")
        assert "Flutter" in tools

    def test_no_tools_for_generic_title(self):
        tools = _tag_tools("Design of a Web-Based System for Inventory")
        assert tools == []  # 'Web' is not in tools list (it's in domains)

    def test_tool_not_inferred(self):
        # Should NOT tag Python if not literally in the title
        tools = _tag_tools("AI-powered detection system")
        assert "Python" not in tools


# ── Company normalisation ─────────────────────────────────────────────────────

class TestNormaliseCompany:
    def test_known_alias_resolved(self):
        assert _normalise_company("Systems Limited") == "systems-limited"

    def test_unknown_company_slugified(self):
        slug = _normalise_company("Some Unknown Corp")
        assert slug == "some-unknown-corp"

    def test_empty_string_returns_unknown(self):
        slug = _normalise_company("")
        assert slug == "unknown"

    def test_case_insensitive_lookup(self):
        # Aliases table uses lowercase lookup
        result = _normalise_company("systems limited")
        assert result == "systems-limited"


# ── Company extraction ────────────────────────────────────────────────────────

class TestExtractCompanies:
    def test_single_company(self):
        companies, raw = _extract_companies("Telenor Pakistan")
        assert len(companies) == 1
        assert "telenor-pakistan" in companies

    def test_empty_industry(self):
        companies, raw = _extract_companies("-")
        assert companies == []
        assert raw == ""

    def test_multiple_companies_comma_separated(self):
        companies, raw = _extract_companies("HBL, Meezan Bank")
        assert len(companies) == 2

    def test_none_returns_empty(self):
        companies, raw = _extract_companies("")
        assert companies == []


# ── Relevance classification ──────────────────────────────────────────────────

class TestClassifyRelevance:
    def test_cs_project_in_scope(self):
        relevance, reasons = _classify_relevance("Deep Learning Medical System", "Dr. Ali", "SOP FYDP list-2024.pdf")
        assert relevance == "in_scope"

    def test_electrical_out_of_scope(self):
        relevance, reasons = _classify_relevance("Electrical Grid Load Balancing System", "Dr. Khan", "SOP FYDP list-2024.pdf")
        assert relevance == "out_of_scope"
        assert any("electrical" in r.lower() for r in reasons)

    def test_mechanical_out_of_scope(self):
        relevance, reasons = _classify_relevance("Mechanical Vibration Analysis", "Dr. Ahmed", "SOP FYDP list-2024.pdf")
        assert relevance == "out_of_scope"

    def test_generic_cs_project_in_scope(self):
        relevance, reasons = _classify_relevance("Automated Traffic Management using AI", "Dr. Zafar", "SOP FYDP list-2022.pdf")
        assert relevance == "in_scope"


# ── Natural key ───────────────────────────────────────────────────────────────

class TestNaturalKey:
    def test_same_inputs_same_key(self):
        k1 = _compute_natural_key("My Project", 2024, "Dr. Ali")
        k2 = _compute_natural_key("My Project", 2024, "Dr. Ali")
        assert k1 == k2

    def test_different_year_different_key(self):
        k1 = _compute_natural_key("My Project", 2024, "Dr. Ali")
        k2 = _compute_natural_key("My Project", 2023, "Dr. Ali")
        assert k1 != k2

    def test_key_is_40_char_hex(self):
        key = _compute_natural_key("Test", 2024, "Dr. X")
        assert len(key) == 40
        assert all(c in "0123456789abcdef" for c in key)


# ── Title cleaning ────────────────────────────────────────────────────────────

class TestCleanTitle:
    def test_strips_whitespace(self):
        assert _clean_title("  Hello World  ") == "Hello World"

    def test_collapses_internal_spaces(self):
        assert _clean_title("Hello   World") == "Hello World"

    def test_strips_quotes(self):
        assert _clean_title('"Air Writing"') == "Air Writing"

    def test_empty_returns_empty(self):
        assert _clean_title("") == ""

    def test_preserves_special_chars(self):
        title = _clean_title("AI-Based Healthcare & IoT System")
        assert title == "AI-Based Healthcare & IoT System"


# ── Supervisor parsing ────────────────────────────────────────────────────────

class TestParseSupervisor:
    def test_parses_dr_title(self):
        title, name, co = _parse_supervisor("Dr. Syed Zaffar Qasim")
        assert title == "Dr."
        assert name == "Syed Zaffar Qasim"
        assert co == ""

    def test_parses_mr_title(self):
        title, name, co = _parse_supervisor("Mr. Kashif Asrar")
        assert title == "Mr."
        assert name == "Kashif Asrar"

    def test_parses_ms_title(self):
        title, name, co = _parse_supervisor("Ms. Anita Ali")
        assert title == "Ms."
        assert name == "Anita Ali"

    def test_parses_co_supervisor(self):
        title, name, co = _parse_supervisor("Dr. Maria Waqas / Dr. Ali Hassan")
        assert name == "Maria Waqas"
        assert "Ali Hassan" in co

    def test_empty_supervisor(self):
        title, name, co = _parse_supervisor("")
        assert title == ""
        assert name == ""
        assert co == ""


# ── SOP table parser ──────────────────────────────────────────────────────────

class TestParseSopTable:
    def _make_sop_table(self):
        """Fixture: standard SOP table with one data row."""
        return [
            ["S.No.", "Project Title", "Student Name", "Supervisor/Co-Supervisor", "Industry"],
            ["1", "Deep Learning for Fraud Detection", "Ali\nAhmed\nZara", "Dr. Maria Waqas", "Jazz"],
            ["2", "IoT Smart Home Automation", "Bilal\nSaad\nHira", "Ms. Anita Ali", "-"],
        ]

    def test_extracts_titles(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert len(records) == 2
        assert records[0].title == "Deep Learning for Fraud Detection"
        assert records[1].title == "IoT Smart Home Automation"

    def test_does_not_store_student_names(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        rec_dict = records[0].__dict__ if hasattr(records[0], '__dict__') else vars(records[0])
        # Verify no forbidden field exists
        for key in ("team", "students", "student_name", "names"):
            assert key not in rec_dict

    def test_counts_team_size_without_storing_names(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        # 3 names listed -> team_size = 3
        assert records[0].team_size == 3

    def test_domain_tagged_from_title(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert "ai-ml" in records[0].domain_tags

    def test_company_extracted(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        # "Jazz" should be normalised
        assert len(records[0].companies_approached) == 1

    def test_no_company_when_dash(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert records[1].companies_approached == []

    def test_outcome_default_accepted(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert records[0].proposal_outcome == "accepted"

    def test_status_is_extracted(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert records[0].status == "extracted"

    def test_supervisor_parsed(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert records[0].supervisor == "Maria Waqas"
        assert records[0].supervisor_title == "Dr."

    def test_natural_key_is_set(self):
        table = self._make_sop_table()
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert len(records[0].natural_key) == 40

    def test_empty_table_returns_no_records(self):
        records = _parse_standard_sop_table([], 1, "SOP FYDP list-2024.pdf", 2024)
        assert records == []

    def test_table_with_only_header_returns_no_records(self):
        table = [["S.No.", "Project Title", "Student Name", "Supervisor/Co-Supervisor", "Industry"]]
        records = _parse_standard_sop_table(table, 1, "SOP FYDP list-2024.pdf", 2024)
        assert records == []
