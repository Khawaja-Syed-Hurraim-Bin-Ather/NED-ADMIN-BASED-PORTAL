/**
 * EduCompass Planner Engine (Card M3)
 * Pure TypeScript logic for validating student multi-semester course schedules,
 * prerequisite sequencing, credit load distribution, and degree completion progress.
 */

import { CourseNode, PrereqGraph, extractPrerequisiteCodes } from './index';

export interface SemesterPlanSlot {
  semesterNumber: number; // 1 to 8 (or up to 12)
  courseCodes: string[];
}

export interface StudentSchedulePlan {
  slots: SemesterPlanSlot[];
  priorCompletedCourses?: string[];
  maxCreditsPerSemester?: number; // default 18
  overloadLimit?: number; // default 21
}

export type PlannerViolationType =
  | 'prerequisite_unmet'
  | 'prerequisite_same_semester'
  | 'prerequisite_future_semester'
  | 'credit_overload'
  | 'duplicate_course';

export interface PlannerViolation {
  semesterNumber: number;
  courseCode?: string;
  type: PlannerViolationType;
  message: string;
  requiredCourseCode?: string;
}

export interface SemesterValidationSummary {
  semesterNumber: number;
  courseCodes: string[];
  totalCredits: number;
  workload: 'light' | 'balanced' | 'overload';
  violations: PlannerViolation[];
}

export interface PlanValidationResult {
  isValid: boolean;
  totalCredits: number;
  semesters: SemesterValidationSummary[];
  allViolations: PlannerViolation[];
  totalDegreeCredits: number;
  degreeRequirementMet: boolean;
  degreeTargetCredits: number;
}

/**
 * Validates a multi-semester student plan against prerequisite constraints,
 * credit load thresholds, and chronological validity.
 */
export function validateSemesterPlan(
  plan: StudentSchedulePlan,
  graph: PrereqGraph,
  degreeTargetCredits = 136
): PlanValidationResult {
  const maxCredits = plan.maxCreditsPerSemester ?? 18;
  const overloadLimit = plan.overloadLimit ?? 21;

  // Track which semester each course is scheduled in (for quick lookup)
  const courseSemesterMap = new Map<string, number>();
  const duplicateViolations: PlannerViolation[] = [];

  // Sort slots by semesterNumber
  const sortedSlots = [...plan.slots].sort((a, b) => a.semesterNumber - b.semesterNumber);

  for (const slot of sortedSlots) {
    for (const code of slot.courseCodes) {
      if (courseSemesterMap.has(code)) {
        duplicateViolations.push({
          semesterNumber: slot.semesterNumber,
          courseCode: code,
          type: 'duplicate_course',
          message: `Course ${code} is scheduled multiple times (Semester ${courseSemesterMap.get(code)} and Semester ${slot.semesterNumber}).`,
        });
      } else {
        courseSemesterMap.set(code, slot.semesterNumber);
      }
    }
  }

  // Prior completed courses act as if completed in "Semester 0"
  const priorCompleted = new Set(plan.priorCompletedCourses ?? []);

  const semesterSummaries: SemesterValidationSummary[] = [];
  const allViolations: PlannerViolation[] = [...duplicateViolations];
  let totalDegreeCredits = 0;

  // Track courses taken prior to the current semester in the loop
  const coursesTakenBeforeThisSem = new Set<string>(priorCompleted);

  for (const slot of sortedSlots) {
    const semNumber = slot.semesterNumber;
    const semViolations: PlannerViolation[] = [];
    let semCredits = 0;

    // Set of courses in the exact same semester
    const currentSemCourseSet = new Set(slot.courseCodes);

    for (const code of slot.courseCodes) {
      const course = graph.courses.get(code);
      const credits = course?.credits ?? 3;
      semCredits += credits;

      // Check prerequisite rules
      const rule = graph.rules.get(code);
      if (rule) {
        const prereqCodes = extractPrerequisiteCodes(rule);
        for (const prereq of prereqCodes) {
          // 1. Is it already satisfied prior to this semester?
          if (coursesTakenBeforeThisSem.has(prereq)) {
            continue;
          }

          // 2. Is it in the exact same semester?
          if (currentSemCourseSet.has(prereq)) {
            const v: PlannerViolation = {
              semesterNumber: semNumber,
              courseCode: code,
              requiredCourseCode: prereq,
              type: 'prerequisite_same_semester',
              message: `Course ${code} requires ${prereq}, which is scheduled in the same semester (${semNumber}). Prerequisites must be passed in an earlier semester.`,
            };
            semViolations.push(v);
            allViolations.push(v);
            continue;
          }

          // 3. Is it scheduled in a future semester?
          const scheduledSem = courseSemesterMap.get(prereq);
          if (scheduledSem !== undefined && scheduledSem > semNumber) {
            const v: PlannerViolation = {
              semesterNumber: semNumber,
              courseCode: code,
              requiredCourseCode: prereq,
              type: 'prerequisite_future_semester',
              message: `Course ${code} requires ${prereq}, which is planned in a later semester (${scheduledSem}).`,
            };
            semViolations.push(v);
            allViolations.push(v);
            continue;
          }

          // 4. Otherwise, it is completely unmet
          const v: PlannerViolation = {
            semesterNumber: semNumber,
            courseCode: code,
            requiredCourseCode: prereq,
            type: 'prerequisite_unmet',
            message: `Course ${code} requires prerequisite ${prereq}, which is not planned in any preceding semester.`,
          };
          semViolations.push(v);
          allViolations.push(v);
        }
      }
    }

    // Workload evaluation
    let workload: 'light' | 'balanced' | 'overload' = 'balanced';
    if (semCredits < 15) {
      workload = 'light';
    } else if (semCredits > maxCredits) {
      workload = 'overload';
      const v: PlannerViolation = {
        semesterNumber: semNumber,
        type: 'credit_overload',
        message: `Semester ${semNumber} has ${semCredits} credit hours, exceeding the standard ${maxCredits} credit limit${
          semCredits > overloadLimit ? ` (and the ${overloadLimit} hard cap)` : ''
        }.`,
      };
      semViolations.push(v);
      allViolations.push(v);
    }

    totalDegreeCredits += semCredits;

    // Add this semester's courses to the cumulative completed set for subsequent terms
    for (const code of slot.courseCodes) {
      coursesTakenBeforeThisSem.add(code);
    }

    semesterSummaries.push({
      semesterNumber: semNumber,
      courseCodes: slot.courseCodes,
      totalCredits: semCredits,
      workload,
      violations: semViolations,
    });
  }

  // Include prior completed credits if any
  for (const priorCode of priorCompleted) {
    if (!courseSemesterMap.has(priorCode)) {
      const c = graph.courses.get(priorCode);
      totalDegreeCredits += c?.credits ?? 3;
    }
  }

  return {
    isValid: allViolations.length === 0,
    totalCredits: totalDegreeCredits,
    semesters: semesterSummaries,
    allViolations,
    totalDegreeCredits,
    degreeRequirementMet: totalDegreeCredits >= degreeTargetCredits,
    degreeTargetCredits,
  };
}

/**
 * Generates an 8-semester schedule template grouped by default curriculum semesters.
 */
export function generateDefaultSchedulePlan(graph: PrereqGraph): StudentSchedulePlan {
  const slotsMap = new Map<number, string[]>();

  for (let s = 1; s <= 8; s++) {
    slotsMap.set(s, []);
  }

  for (const [code, course] of graph.courses) {
    const sem = Math.min(8, Math.max(1, course.semester || 1));
    if (!slotsMap.has(sem)) {
      slotsMap.set(sem, []);
    }
    slotsMap.get(sem)!.push(code);
  }

  const slots: SemesterPlanSlot[] = [];
  for (let s = 1; s <= 8; s++) {
    slots.push({
      semesterNumber: s,
      courseCodes: slotsMap.get(s) ?? [],
    });
  }

  return {
    slots,
    maxCreditsPerSemester: 18,
    overloadLimit: 21,
  };
}
