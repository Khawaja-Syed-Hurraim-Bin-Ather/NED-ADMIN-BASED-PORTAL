/**
 * EduCompass Prerequisite Engine
 * Source of truth: SRS v1.0, Rules #7, #8, #15
 * 
 * Non-negotiables:
 * - Pure TypeScript logic with zero I/O (Rule Architecture D1).
 * - Failure simulation works ONLY on in-memory copies; never alters real state (Rule #8).
 * - Importance scores are labeled as "Estimate" with full calculation breakdown (Rule #7).
 * - Zero live external API calls (Rule #15).
 */

export const ENGINE_VERSION = '1.0.0';

// ─── Core Types ───────────────────────────────────────────────────────────────

export interface CourseNode {
  code: string;
  title: string;
  credits: number;
  theoryCredits?: number;
  practicalCredits?: number;
  semester: number; // 1-8
  category?: 'core_computing' | 'mathematics' | 'science' | 'humanities' | 'fyp' | 'elective';
  isElective?: boolean;
  electiveDomain?: 'AI' | 'Network' | 'SystemDesign' | 'SoftwareEngineering';
}

export type PrereqRuleType = 'course' | 'and' | 'or' | 'min_credits';

export interface PrereqRule {
  type: PrereqRuleType;
  courseCode?: string;
  minGrade?: string; // Default 'D'
  minCredits?: number;
  children?: PrereqRule[];
}

export interface PrereqGraph {
  courses: Map<string, CourseNode>;
  rules: Map<string, PrereqRule>; // courseCode -> rule
}

export interface CompletedCourseRecord {
  grade: string;
  creditHours: number;
  term?: string;
}

export interface StudentAcademicState {
  completedCourses: Map<string, CompletedCourseRecord>;
  inProgressCourses?: Set<string>;
  totalCreditsEarned: number;
  currentSemester: number;
}

export interface CourseEligibilityResult {
  code: string;
  isEligible: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  missingPrerequisites: string[];
  reason: string;
}

export interface FailureSimulationResult {
  failedCourse: string;
  simulationLabel: 'Simulation (in-memory estimate)';
  blockedDirectly: string[];
  blockedDownstreamCascade: string[];
  impactedSemesters: number[];
  delayedCredits: number;
  estimatedGraduationDelaySemesters: number;
  criticalPathImpact: boolean;
}

export interface CourseImportanceScore {
  code: string;
  importanceScore: number; // 0 to 100
  label: 'Estimate';
  breakdown: {
    directUnlocks: number;
    downstreamReach: number;
    creditWeight: number;
    earlinessWeight: number;
  };
}

// ─── Grade Evaluation ─────────────────────────────────────────────────────────

const GRADE_POINTS: Record<string, number> = {
  A: 4.0,
  'A-': 3.7,
  'B+': 3.4,
  B: 3.0,
  'B-': 2.7,
  'C+': 2.4,
  C: 2.0,
  'C-': 1.7,
  'D+': 1.4,
  D: 1.0,
  F: 0.0,
};

export function isGradePassing(studentGrade: string, minRequiredGrade = 'D'): boolean {
  const studentPts = GRADE_POINTS[studentGrade.toUpperCase()] ?? 0.0;
  const requiredPts = GRADE_POINTS[minRequiredGrade.toUpperCase()] ?? 1.0;
  return studentPts >= requiredPts;
}

// ─── 1. DAG Validation & Topological Sort ─────────────────────────────────────

export interface DAGValidationResult {
  isValidDAG: boolean;
  cycle?: string[];
  topologicalOrder?: string[];
}

/**
 * Validates that the prerequisite graph is a Directed Acyclic Graph (no cyclic prerequisites).
 * Uses Depth-First Search with 3-state node coloring:
 * 0 = unvisited, 1 = visiting (in active recursion stack), 2 = fully visited.
 */
export function validateDAG(graph: PrereqGraph): DAGValidationResult {
  const visited = new Map<string, 0 | 1 | 2>();
  const parent = new Map<string, string | null>();
  const order: string[] = [];
  let detectedCycle: string[] | undefined;

  // Build adjacency list: prerequisite -> dependents
  const directDependents = new Map<string, string[]>();
  for (const [code] of graph.courses) {
    directDependents.set(code, []);
  }

  for (const [courseCode, rule] of graph.rules) {
    const prereqs = extractPrerequisiteCodes(rule);
    for (const prereq of prereqs) {
      if (directDependents.has(prereq)) {
        directDependents.get(prereq)!.push(courseCode);
      }
    }
  }

  function dfs(node: string, path: string[]): boolean {
    visited.set(node, 1); // Mark visiting
    path.push(node);

    const dependents = directDependents.get(node) || [];
    for (const dep of dependents) {
      const state = visited.get(dep) || 0;
      if (state === 1) {
        // Cycle detected
        const cycleStartIndex = path.indexOf(dep);
        detectedCycle = [...path.slice(cycleStartIndex), dep];
        return false;
      }
      if (state === 0) {
        parent.set(dep, node);
        if (!dfs(dep, path)) return false;
      }
    }

    path.pop();
    visited.set(node, 2); // Mark visited
    order.push(node);
    return true;
  }

  for (const [code] of graph.courses) {
    if ((visited.get(code) || 0) === 0) {
      if (!dfs(code, [])) {
        return {
          isValidDAG: false,
          cycle: detectedCycle,
        };
      }
    }
  }

  return {
    isValidDAG: true,
    topologicalOrder: order.reverse(),
  };
}

/**
 * Extracts all referenced course codes from a recursive prerequisite rule tree.
 */
export function extractPrerequisiteCodes(rule?: PrereqRule): string[] {
  if (!rule) return [];
  if (rule.type === 'course' && rule.courseCode) {
    return [rule.courseCode];
  }
  if ((rule.type === 'and' || rule.type === 'or') && rule.children) {
    return rule.children.flatMap((c) => extractPrerequisiteCodes(c));
  }
  return [];
}

// ─── 2. Eligibility Evaluation ────────────────────────────────────────────────

/**
 * Evaluates whether a student meets the prerequisite rules for a single course.
 */
export function evaluateCourseEligibility(
  courseCode: string,
  rule: PrereqRule | undefined,
  state: StudentAcademicState
): CourseEligibilityResult {
  const completedRecord = state.completedCourses.get(courseCode);
  const isCompleted = !!completedRecord && isGradePassing(completedRecord.grade, 'D');
  const isInProgress = !!state.inProgressCourses?.has(courseCode);

  if (isCompleted) {
    return {
      code: courseCode,
      isEligible: false,
      isCompleted: true,
      isInProgress: false,
      missingPrerequisites: [],
      reason: 'Course has already been completed with passing grade.',
    };
  }

  if (isInProgress) {
    return {
      code: courseCode,
      isEligible: false,
      isCompleted: false,
      isInProgress: true,
      missingPrerequisites: [],
      reason: 'Course is currently in progress.',
    };
  }

  if (!rule) {
    return {
      code: courseCode,
      isEligible: true,
      isCompleted: false,
      isInProgress: false,
      missingPrerequisites: [],
      reason: 'No prerequisites required.',
    };
  }

  const missing: string[] = [];

  function evaluateNode(node: PrereqRule): boolean {
    switch (node.type) {
      case 'course': {
        if (!node.courseCode) return true;
        const rec = state.completedCourses.get(node.courseCode);
        const passed = !!rec && isGradePassing(rec.grade, node.minGrade || 'D');
        if (!passed) {
          missing.push(node.courseCode);
          return false;
        }
        return true;
      }
      case 'min_credits': {
        const required = node.minCredits || 0;
        return state.totalCreditsEarned >= required;
      }
      case 'and': {
        if (!node.children || node.children.length === 0) return true;
        let allPassed = true;
        for (const child of node.children) {
          if (!evaluateNode(child)) {
            allPassed = false;
          }
        }
        return allPassed;
      }
      case 'or': {
        if (!node.children || node.children.length === 0) return true;
        const subMissing: string[] = [];
        let anyPassed = false;
        for (const child of node.children) {
          const childMissing: string[] = [];
          // Clone missing array for sub-branches
          if (child.type === 'course' && child.courseCode) {
            const rec = state.completedCourses.get(child.courseCode);
            if (rec && isGradePassing(rec.grade, child.minGrade || 'D')) {
              anyPassed = true;
              break;
            } else {
              subMissing.push(child.courseCode);
            }
          }
        }
        if (!anyPassed) {
          missing.push(...subMissing);
          return false;
        }
        return true;
      }
      default:
        return true;
    }
  }

  const isEligible = evaluateNode(rule);

  return {
    code: courseCode,
    isEligible,
    isCompleted: false,
    isInProgress: false,
    missingPrerequisites: Array.from(new Set(missing)),
    reason: isEligible
      ? 'All prerequisite conditions satisfied.'
      : `Missing prerequisites: ${Array.from(new Set(missing)).join(', ')}`,
  };
}

/**
 * Evaluates eligibility across all courses in the curriculum.
 */
export function evaluateAllCourses(
  graph: PrereqGraph,
  state: StudentAcademicState
): Map<string, CourseEligibilityResult> {
  const results = new Map<string, CourseEligibilityResult>();
  for (const [code] of graph.courses) {
    const rule = graph.rules.get(code);
    results.set(code, evaluateCourseEligibility(code, rule, state));
  }
  return results;
}

// ─── 3. Failure Simulation (Rule #8 — In-memory copy only) ─────────────────────

/**
 * Simulates failing one or more courses in memory.
 * Rule #8: Works strictly on a clone of baseState; never alters real database records.
 */
export function simulateCourseFailure(
  failedCourseCodes: string[],
  graph: PrereqGraph,
  baseState: StudentAcademicState
): FailureSimulationResult[] {
  // 1. Create deep in-memory copy of completed courses (Rule #8)
  const simulatedCompleted = new Map<string, CompletedCourseRecord>();
  for (const [code, record] of baseState.completedCourses) {
    simulatedCompleted.set(code, { ...record });
  }

  // 2. Mark specified courses as failed ('F') in the simulation copy
  for (const failedCode of failedCourseCodes) {
    const existing = simulatedCompleted.get(failedCode);
    if (existing) {
      simulatedCompleted.set(failedCode, { ...existing, grade: 'F' });
    } else {
      simulatedCompleted.set(failedCode, { grade: 'F', creditHours: graph.courses.get(failedCode)?.credits || 4 });
    }
  }

  const simulatedState: StudentAcademicState = {
    completedCourses: simulatedCompleted,
    totalCreditsEarned: Array.from(simulatedCompleted.values())
      .filter((r) => isGradePassing(r.grade, 'D'))
      .reduce((sum, r) => sum + r.creditHours, 0),
    currentSemester: baseState.currentSemester,
    inProgressCourses: new Set(baseState.inProgressCourses),
  };

  // 3. Build child map (prerequisite -> dependent courses)
  const dependentsMap = new Map<string, string[]>();
  for (const [code] of graph.courses) {
    dependentsMap.set(code, []);
  }

  for (const [code, rule] of graph.rules) {
    const prereqs = extractPrerequisiteCodes(rule);
    for (const prereq of prereqs) {
      if (dependentsMap.has(prereq)) {
        dependentsMap.get(prereq)!.push(code);
      }
    }
  }

  // 4. Calculate cascade impact for each failed course
  const results: FailureSimulationResult[] = [];

  for (const failedCode of failedCourseCodes) {
    const blockedDirectly = dependentsMap.get(failedCode) || [];

    // Find all transitive downstream courses via BFS
    const cascadeSet = new Set<string>();
    const queue = [...blockedDirectly];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (!cascadeSet.has(current)) {
        cascadeSet.add(current);
        const downstream = dependentsMap.get(current) || [];
        for (const d of downstream) {
          if (!cascadeSet.has(d)) {
            queue.push(d);
          }
        }
      }
    }

    const allBlockedCodes = Array.from(cascadeSet);
    const impactedSemesters = Array.from(
      new Set(
        allBlockedCodes
          .map((code) => graph.courses.get(code)?.semester)
          .filter((sem): sem is number => sem !== undefined)
      )
    ).sort((a, b) => a - b);

    const delayedCredits = allBlockedCodes.reduce(
      (sum, code) => sum + (graph.courses.get(code)?.credits || 3),
      0
    );

    // If FYP (CS-406) or 8th semester courses are blocked, graduation is delayed
    const reachesFYP = cascadeSet.has('CS-406') || impactedSemesters.includes(7) || impactedSemesters.includes(8);
    const estimatedGraduationDelay = reachesFYP ? (impactedSemesters.length >= 3 ? 2 : 1) : 0;

    results.push({
      failedCourse: failedCode,
      simulationLabel: 'Simulation (in-memory estimate)',
      blockedDirectly,
      blockedDownstreamCascade: allBlockedCodes,
      impactedSemesters,
      delayedCredits,
      estimatedGraduationDelaySemesters: estimatedGraduationDelay,
      criticalPathImpact: reachesFYP,
    });
  }

  return results;
}

// ─── 4. Course Importance Scoring (Rule #7 — Labelled estimates with breakdown) ─

/**
 * Calculates a course's importance score (0-100) based on:
 * - Direct unlocks (weight 40%)
 * - Downstream cascade reach (weight 25%)
 * - Credit hours weight (weight 20%)
 * - Semester earliness leverage (weight 15%)
 * 
 * Always labeled as "Estimate" with full breakdown (Rule #7).
 */
export function calculateCourseImportance(graph: PrereqGraph, courseCode: string): CourseImportanceScore {
  const course = graph.courses.get(courseCode);
  const totalCourses = Math.max(1, graph.courses.size);

  // 1. Direct unlocks
  const directUnlocks: string[] = [];
  for (const [code, rule] of graph.rules) {
    const prereqs = extractPrerequisiteCodes(rule);
    if (prereqs.includes(courseCode)) {
      directUnlocks.push(code);
    }
  }

  // 2. Transitive reach via BFS
  const reachSet = new Set<string>();
  const queue = [...directUnlocks];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (!reachSet.has(cur)) {
      reachSet.add(cur);
      for (const [code, rule] of graph.rules) {
        if (extractPrerequisiteCodes(rule).includes(cur) && !reachSet.has(code)) {
          queue.push(code);
        }
      }
    }
  }

  // 3. Normalized weights (weights configured in SRS: 40, 25, 20, 15)
  const directScore = Math.min(1.0, directUnlocks.length / 4) * 40;
  const reachScore = Math.min(1.0, reachSet.size / (totalCourses * 0.35)) * 25;
  const creditScore = Math.min(1.0, (course?.credits || 3) / 4) * 20;
  const earlinessScore = course ? Math.max(0, (9 - course.semester) / 8) * 15 : 7.5;

  const totalScore = Math.round(directScore + reachScore + creditScore + earlinessScore);

  return {
    code: courseCode,
    importanceScore: Math.min(100, Math.max(0, totalScore)),
    label: 'Estimate',
    breakdown: {
      directUnlocks: Math.round(directScore),
      downstreamReach: Math.round(reachScore),
      creditWeight: Math.round(creditScore),
      earlinessWeight: Math.round(earlinessScore),
    },
  };
}

// ─── 5. Critical Path Analysis ────────────────────────────────────────────────

/**
 * Finds the longest prerequisite chain leading to a target course (e.g. FYP).
 */
export function findCriticalPath(graph: PrereqGraph, targetCourseCode = 'CS-406'): string[] {
  const memo = new Map<string, string[]>();

  function getLongestPathTo(node: string): string[] {
    if (memo.has(node)) return memo.get(node)!;

    const rule = graph.rules.get(node);
    const prereqs = extractPrerequisiteCodes(rule);

    if (prereqs.length === 0) {
      memo.set(node, [node]);
      return [node];
    }

    let longestPrereqPath: string[] = [];
    for (const prereq of prereqs) {
      const path = getLongestPathTo(prereq);
      if (path.length > longestPrereqPath.length) {
        longestPrereqPath = path;
      }
    }

    const fullPath = [...longestPrereqPath, node];
    memo.set(node, fullPath);
    return fullPath;
  }

  return getLongestPathTo(targetCourseCode);
}

// ─── 6. Planner Engine (Card M3) ─────────────────────────────────────────────

export * from './planner';
