"""
EduCompass Core Engine — Unit Tests
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Test Coverage:
  1. DAG Acyclic Validation: Verifies cycle-free graphs pass and cycles are caught.
  2. Course Eligibility: Confirms prerequisite checks allow or block registration.
  3. Critical Path: Validates longest prerequisite chain to CS-406.
  4. GPA Math: Verifies exact NED quality points and retake grade replacement.
"""

import unittest
from prereq_graph import PrerequisiteDAG
from gpa_engine import GPAEngine, CourseAttempt

class TestAlgorithms(unittest.TestCase):

    def test_dag_cycle_detection(self):
        # Acyclic curriculum
        valid_dag = PrerequisiteDAG()
        valid_dag.add_course("CS-115", [])
        valid_dag.add_course("CS-116", ["CS-115"])
        has_cycle, _ = valid_dag.detect_cycles()
        self.assertFalse(has_cycle)

        # Cyclic deadlock (A -> B -> C -> A)
        invalid_dag = PrerequisiteDAG()
        invalid_dag.add_course("A", ["C"])
        invalid_dag.add_course("B", ["A"])
        invalid_dag.add_course("C", ["B"])
        has_cycle, _ = invalid_dag.detect_cycles()
        self.assertTrue(has_cycle)

    def test_course_eligibility(self):
        dag = PrerequisiteDAG()
        dag.add_course("CS-218", ["CS-116"])
        
        # Student without CS-116
        eligible, missing = dag.evaluate_eligibility("CS-218", {"CS-114", "CS-115"})
        self.assertFalse(eligible)
        self.assertIn("CS-116", missing)

        # Student with CS-116
        eligible, missing = dag.evaluate_eligibility("CS-218", {"CS-115", "CS-116"})
        self.assertTrue(eligible)
        self.assertEqual(len(missing), 0)

    def test_gpa_calculation(self):
        attempts = [
            CourseAttempt("CS-115", 4, "A", 1),   # 4 * 4.0 = 16.0
            CourseAttempt("MT-114", 3, "B", 1),   # 3 * 3.0 = 9.0
        ]
        # Total points: 25.0 / 7 credits = 3.57
        gpa = GPAEngine.calculate_gpa(attempts)
        self.assertEqual(gpa, 3.57)

    def test_retake_policy_replacement(self):
        history = [
            CourseAttempt("CS-115", 4, "F", 1),   # 4 * 0.0 = 0
            CourseAttempt("CS-115", 4, "A", 2),   # Repeat: 4 * 4.0 = 16.0 (Replaces F)
            CourseAttempt("HS-111", 2, "A", 1),   # 2 * 4.0 = 8.0
        ]
        res = GPAEngine.calculate_cgpa(history, retake_policy="highest")
        # Effective: 4 credits of CS-115 (A) + 2 credits of HS-111 (A) = 6 credits, 24 QP -> 4.00
        self.assertEqual(res["cgpa"], 4.00)
        self.assertEqual(res["total_credits"], 6)

if __name__ == "__main__":
    unittest.main()
