"""
EduCompass Pipeline — Academic Record Extractor
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Purpose:
  Transforms raw parsed lines into canonical domain objects (FYDP project records,
  course catalogs, and faculty research maps) with automated keyword domain tagging
  and privacy scrubbing.
"""

from typing import Dict, Any, List
from privacy_scrubber import scrub_record

# Domain keyword dictionary for CISE computing tracks
DOMAIN_KEYWORDS = {
    "ai-ml": ["ai", "machine learning", "deep learning", "neural", "computer vision", "nlp", "sentiment", "yolo"],
    "iot-embedded": ["iot", "arduino", "raspberry", "sensor", "smart", "automation", "esp32"],
    "cybersecurity": ["security", "blockchain", "encryption", "cryptography", "firewall", "malware"],
    "web-mobile": ["web", "mobile", "android", "ios", "react", "flutter", "cloud", "portal"],
    "robotics": ["robot", "autonomous", "telepresence", "rover", "arm", "lidar"]
}

def derive_domains(title: str) -> List[str]:
    """Infers computing domain tags from the project title using keyword matching."""
    lower_title = title.lower()
    tags = []
    for domain, keywords in DOMAIN_KEYWORDS.items():
        if any(kw in lower_title for kw in keywords):
            tags.append(domain)
    return tags if tags else ["general-computing"]

def parse_fyp_entry(raw_title: str, supervisor_name: str, year: int) -> Dict[str, Any]:
    """Constructs a clean, privacy-scrubbed FYDP project record."""
    raw = {
        "title": raw_title.strip(),
        "supervisor": supervisor_name.strip(),
        "year": year,
        "department": "Computer & Information Systems Engineering",
        "university": "NED University of Engineering & Technology",
        "domain_tags": derive_domains(raw_title),
        "proposal_outcome": "accepted"
    }
    clean_record, _ = scrub_record(raw)
    return clean_record

if __name__ == "__main__":
    sample = parse_fyp_entry("Autonomous Lidar Drone for Search & Rescue", "Dr. Asad Arfeen", 2024)
    print("Parsed FYP Record:", sample)
