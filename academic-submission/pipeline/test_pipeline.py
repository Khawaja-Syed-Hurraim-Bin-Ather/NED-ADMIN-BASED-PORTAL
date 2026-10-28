"""
EduCompass Pipeline — Unit Tests
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Test Coverage:
  1. Privacy Scrubber: Ensures student roll numbers and names are completely scrubbed.
  2. Domain Extractor: Ensures keyword classification accurately tags AI/ML, IoT, and Robotics.
"""

import unittest
from privacy_scrubber import scrub_record
from extractor import derive_domains, parse_fyp_entry

class TestPipeline(unittest.TestCase):

    def test_privacy_scrubber_drops_forbidden_keys(self):
        record = {
            "title": "Smart Campus System",
            "student_name": "Ayesha Khan",
            "roll_number": "CS-21045",
            "supervisor": "Dr. Muhammad Ali"
        }
        clean, audit = scrub_record(record)
        self.assertNotIn("student_name", clean)
        self.assertNotIn("roll_number", clean)
        self.assertEqual(clean["title"], "Smart Campus System")
        self.assertEqual(len(audit), 2)

    def test_privacy_scrubber_redacts_embedded_roll_numbers(self):
        record = {
            "title": "Deep Learning Detection by CS-22001 and SE-22002",
            "supervisor": "Dr. Asad Arfeen"
        }
        clean, audit = scrub_record(record)
        self.assertNotIn("CS-22001", clean["title"])
        self.assertIn("[REDACTED]", clean["title"])

    def test_domain_derivation(self):
        ai_tags = derive_domains("Convolutional Neural Networks for Medical Imaging")
        self.assertIn("ai-ml", ai_tags)

        iot_tags = derive_domains("ESP32 Sensor Array for Agricultural Automation")
        self.assertIn("iot-embedded", iot_tags)

    def test_parse_fyp_entry(self):
        entry = parse_fyp_entry("Telepresence Robot for Hospital Wards", "Dr. Urooj Ainuddin", 2023)
        self.assertEqual(entry["year"], 2023)
        self.assertEqual(entry["department"], "Computer & Information Systems Engineering")
        self.assertIn("robotics", entry["domain_tags"])

if __name__ == "__main__":
    unittest.main()
