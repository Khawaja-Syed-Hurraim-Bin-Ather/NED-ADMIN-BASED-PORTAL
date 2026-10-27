"""
Tests for pipeline/core/profiler.py
Playbook ref: Section 2 ("A test proves the rejection works.")

Run with:
    cd <repo root>
    python -m pytest pipeline/core/test_profiler.py -v

Uses only in-memory fixture data — no real PDFs are opened in tests.
Never calls a live LLM or external API.
"""

from __future__ import annotations

import pytest
from pipeline.core.profiler import (
    ROLL_NUMBER_RE,
    _is_pii_column,
    _redact_pii,
    _scan_for_pii,
    ColumnProfile,
    TableProfile,
    PDFProfile,
    build_report,
)


# ── Roll-number pattern detection ────────────────────────────────────────────

class TestRollNumberPattern:
    def test_detects_standard_roll_number(self):
        assert ROLL_NUMBER_RE.search("CS-24040")

    def test_detects_se_roll_number(self):
        assert ROLL_NUMBER_RE.search("SE-21035")

    def test_detects_cis_roll_number(self):
        assert ROLL_NUMBER_RE.search("CIS-19002")

    def test_does_not_match_plain_numbers(self):
        assert not ROLL_NUMBER_RE.search("12345")

    def test_does_not_match_lowercase(self):
        # Roll numbers should be uppercase
        assert not ROLL_NUMBER_RE.search("cs-24040")

    def test_does_not_match_text_without_hyphen(self):
        assert not ROLL_NUMBER_RE.search("CS24040")

    def test_multiple_roll_numbers_in_text(self):
        text = "Students: CS-24040, SE-21055 submitted the project."
        matches = ROLL_NUMBER_RE.findall(text)
        assert len(matches) == 2


# ── PII column detection ───────────────────────────────────────────────────────

class TestIsPiiColumn:
    def test_detects_student_column(self):
        assert _is_pii_column("Student")
        assert _is_pii_column("STUDENT")
        assert _is_pii_column("students")

    def test_detects_team_column(self):
        assert _is_pii_column("Team")
        assert _is_pii_column("Team Members")

    def test_detects_roll_column(self):
        assert _is_pii_column("Roll No")
        assert _is_pii_column("Roll Number")
        assert _is_pii_column("roll")

    def test_detects_name_column(self):
        assert _is_pii_column("Name")
        assert _is_pii_column("Names")

    def test_detects_submitted_by(self):
        assert _is_pii_column("Submitted By")
        assert _is_pii_column("Prepared By")

    def test_safe_columns_pass(self):
        assert not _is_pii_column("Title")
        assert not _is_pii_column("Supervisor")
        assert not _is_pii_column("Year")
        assert not _is_pii_column("Domain")
        assert not _is_pii_column("Tags")
        assert not _is_pii_column("Abstract")
        assert not _is_pii_column("Status")
        assert not _is_pii_column("Company")
        assert not _is_pii_column("Department")


# ── PII redaction ─────────────────────────────────────────────────────────────

class TestRedactPii:
    def test_redacts_roll_number(self):
        result = _redact_pii("CS-24040 submitted the project.")
        assert "CS-24040" not in result
        assert "[ROLL_REDACTED]" in result

    def test_leaves_safe_text_unchanged(self):
        text = "Deep Learning for Medical Imaging"
        assert _redact_pii(text) == text

    def test_redacts_multiple_roll_numbers(self):
        text = "Team: CS-24040, SE-21055"
        result = _redact_pii(text)
        assert "CS-24040" not in result
        assert "SE-21055" not in result
        assert result.count("[ROLL_REDACTED]") == 2


# ── Full-text PII scan ────────────────────────────────────────────────────────

class TestScanForPii:
    def test_flags_roll_number_in_text(self):
        flags = _scan_for_pii("The group CS-24040 won the award.", "test.pdf")
        assert len(flags) == 1
        assert "Roll-number pattern" in flags[0]

    def test_no_flags_for_clean_text(self):
        clean = "Machine Learning-based Fraud Detection System. Supervised by Dr. Ali."
        flags = _scan_for_pii(clean, "test.pdf")
        assert flags == []


# ── build_report smoke test ────────────────────────────────────────────────────

class TestBuildReport:
    def _make_profile(self, filename: str, category: str, year=None) -> PDFProfile:
        return PDFProfile(
            filename=filename,
            category=category,
            year=year,
            page_count=5,
            tables=[
                TableProfile(
                    page=1,
                    row_count_approx=10,
                    columns=[
                        ColumnProfile(raw_header="Title", is_pii_risk=False, sample_values=["AI-based system"]),
                        ColumnProfile(raw_header="Student", is_pii_risk=True, sample_values=[]),
                        ColumnProfile(raw_header="Supervisor", is_pii_risk=False, sample_values=["Dr. Ahmed"]),
                    ],
                    pii_flags=["PII columns detected (will be dropped): ['Student']"],
                )
            ],
            full_text_pii_flags=["Roll-number pattern detected (2 matches, e.g. CS-24040)."],
            notes=[],
        )

    def test_report_contains_filename(self):
        profiles = [self._make_profile("FYP 2024.pdf", "fyp", year=2024)]
        report = build_report(profiles)
        assert "FYP 2024.pdf" in report

    def test_report_marks_pii_columns(self):
        profiles = [self._make_profile("FYP 2024.pdf", "fyp", year=2024)]
        report = build_report(profiles)
        assert "DROP" in report

    def test_report_contains_summary_table(self):
        profiles = [self._make_profile("FYP 2023.pdf", "fyp", year=2023)]
        report = build_report(profiles)
        assert "## C. Summary" in report

    def test_report_flags_pii_in_summary(self):
        profiles = [self._make_profile("FYP 2022.pdf", "fyp", year=2022)]
        report = build_report(profiles)
        assert "PII Flags Requiring Attention" in report

    def test_report_with_clean_roadmap(self):
        p = PDFProfile(
            filename="backend.pdf", category="roadmap", year=None,
            page_count=12, tables=[], full_text_pii_flags=[],
            notes=["Extracted ~200 text lines; ~80 candidate topic-node labels", "No PII signals detected."],
        )
        report = build_report([p])
        assert "backend.pdf" in report
        assert "No PII" in report
