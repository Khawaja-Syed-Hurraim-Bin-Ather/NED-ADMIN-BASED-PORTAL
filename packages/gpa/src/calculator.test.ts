import { describe, it, expect } from 'vitest';
import {
  gradeToPoints,
  calculateSemesterGPA,
  calculateCGPA,
  getAcademicStanding,
  calculateWhatIfTarget,
  CourseGradeInput,
} from './index';

describe('GPA Calculator Engine (Card E4)', () => {
  describe('gradeToPoints', () => {
    it('correctly maps standard NED letter grades to point values', () => {
      expect(gradeToPoints('A')).toBe(4.0);
      expect(gradeToPoints('A-')).toBe(3.7);
      expect(gradeToPoints('B+')).toBe(3.4);
      expect(gradeToPoints('B')).toBe(3.0);
      expect(gradeToPoints('B-')).toBe(2.7);
      expect(gradeToPoints('C+')).toBe(2.4);
      expect(gradeToPoints('C')).toBe(2.0);
      expect(gradeToPoints('C-')).toBe(1.7);
      expect(gradeToPoints('D+')).toBe(1.4);
      expect(gradeToPoints('D')).toBe(1.0);
      expect(gradeToPoints('F')).toBe(0.0);
    });

    it('handles lowercase grade strings and whitespace trimming', () => {
      expect(gradeToPoints('a')).toBe(4.0);
      expect(gradeToPoints(' b+ ')).toBe(3.4);
      expect(gradeToPoints('f')).toBe(0.0);
    });

    it('returns null for non-credit or withdrawal grades', () => {
      expect(gradeToPoints('W')).toBeNull();
      expect(gradeToPoints('I')).toBeNull();
      expect(gradeToPoints('P')).toBeNull();
      expect(gradeToPoints('INVALID')).toBeNull();
    });
  });

  describe('calculateSemesterGPA', () => {
    it('calculates semester GPA accurately with credit hour weighting', () => {
      const courses: CourseGradeInput[] = [
        { courseCode: 'CS-101', credits: 3, grade: 'A' },    // 3 * 4.0 = 12.0
        { courseCode: 'CS-102', credits: 3, grade: 'B' },    // 3 * 3.0 = 9.0
        { courseCode: 'MT-101', credits: 4, grade: 'A-' },   // 4 * 3.7 = 14.8
      ];
      // Total QP = 35.8 / 10 = 3.58
      const result = calculateSemesterGPA(courses);
      expect(result.gpa).toBe(3.58);
      expect(result.earnedCredits).toBe(10);
      expect(result.totalQualityPoints).toBe(35.8);
    });

    it('counts failed courses in credits attempted but adds 0 quality points', () => {
      const courses: CourseGradeInput[] = [
        { courseCode: 'CS-201', credits: 3, grade: 'A' }, // 12 QP
        { courseCode: 'CS-202', credits: 3, grade: 'F' }, // 0 QP
      ];
      // Total QP = 12.0 / 6 = 2.00, Earned credits = 3
      const result = calculateSemesterGPA(courses);
      expect(result.gpa).toBe(2.0);
      expect(result.attemptedCredits).toBe(6);
      expect(result.earnedCredits).toBe(3);
    });

    it('ignores withdrawn (W) courses from both GPA and attempted credits', () => {
      const courses: CourseGradeInput[] = [
        { courseCode: 'CS-101', credits: 3, grade: 'A' },
        { courseCode: 'CS-105', credits: 3, grade: 'W' },
      ];
      const result = calculateSemesterGPA(courses);
      expect(result.gpa).toBe(4.0);
      expect(result.attemptedCredits).toBe(3);
      expect(result.earnedCredits).toBe(3);
    });

    it('returns 0 GPA and 0 credits for empty course list', () => {
      const result = calculateSemesterGPA([]);
      expect(result.gpa).toBe(0.0);
      expect(result.attemptedCredits).toBe(0);
      expect(result.earnedCredits).toBe(0);
    });
  });

  describe('calculateCGPA', () => {
    it('computes cumulative GPA across multiple semesters', () => {
      const semesters = [
        {
          semesterNumber: 1,
          courses: [
            { courseCode: 'CS-101', credits: 3, grade: 'A' }, // 12
            { courseCode: 'MT-101', credits: 3, grade: 'A' }, // 12
          ],
        },
        {
          semesterNumber: 2,
          courses: [
            { courseCode: 'CS-102', credits: 3, grade: 'B' }, // 9
            { courseCode: 'MT-102', credits: 3, grade: 'B' }, // 9
          ],
        },
      ];
      // Total QP = 24 + 18 = 42 / 12 = 3.50
      const result = calculateCGPA(semesters);
      expect(result.cgpa).toBe(3.5);
      expect(result.totalCredits).toBe(12);
    });

    it('correctly replaces older failed grade when course is retaken', () => {
      const semesters = [
        {
          semesterNumber: 1,
          courses: [
            { courseCode: 'CS-101', credits: 3, grade: 'F' }, // Fails in sem 1
            { courseCode: 'EE-101', credits: 3, grade: 'A' }, // 12 QP
          ],
        },
        {
          semesterNumber: 2,
          courses: [
            { courseCode: 'CS-101', credits: 3, grade: 'A' }, // Retakes in sem 2 and gets A (12 QP)
            { courseCode: 'EE-102', credits: 3, grade: 'A' }, // 12 QP
          ],
        },
      ];
      // When retaken: CS-101 is counted once at Grade A (12 QP, 3 credits).
      // Total courses counted: CS-101 (3cr, A), EE-101 (3cr, A), EE-102 (3cr, A) = 9 credits, 36 QP -> CGPA = 4.0
      const result = calculateCGPA(semesters, { retakePolicy: 'highest' });
      expect(result.cgpa).toBe(4.0);
      expect(result.totalCredits).toBe(9);
    });
  });

  describe('getAcademicStanding', () => {
    it('returns Deans Honor List for CGPA >= 3.70', () => {
      const standing = getAcademicStanding(3.85);
      expect(standing.status).toBe('deans_honor_list');
      expect(standing.label).toBe("Dean's Honor List");
      expect(standing.isOnProbation).toBe(false);
    });

    it('returns Good Standing for 2.0 <= CGPA < 3.70', () => {
      const standing = getAcademicStanding(2.85);
      expect(standing.status).toBe('good_standing');
      expect(standing.label).toBe('Good Standing');
      expect(standing.isOnProbation).toBe(false);
    });

    it('returns Academic Probation for CGPA < 2.00', () => {
      const standing = getAcademicStanding(1.82);
      expect(standing.status).toBe('academic_probation');
      expect(standing.label).toBe('Academic Probation');
      expect(standing.isOnProbation).toBe(true);
    });
  });

  describe('calculateWhatIfTarget', () => {
    it('computes feasible required future GPA to reach target CGPA', () => {
      // Completed 60 credits with CGPA 3.00 (180 QP)
      // Remaining 60 credits. Target CGPA: 3.50. Total 120 credits = 420 QP.
      // Need 420 - 180 = 240 QP over 60 credits -> Required GPA = 4.00
      const result = calculateWhatIfTarget({
        currentCGPA: 3.0,
        completedCredits: 60,
        targetCGPA: 3.5,
        remainingCredits: 60,
      });

      expect(result.isFeasible).toBe(true);
      expect(result.requiredGPA).toBe(4.0);
      expect(result.maxPossibleCGPA).toBe(3.5);
    });

    it('flags target as unfeasible when mathematically impossible (> 4.0 required)', () => {
      // Completed 90 credits with CGPA 2.0 (180 QP)
      // Remaining 30 credits. Target CGPA: 3.5. Total 120 credits = 420 QP.
      // Need 420 - 180 = 240 QP over 30 credits -> Requires 8.0 GPA!
      const result = calculateWhatIfTarget({
        currentCGPA: 2.0,
        completedCredits: 90,
        targetCGPA: 3.5,
        remainingCredits: 30,
      });

      expect(result.isFeasible).toBe(false);
      expect(result.requiredGPA).toBeGreaterThan(4.0);
      // Max possible if 4.0 in remaining: (180 + 120) / 120 = 2.50
      expect(result.maxPossibleCGPA).toBe(2.5);
    });

    it('handles target that is already exceeded (required GPA <= 0)', () => {
      const result = calculateWhatIfTarget({
        currentCGPA: 3.8,
        completedCredits: 90,
        targetCGPA: 2.5,
        remainingCredits: 30,
      });

      expect(result.isFeasible).toBe(true);
      expect(result.requiredGPA).toBe(0.0);
    });
  });
});
