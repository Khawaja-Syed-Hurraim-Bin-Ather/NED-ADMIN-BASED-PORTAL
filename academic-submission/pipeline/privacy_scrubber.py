"""
EduCompass Pipeline — Privacy Scrubber
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Purpose:
  Enforces student privacy (GDPR / FERPA ethics) by detecting and stripping
  student personal identifiers (roll numbers, student names, contact details)
  from raw ingested university records before saving to structured JSON.
"""

import re
from typing import Any, Dict, List, Tuple

# University roll number formats (e.g. CS-24040, SE-21005, CIS-22001)
ROLL_NUMBER_REGEX = re.compile(r'\b[A-Za-z]{2,3}-\d{2,5}\b', re.IGNORECASE)

# Prohibited keys that represent individual personal data
FORBIDDEN_PII_KEYS = {"student_name", "student_id", "roll_no", "roll_number", "students", "team_members", "phone", "email"}


def sanitize_text(text: str) -> str:
    """Replaces detected roll numbers and student identifiers with [REDACTED]."""
    if not isinstance(text, str):
        return text
    return ROLL_NUMBER_REGEX.sub("[REDACTED]", text)


def scrub_record(raw_record: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Sanitizes a single extracted record:
    1. Removes all prohibited personal identity fields.
    2. Redacts roll numbers appearing within strings or notes.
    3. Returns the clean record along with an audit log of redacted items.
    """
    sanitized: Dict[str, Any] = {}
    audit_log: List[str] = []

    for key, value in raw_record.items():
        lower_key = key.lower().strip()
        if lower_key in FORBIDDEN_PII_KEYS:
            audit_log.append(f"Dropped prohibited PII field: '{key}'")
            continue

        if isinstance(value, str):
            if ROLL_NUMBER_REGEX.search(value):
                audit_log.append(f"Redacted roll number pattern in field '{key}'")
                sanitized[key] = sanitize_text(value)
            else:
                sanitized[key] = value.strip()
        elif isinstance(value, list):
            sanitized[key] = [sanitize_text(v) if isinstance(v, str) else v for v in value]
        else:
            sanitized[key] = value

    return sanitized, audit_log


if __name__ == "__main__":
    sample = {
        "title": "IoT Based Smart Campus Navigation (Student CS-22041)",
        "student_name": "Ayesha Khan",
        "roll_number": "CS-22041",
        "supervisor": "Dr. Asad Arfeen",
        "year": 2024
    }
    cleaned, log = scrub_record(sample)
    print("Sanitized Record:", cleaned)
    print("Audit Log:", log)
