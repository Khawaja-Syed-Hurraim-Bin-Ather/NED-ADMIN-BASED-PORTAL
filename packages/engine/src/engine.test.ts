import { describe, it, expect } from 'vitest';
import {
  PrereqGraph,
  CourseNode,
  PrereqRule,
  StudentAcademicState,
  validateDAG,
  evaluateCourseEligibility,
  evaluateAllCourses,
  simulateCourseFailure,
  calculateCourseImportance,
  findCriticalPath,
} from './index';

// ─── Test Fixture Graph ───────────────────────────────────────────────────────

function createSampleNEDGraph(): PrereqGraph {
  const courses = new Map<string, CourseNode>([
    ['CS-115', { code: 'CS-115', title: 'Computer Programming', credits: 4, semester: 1, category: 'core_computing' }],
    ['CS-116', { code: 'CS-116', title: 'Object Oriented Programming', credits: 4, semester: 2, category: 'core_computing' }],
    ['CS-218', { code: 'CS-218', title: 'Data Structures & Algorithms', credits: 4, semester: 3, category: 'core_computing' }],
    ['CS-220', { code: 'CS-220', title: 'Digital Logic Design', credits: 4, semester: 3, category: 'core_computing' }],
    ['CS-221', { code: 'CS-221', title: 'Computer Organization & Design', credits: 4, semester: 4, category: 'core_computing' }],
    ['CS-222', { code: 'CS-222', title: 'Database Management Systems', credits: 4, semester: 4, category: 'core_computing' }],
    ['CS-323', { code: 'CS-323', title: 'Artificial Intelligence', credits: 4, semester: 5, category: 'core_computing' }],
    ['CS-301', { code: 'CS-301', title: 'Microprocessor Based System Design', credits: 4, semester: 6, category: 'core_computing' }],
    ['CS-406', { code: 'CS-406', title: 'Final Year Project', credits: 6, semester: 7, category: 'fyp' }],
  ]);

  const rules = new Map<string, PrereqRule>([
    // CS-116 requires CS-115
    ['CS-116', { type: 'course', courseCode: 'CS-115', minGrade: 'D' }],
    // CS-218 requires CS-116
    ['CS-218', { type: 'course', courseCode: 'CS-116', minGrade: 'D' }],
    // CS-221 requires CS-220
    ['CS-221', { type: 'course', courseCode: 'CS-220', minGrade: 'D' }],
    // CS-222 requires CS-218
    ['CS-222', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    // CS-323 requires CS-218
    ['CS-323', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    // CS-301 requires CS-221
    ['CS-301', { type: 'course', courseCode: 'CS-221', minGrade: 'D' }],
    // CS-406 requires BOTH CS-218 AND CS-222 (compound AND rule)
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

describe('Prerequisite Engine (Card H1)', () => {
  describe('DAG Validation & Topological Sort', () => {
    it('validates that a well-formed curriculum has no cycles and produces topological ordering', () => {
      const graph = createSampleNEDGraph();
      const result = validateDAG(graph);

      expect(result.isValidDAG).toBe(true);
      expect(result.cycle).toBeUndefined();
      expect(result.topologicalOrder).toBeDefined();

      const order = result.topologicalOrder!;
      // Prerequisite must appear before dependent course
      expect(order.indexOf('CS-115')).toBeLessThan(order.indexOf('CS-116'));
      expect(order.indexOf('CS-116')).toBeLessThan(order.indexOf('CS-218'));
      expect(order.indexOf('CS-218')).toBeLessThan(order.indexOf('CS-406'));
    });

    it('detects cycles in an invalid curriculum graph and reports the cycle path', () => {
      const graph = createSampleNEDGraph();
      // Introduce an illegal cycle: CS-115 requires CS-406
      graph.rules.set('CS-115', { type: 'course', courseCode: 'CS-406', minGrade: 'D' });

      const result = validateDAG(graph);
      expect(result.isValidDAG).toBe(false);
      expect(result.cycle).toBeDefined();
      expect(result.cycle!.length).toBeGreaterThan(0);
    });
  });

  describe('Eligibility Evaluation', () => {
    it('evaluates course with no prerequisites as instantly eligible', () => {
      const graph = createSampleNEDGraph();
      const state: StudentAcademicState = {
        completedCourses: new Map(),
        totalCreditsEarned: 0,
        currentSemester: 1,
      };

      const result = evaluateCourseEligibility('CS-115', graph.rules.get('CS-115'), state);
      expect(result.isEligible).toBe(true);
      expect(result.isCompleted).toBe(false);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    it('evaluates course as ineligible when single prerequisite is missing or failed', () => {
      const graph = createSampleNEDGraph();
      const state: StudentAcademicState = {
        completedCourses: new Map([
          ['CS-115', { grade: 'F', creditHours: 4 }], // Failed prerequisite
        ]),
        totalCreditsEarned: 0,
        currentSemester: 2,
      };

      const result = evaluateCourseEligibility('CS-116', graph.rules.get('CS-116'), state);
      expect(result.isEligible).toBe(false);
      expect(result.missingPrerequisites).toContain('CS-115');
    });

    it('evaluates compound AND prerequisite rules correctly', () => {
      const graph = createSampleNEDGraph();

      // Case A: Missing one of the required courses (CS-222)
      const partialState: StudentAcademicState = {
        completedCourses: new Map([
          ['CS-115', { grade: 'A', creditHours: 4 }],
          ['CS-116', { grade: 'B', creditHours: 4 }],
          ['CS-218', { grade: 'B', creditHours: 4 }],
        ]),
        totalCreditsEarned: 12,
        currentSemester: 5,
      };

      const partialRes = evaluateCourseEligibility('CS-406', graph.rules.get('CS-406'), partialState);
      expect(partialRes.isEligible).toBe(false);
      expect(partialRes.missingPrerequisites).toContain('CS-222');

      // Case B: Both required courses completed with passing grades
      const completeState: StudentAcademicState = {
        completedCourses: new Map([
          ['CS-115', { grade: 'A', creditHours: 4 }],
          ['CS-116', { grade: 'B', creditHours: 4 }],
          ['CS-218', { grade: 'B', creditHours: 4 }],
          ['CS-222', { grade: 'C', creditHours: 4 }],
        ]),
        totalCreditsEarned: 16,
        currentSemester: 7,
      };

      const completeRes = evaluateCourseEligibility('CS-406', graph.rules.get('CS-406'), completeState);
      expect(completeRes.isEligible).toBe(true);
      expect(completeRes.missingPrerequisites).toHaveLength(0);
    });

    it('evaluates compound OR prerequisite rules correctly', () => {
      const rule: PrereqRule = {
        type: 'or',
        children: [
          { type: 'course', courseCode: 'CS-218', minGrade: 'D' },
          { type: 'course', courseCode: 'CS-220', minGrade: 'D' },
        ],
      };

      const stateWithOne: StudentAcademicState = {
        completedCourses: new Map([
          ['CS-220', { grade: 'B', creditHours: 4 }],
        ]),
        totalCreditsEarned: 4,
        currentSemester: 4,
      };

      const res = evaluateCourseEligibility('CS-ELECTIVE', rule, stateWithOne);
      expect(res.isEligible).toBe(true);
      expect(res.missingPrerequisites).toHaveLength(0);
    });
  });

  describe('Failure Simulation (Rule #8 — In-memory copy only)', () => {
    it('simulates failure of prerequisite and calculates direct + cascade downstream blocks', () => {
      const graph = createSampleNEDGraph();
      const baseState: StudentAcademicState = {
        completedCourses: new Map([
          ['CS-115', { grade: 'A', creditHours: 4 }],
          ['CS-116', { grade: 'B', creditHours: 4 }],
          ['CS-220', { grade: 'A', creditHours: 4 }],
        ]),
        totalCreditsEarned: 12,
        currentSemester: 3,
      };

      // Simulate failure of CS-116
      const simulation = simulateCourseFailure(['CS-116'], graph, baseState);

      expect(simulation).toHaveLength(1);
      const sim = simulation[0];

      expect(sim.failedCourse).toBe('CS-116');
      expect(sim.simulationLabel).toBe('Simulation (in-memory estimate)');

      // CS-218 is directly blocked
      expect(sim.blockedDirectly).toContain('CS-218');

      // CS-222, CS-323, and CS-406 are blocked downstream via cascade
      expect(sim.blockedDownstreamCascade).toContain('CS-222');
      expect(sim.blockedDownstreamCascade).toContain('CS-323');
      expect(sim.blockedDownstreamCascade).toContain('CS-406');

      // Rule #8 check: Base state must NOT be modified
      expect(baseState.completedCourses.get('CS-116')?.grade).toBe('B');
    });
  });

  describe('Course Importance Scoring (Rule #7 — Labelled estimates with breakdown)', () => {
    it('calculates importance score with explicit breakdown and estimate label', () => {
      const graph = createSampleNEDGraph();

      const score = calculateCourseImportance(graph, 'CS-115');

      expect(score.code).toBe('CS-115');
      expect(score.label).toBe('Estimate');
      expect(score.importanceScore).toBeGreaterThan(0);
      expect(score.importanceScore).toBeLessThanOrEqual(100);

      // Verify breakdown components exist and sum mathematically
      expect(score.breakdown.directUnlocks).toBeGreaterThan(0);
      expect(score.breakdown.downstreamReach).toBeGreaterThan(0);
      expect(score.breakdown.creditWeight).toBeGreaterThan(0);
      expect(score.breakdown.earlinessWeight).toBeGreaterThan(0);
    });
  });

  describe('Critical Path Analysis', () => {
    it('identifies the longest prerequisite chain leading to FYP', () => {
      const graph = createSampleNEDGraph();
      const criticalPath = findCriticalPath(graph, 'CS-406');

      expect(criticalPath).toBeDefined();
      expect(criticalPath[0]).toBe('CS-115');
      expect(criticalPath).toContain('CS-116');
      expect(criticalPath).toContain('CS-218');
      expect(criticalPath[criticalPath.length - 1]).toBe('CS-406');
    });
  });
});
