import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import {
  PrereqGraph,
  CourseNode,
  PrereqRule,
  StudentAcademicState,
  validateDAG,
  evaluateAllCourses,
  evaluateCourseEligibility,
  simulateCourseFailure,
  calculateCourseImportance,
  findCriticalPath,
} from '@educompass/engine';

export const prereqRouter = Router();

// ─── Default Verified Curriculum Graph ────────────────────────────────────────

export function buildDefaultCurriculumGraph(): PrereqGraph {
  const courses = new Map<string, CourseNode>([
    // First Year Fall
    ['CS-114', { code: 'CS-114', title: 'Fundamentals of Computer Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing' }],
    ['CS-115', { code: 'CS-115', title: 'Computer Programming', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing' }],
    ['EE-120', { code: 'EE-120', title: 'Basic Electrical Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 1, category: 'core_computing' }],
    ['MT-114', { code: 'MT-114', title: 'Calculus', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 1, category: 'mathematics' }],
    ['HS-111', { code: 'HS-111', title: 'Functional English', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 1, category: 'humanities' }],
    ['HS-106', { code: 'HS-106', title: 'Pakistan Studies', credits: 1, theoryCredits: 1, practicalCredits: 0, semester: 1, category: 'humanities' }],

    // First Year Spring
    ['CS-116', { code: 'CS-116', title: 'Object Oriented Programming', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'core_computing' }],
    ['CS-117', { code: 'CS-117', title: 'Discrete Structures', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 2, category: 'core_computing' }],
    ['PH-122', { code: 'PH-122', title: 'Applied Physics', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'science' }],
    ['EL-103', { code: 'EL-103', title: 'Basic Electronics', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 2, category: 'core_computing' }],
    ['HS-205', { code: 'HS-205', title: 'Islamic Studies', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 2, category: 'humanities' }],

    // Second Year Fall
    ['CS-218', { code: 'CS-218', title: 'Data Structures & Algorithms', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 3, category: 'core_computing' }],
    ['CS-220', { code: 'CS-220', title: 'Digital Logic Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 3, category: 'core_computing' }],
    ['CS-219', { code: 'CS-219', title: 'Computer Engineering Workshop', credits: 1, theoryCredits: 0, practicalCredits: 1, semester: 3, category: 'core_computing' }],
    ['MT-224', { code: 'MT-224', title: 'Complex Variables & Fourier Analysis', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 3, category: 'mathematics' }],
    ['EE-217', { code: 'EE-217', title: 'Circuit Theory', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 3, category: 'core_computing' }],
    ['HS-218', { code: 'HS-218', title: 'Business Communication', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 3, category: 'humanities' }],

    // Second Year Spring
    ['CS-221', { code: 'CS-221', title: 'Computer Organization & Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 4, category: 'core_computing' }],
    ['CS-215', { code: 'CS-215', title: 'Signals and Systems', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 4, category: 'core_computing' }],
    ['CS-222', { code: 'CS-222', title: 'Database Management Systems', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 4, category: 'core_computing' }],
    ['MT-222', { code: 'MT-222', title: 'Linear Algebra and Differential Equations', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 4, category: 'mathematics' }],
    ['HS-219', { code: 'HS-219', title: 'Professional Ethics', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 4, category: 'humanities' }],

    // Third Year Fall
    ['CS-328', { code: 'CS-328', title: 'Computer Architecture', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 5, category: 'core_computing' }],
    ['CS-326', { code: 'CS-326', title: 'Software Engineering', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing' }],
    ['CS-327', { code: 'CS-327', title: 'Computer Communication Networks', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing' }],
    ['CS-323', { code: 'CS-323', title: 'Artificial Intelligence', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 5, category: 'core_computing' }],
    ['MT-335', { code: 'MT-335', title: 'Probability & Statistics', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 5, category: 'mathematics' }],

    // Third Year Spring
    ['CS-301', { code: 'CS-301', title: 'Microprocessor Based System Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'core_computing' }],
    ['CS-329', { code: 'CS-329', title: 'Operating Systems', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'core_computing' }],
    ['MT-442', { code: 'MT-442', title: 'Numerical Methods', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 6, category: 'mathematics' }],
    ['EF-305', { code: 'EF-305', title: 'Engineering Economics and Management', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 6, category: 'humanities' }],
    ['CS-324', { code: 'CS-324', title: 'Machine Learning (Elective-I)', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 6, category: 'elective', isElective: true, electiveDomain: 'AI' }],

    // Final Year Fall
    ['CS-419', { code: 'CS-419', title: 'Digital Signal Processing', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 7, category: 'core_computing' }],
    ['CS-431', { code: 'CS-431', title: 'Digital System Design', credits: 4, theoryCredits: 3, practicalCredits: 1, semester: 7, category: 'core_computing' }],
    ['CS-425', { code: 'CS-425', title: 'Entrepreneurship for Computer Engineers', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 7, category: 'humanities' }],
    ['CS-433', { code: 'CS-433', title: 'Internet Computing (Elective-II)', credits: 2, theoryCredits: 2, practicalCredits: 0, semester: 7, category: 'elective', isElective: true, electiveDomain: 'Network' }],
    ['CS-406', { code: 'CS-406', title: 'Computer Engineering Project', credits: 6, theoryCredits: 0, practicalCredits: 6, semester: 7, category: 'fyp' }],

    // Final Year Spring
    ['CS-438', { code: 'CS-438', title: 'Computer System Modelling', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 8, category: 'core_computing' }],
    ['CS-432', { code: 'CS-432', title: 'Distributed Computing', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 8, category: 'core_computing' }],
    ['MG-482', { code: 'MG-482', title: 'Organizational Behaviour', credits: 3, theoryCredits: 3, practicalCredits: 0, semester: 8, category: 'humanities' }],
    ['CS-426', { code: 'CS-426', title: 'Computer System Security (Elective-III)', credits: 3, theoryCredits: 2, practicalCredits: 1, semester: 8, category: 'elective', isElective: true, electiveDomain: 'Network' }],
  ]);

  const rules = new Map<string, PrereqRule>([
    ['CS-116', { type: 'course', courseCode: 'CS-115', minGrade: 'D' }],
    ['CS-218', { type: 'course', courseCode: 'CS-116', minGrade: 'D' }],
    ['CS-220', { type: 'course', courseCode: 'EE-120', minGrade: 'D' }],
    ['CS-221', { type: 'course', courseCode: 'CS-220', minGrade: 'D' }],
    ['CS-222', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    ['CS-215', { type: 'course', courseCode: 'EE-120', minGrade: 'D' }],
    ['CS-328', { type: 'course', courseCode: 'CS-221', minGrade: 'D' }],
    ['CS-326', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    ['CS-327', { type: 'course', courseCode: 'CS-114', minGrade: 'D' }],
    ['CS-323', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    ['CS-301', { type: 'course', courseCode: 'CS-221', minGrade: 'D' }],
    ['CS-329', { type: 'course', courseCode: 'CS-218', minGrade: 'D' }],
    ['CS-324', { type: 'course', courseCode: 'CS-323', minGrade: 'D' }],
    ['CS-419', { type: 'course', courseCode: 'CS-215', minGrade: 'D' }],
    ['CS-431', { type: 'course', courseCode: 'CS-220', minGrade: 'D' }],
    ['CS-433', { type: 'course', courseCode: 'CS-327', minGrade: 'D' }],
    ['CS-432', { type: 'course', courseCode: 'CS-329', minGrade: 'D' }],
    [
      'CS-406',
      {
        type: 'and',
        children: [
          { type: 'course', courseCode: 'CS-218', minGrade: 'D' },
          { type: 'course', courseCode: 'CS-222', minGrade: 'D' },
          { type: 'course', courseCode: 'CS-326', minGrade: 'D' },
        ],
      },
    ],
  ]);

  return { courses, rules };
}

const defaultGraph = buildDefaultCurriculumGraph();

// ─── Input Schemas ────────────────────────────────────────────────────────────

const EvaluateSchema = z.object({
  completedCourses: z.array(
    z.object({
      code: z.string().trim(),
      grade: z.string().trim(),
      creditHours: z.number().optional().default(4),
    })
  ),
  inProgressCourses: z.array(z.string().trim()).optional().default([]),
  currentSemester: z.number().int().min(1).max(8).optional().default(1),
});

const SimulateFailureSchema = z.object({
  failedCourseCodes: z.array(z.string().trim()).min(1, 'Provide at least one course code to simulate failure'),
  completedCourses: z.array(
    z.object({
      code: z.string().trim(),
      grade: z.string().trim(),
      creditHours: z.number().optional().default(4),
    })
  ),
  currentSemester: z.number().int().min(1).max(8).optional().default(1),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/prereq/graph
 * Returns all courses with credits, prerequisite rules, and DAG cycle status.
 */
prereqRouter.get('/graph', (_req: Request, res: Response) => {
  const dagCheck = validateDAG(defaultGraph);

  const courseList = Array.from(defaultGraph.courses.values()).map((c) => {
    const rule = defaultGraph.rules.get(c.code);
    return {
      ...c,
      prerequisites: rule ? rule : null,
    };
  });

  res.json({
    data: {
      program: 'BE Computer Systems Engineering',
      batch: '2018 Onwards',
      totalCourses: courseList.length,
      isValidDAG: dagCheck.isValidDAG,
      topologicalOrder: dagCheck.topologicalOrder || [],
      courses: courseList,
      disclaimer: 'Guidance estimates, not official university decisions.',
    },
  });
});

/**
 * POST /api/v1/prereq/evaluate
 * Evaluates student course eligibility against curriculum rules.
 */
prereqRouter.post('/evaluate', (req: Request, res: Response) => {
  const parsed = EvaluateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid academic state payload', parsed.error.errors));
    return;
  }

  const { completedCourses, inProgressCourses, currentSemester } = parsed.data;

  const completedMap = new Map<string, { grade: string; creditHours: number }>();
  let totalCredits = 0;

  for (const c of completedCourses) {
    completedMap.set(c.code, { grade: c.grade, creditHours: c.creditHours });
    totalCredits += c.creditHours;
  }

  const state: StudentAcademicState = {
    completedCourses: completedMap,
    inProgressCourses: new Set(inProgressCourses),
    totalCreditsEarned: totalCredits,
    currentSemester,
  };

  const results = evaluateAllCourses(defaultGraph, state);

  res.json({
    data: {
      currentSemester,
      totalCreditsEarned: totalCredits,
      evaluations: Array.from(results.values()),
      disclaimer: 'Guidance estimates, not official university decisions.',
    },
  });
});

/**
 * POST /api/v1/prereq/simulate-failure
 * Simulates failing one or more courses in memory (Rule #8).
 */
prereqRouter.post('/simulate-failure', (req: Request, res: Response) => {
  const parsed = SimulateFailureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid simulation payload', parsed.error.errors));
    return;
  }

  const { failedCourseCodes, completedCourses, currentSemester } = parsed.data;

  const completedMap = new Map<string, { grade: string; creditHours: number }>();
  let totalCredits = 0;

  for (const c of completedCourses) {
    completedMap.set(c.code, { grade: c.grade, creditHours: c.creditHours });
    totalCredits += c.creditHours;
  }

  const baseState: StudentAcademicState = {
    completedCourses: completedMap,
    totalCreditsEarned: totalCredits,
    currentSemester,
  };

  // Run simulation in memory (Rule #8)
  const simulationResults = simulateCourseFailure(failedCourseCodes, defaultGraph, baseState);

  res.json({
    data: {
      simulationResults,
      disclaimer: 'Guidance estimates, not official university decisions.',
    },
  });
});

/**
 * GET /api/v1/prereq/importance/:code
 * Returns importance score with full 4-part breakdown labeled as Estimate (Rule #7).
 */
prereqRouter.get('/importance/:code', (req: Request, res: Response) => {
  const code = req.params.code as string;
  if (!defaultGraph.courses.has(code)) {
    res.status(404).json(apiError('NOT_FOUND', `Course code ${code} not found in curriculum`));
    return;
  }

  const score = calculateCourseImportance(defaultGraph, code);

  res.json({
    data: {
      ...score,
      disclaimer: 'Guidance estimates, not official university decisions.',
    },
  });
});

/**
 * GET /api/v1/prereq/critical-path
 * Returns the longest prerequisite dependency chain leading to FYP (CS-406).
 */
prereqRouter.get('/critical-path', (_req: Request, res: Response) => {
  const path = findCriticalPath(defaultGraph, 'CS-406');

  res.json({
    data: {
      targetCourse: 'CS-406',
      criticalPath: path,
      pathLength: path.length,
      disclaimer: 'Guidance estimates, not official university decisions.',
    },
  });
});
