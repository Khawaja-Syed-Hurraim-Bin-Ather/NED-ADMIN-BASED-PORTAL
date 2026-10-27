import { describe, it, expect } from 'vitest';
import {
  PrereqGraph,
  CourseNode,
  PrereqRule,
  StudentSchedulePlan,
  validateSemesterPlan,
  generateDefaultSchedulePlan,
} from './index';

// ─── Test Fixture Graph ───────────────────────────────────────────────────────

function createSampleCurriculum(): PrereqGraph {
  const courses = new Map<string, CourseNode>([
    ['CS-115', { code: 'CS-115', title: 'Computer Programming', credits: 4, semester: 1, category: 'core_computing' }],
    ['CS-116', { code: 'CS-116', title: 'Object Oriented Programming', credits: 4, semester: 2, category: 'core_computing' }],
    ['CS-218', { code: 'CS-218', title: 'Data Structures & Algorithms', credits: 4, semester: 3, category: 'core_computing' }],
    ['CS-220', { code: 'CS-220', title: 'Digital Logic Design', credits: 4, semester: 3, category: 'core_computing' }],
    ['CS-221', { code: 'CS-221', title: 'Computer Organization & Design', credits: 4, semester: 4, category: 'core_computing' }],
    ['CS-222', { code: 'CS-222', title: 'Database Management Systems', credits: 4, semester: 4, category: 'core_computing' }],
    ['CS-323', { code: 'CS-323', title: 'Artificial Intelligence', credits: 4, semester: 5, category: 'core_computing' }],
    ['CS-406', { code: 'CS-406', title: 'Final Year Project', credits: 6, semester: 7, category: 'fyp' }],
    ['HS-101', { code: 'HS-101', title: 'English Composition', credits: 3, semester: 1, category: 'humanities' }],
    ['MT-101', { code: 'MT-101', title: 'Calculus', credits: 3, semester: 1, category: 'mathematics' }],
    ['MT-201', { code: 'MT-201', title: 'Linear Algebra', credits: 3, semester: 2, category: 'mathematics' }],
    ['HS-102', { code: 'HS-102', title: 'Pakistan Studies', credits: 2, semester: 2, category: 'humanities' }],
  ]);

  const rules = new Map<string, PrereqRule>([
    ['CS-116', { type: 'course', courseCode: 'CS-115', minGrade: 'D' }],
    ['CS-218', { type: 'course', courseCode: 'CS-116', minGrade: 'D' }],
    ['CS-221', { type: 'course', courseCode: 'CS-220', minGrade: 'D' }],
    ['CS-222', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    ['CS-323', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    [
      'CS-406',
      {
        type: 'and',
        children: [
          { type: 'course', courseCode: 'CS-218', minGrade: 'D' },
          { type: 'course', courseCode: 'CS-222', minGrade: 'D' },
        ],
      },
    ],
  ]);

  return { courses, rules };
}

describe('Planner Engine (Card M3, Rule #7, #8)', () => {
  const graph = createSampleCurriculum();

  it('validates a valid chronological sequence without violations', () => {
    const validPlan: StudentSchedulePlan = {
      slots: [
        { semesterNumber: 1, courseCodes: ['CS-115', 'HS-101', 'MT-101'] }, // 4+3+3 = 10 (light)
        { semesterNumber: 2, courseCodes: ['CS-116', 'MT-201', 'HS-102'] }, // 4+3+2 = 9 (light)
        { semesterNumber: 3, courseCodes: ['CS-218', 'CS-220'] },            // 4+4 = 8
        { semesterNumber: 4, courseCodes: ['CS-221', 'CS-222'] },            // 4+4 = 8
        { semesterNumber: 5, courseCodes: ['CS-323'] },                     // 4
        { semesterNumber: 6, courseCodes: [] },
        { semesterNumber: 7, courseCodes: ['CS-406'] },                     // 6
        { semesterNumber: 8, courseCodes: [] },
      ],
    };

    const res = validateSemesterPlan(validPlan, graph);
    expect(res.isValid).toBe(true);
    expect(res.allViolations).toHaveLength(0);
    expect(res.totalCredits).toBe(45);
    expect(res.semesters[0].totalCredits).toBe(10);
    expect(res.semesters[0].workload).toBe('light');
  });

  it('detects prerequisite violations when a course is scheduled before its prerequisite', () => {
    const futurePlan: StudentSchedulePlan = {
      slots: [
        // CS-218 is in Semester 1, but its prerequisite CS-116 is planned in Semester 3!
        { semesterNumber: 1, courseCodes: ['CS-218', 'HS-101'] },
        { semesterNumber: 2, courseCodes: ['CS-115'] },
        { semesterNumber: 3, courseCodes: ['CS-116'] },
      ],
    };

    const res = validateSemesterPlan(futurePlan, graph);
    expect(res.isValid).toBe(false);
    const violation = res.allViolations.find((v) => v.courseCode === 'CS-218');
    expect(violation).toBeDefined();
    expect(violation?.type).toBe('prerequisite_future_semester');
    expect(violation?.requiredCourseCode).toBe('CS-116');
  });

  it('detects completely unmet prerequisite when prerequisite is never scheduled', () => {
    const unmetPlan: StudentSchedulePlan = {
      slots: [
        // CS-218 in Semester 1, CS-116 is not in the plan at all
        { semesterNumber: 1, courseCodes: ['CS-218'] },
      ],
    };

    const res = validateSemesterPlan(unmetPlan, graph);
    expect(res.isValid).toBe(false);
    const violation = res.allViolations.find((v) => v.courseCode === 'CS-218');
    expect(violation).toBeDefined();
    expect(violation?.type).toBe('prerequisite_unmet');
    expect(violation?.requiredCourseCode).toBe('CS-116');
  });

  it('detects prerequisite co-occurrence in the exact same semester', () => {
    const sameSemPlan: StudentSchedulePlan = {
      slots: [
        // CS-115 and CS-116 scheduled in the same semester
        { semesterNumber: 1, courseCodes: ['CS-115', 'CS-116'] },
      ],
    };

    const res = validateSemesterPlan(sameSemPlan, graph);
    expect(res.isValid).toBe(false);
    const v = res.allViolations.find((violation) => violation.courseCode === 'CS-116');
    expect(v).toBeDefined();
    expect(v?.type).toBe('prerequisite_same_semester');
  });

  it('detects backward prerequisite when prerequisite is planned in a later semester', () => {
    const backwardPlan: StudentSchedulePlan = {
      slots: [
        { semesterNumber: 1, courseCodes: ['CS-116'] },
        { semesterNumber: 2, courseCodes: ['CS-115'] }, // CS-115 is scheduled AFTER CS-116!
      ],
    };

    const res = validateSemesterPlan(backwardPlan, graph);
    expect(res.isValid).toBe(false);
    const v = res.allViolations.find((violation) => violation.courseCode === 'CS-116');
    expect(v).toBeDefined();
    expect(v?.type).toBe('prerequisite_future_semester');
  });

  it('allows prerequisite if already marked as prior completed course', () => {
    const planWithPrior: StudentSchedulePlan = {
      priorCompletedCourses: ['CS-115', 'CS-116'],
      slots: [
        { semesterNumber: 3, courseCodes: ['CS-218'] }, // CS-218 requires CS-116 which is prior completed
      ],
    };

    const res = validateSemesterPlan(planWithPrior, graph);
    expect(res.isValid).toBe(true);
    expect(res.allViolations).toHaveLength(0);
  });

  it('detects duplicate course scheduled across multiple semesters', () => {
    const dupPlan: StudentSchedulePlan = {
      slots: [
        { semesterNumber: 1, courseCodes: ['CS-115'] },
        { semesterNumber: 2, courseCodes: ['CS-115'] }, // Duplicate!
      ],
    };

    const res = validateSemesterPlan(dupPlan, graph);
    expect(res.isValid).toBe(false);
    const v = res.allViolations.find((violation) => violation.type === 'duplicate_course');
    expect(v).toBeDefined();
    expect(v?.courseCode).toBe('CS-115');
  });

  it('evaluates credit limits: light, balanced, and overload status', () => {
    const overloadPlan: StudentSchedulePlan = {
      slots: [
        // 4 * 5 = 20 credits (> 18 credits is overload)
        { semesterNumber: 1, courseCodes: ['CS-115', 'CS-220', 'HS-101', 'MT-101', 'MT-201', 'HS-102'] },
      ],
      maxCreditsPerSemester: 18,
      overloadLimit: 21,
    };

    const res = validateSemesterPlan(overloadPlan, graph);
    // 4 + 4 + 3 + 3 + 3 + 2 = 19 credits
    expect(res.semesters[0].totalCredits).toBe(19);
    expect(res.semesters[0].workload).toBe('overload');
    // Overload above maxCreditsPerSemester (18) records a warning violation
    const v = res.allViolations.find((violation) => violation.type === 'credit_overload');
    expect(v).toBeDefined();
  });

  it('generates a recommended standard 8-semester schedule template from curriculum', () => {
    const defaultSchedule = generateDefaultSchedulePlan(graph);
    expect(defaultSchedule.slots.length).toBe(8);
    // Semester 1 has CS-115, HS-101, MT-101
    const sem1 = defaultSchedule.slots.find((s) => s.semesterNumber === 1);
    expect(sem1?.courseCodes).toContain('CS-115');
    // Validating the default template should be completely valid
    const res = validateSemesterPlan(defaultSchedule, graph);
    expect(res.isValid).toBe(true);
    expect(res.allViolations).toHaveLength(0);
  });
});
