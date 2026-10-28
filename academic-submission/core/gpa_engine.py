"""
EduCompass Core Engine — NED CISE GPA & CGPA Engine
Course: CS-326 Software Engineering (Complex Engineering Problem)
NED University of Engineering & Technology, Dept. of CISE

Official Academic Rules:
  - NED 4.0 Grading Scale:
      A+ / A = 4.00, A- = 3.70, B+ = 3.40, B = 3.00, B- = 2.70,
      C+ = 2.40, C = 2.00, C- = 1.70, D+ = 1.40, D = 1.00, F = 0.00
  - Semester GPA = Sum(Credit Hours * Grade Points) / Total Semester Credit Hours
  - Cumulative CGPA = Sum(All Earned Quality Points) / Total Completed Credit Hours
  - Course Retake Policy: When a failed or low-grade course is repeated,
    the improved attempt replaces the previous grade in CGPA calculation.
"""

from typing import List, Dict, Any, Optional

# NED University Official Grade Points Mapping
NED_GRADE_POINTS: Dict[str, float] = {
    "A+": 4.00,
    "A":  4.00,
    "A-": 3.70,
    "B+": 3.40,
    "B":  3.00,
    "B-": 2.70,
    "C+": 2.40,
    "C":  2.00,
    "C-": 1.70,
    "D+": 1.40,
    "D":  1.00,
    "F":  0.00,
}

class CourseAttempt:
    def __init__(self, course_code: str, credits: int, grade: str, semester: int):
        self.course_code = course_code.upper()
        self.credits = credits
        self.grade = grade.upper()
        self.semester = semester
        self.points = NED_GRADE_POINTS.get(self.grade, 0.0)
        self.quality_points = round(self.credits * self.points, 2)

class GPAEngine:
    @staticmethod
    def calculate_gpa(courses: List[CourseAttempt]) -> float:
        """Calculates Semester GPA for a given list of course attempts."""
        if not courses:
            return 0.00
        total_credits = sum(c.credits for c in courses)
        if total_credits == 0:
            return 0.00
        total_quality_points = sum(c.quality_points for c in courses)
        return round(total_quality_points / total_credits, 2)

    @staticmethod
    def calculate_cgpa(history: List[CourseAttempt], retake_policy: str = "highest") -> Dict[str, Any]:
        """
        Calculates Cumulative CGPA applying NED retake replacement:
        If a course code appears multiple times, applies 'highest' or 'latest' grade.
        """
        if not history:
            return {"cgpa": 0.00, "total_credits": 0, "effective_courses": []}

        # Group attempts by course code
        grouped: Dict[str, List[CourseAttempt]] = {}
        for attempt in history:
            grouped.setdefault(attempt.course_code, []).append(attempt)

        effective_courses: List[CourseAttempt] = []
        for code, attempts in grouped.items():
            if retake_policy == "highest":
                # Select attempt with maximum grade points
                best = max(attempts, key=lambda a: a.points)
                effective_courses.append(best)
            else: # latest
                latest = max(attempts, key=lambda a: a.semester)
                effective_courses.append(latest)

        total_credits = sum(c.credits for c in effective_courses)
        total_qp = sum(c.quality_points for c in effective_courses)
        cgpa = round(total_qp / total_credits, 2) if total_credits > 0 else 0.00

        # Standing estimation per NED criteria
        standing = "Good Standing"
        if cgpa >= 3.50:
            standing = "Dean's Honor List"
        elif cgpa < 2.00:
            standing = "Academic Probation Warning"

        return {
            "cgpa": cgpa,
            "total_credits": total_credits,
            "standing": standing,
            "course_count": len(effective_courses)
        }


if __name__ == "__main__":
    # Example student transcript
    term1 = [
        CourseAttempt("CS-114", 4, "A", 1),
        CourseAttempt("CS-115", 4, "B+", 1),
        CourseAttempt("MT-114", 3, "F", 1),   # Failed calculus
        CourseAttempt("HS-111", 2, "A-", 1),
    ]
    sem1_gpa = GPAEngine.calculate_gpa(term1)
    print("Semester 1 GPA (with F):", sem1_gpa)

    # Student retakes calculus in Semester 2 and secures a B
    term2 = term1 + [
        CourseAttempt("MT-114", 3, "B", 2),   # Retake calculus -> replaces F
        CourseAttempt("CS-116", 4, "A", 2),
    ]
    cgpa_result = GPAEngine.calculate_cgpa(term2, retake_policy="highest")
    print("Cumulative CGPA after retake replacement:", cgpa_result["cgpa"])
    print("Academic Standing:", cgpa_result["standing"])
