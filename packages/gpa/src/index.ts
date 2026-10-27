/**
 * EduCompass GPA Calculator Engine (Card E4)
 * Pure TypeScript logic for NED University GPA, CGPA, academic standing, and what-if targets.
 * Reference: SRS 5.1.3 GPA Calculation Engine, NFR-02 Precision
 */

export const GPA_VERSION = '1.0.0';

// ── Official NED University Grading Scale ─────────────────────────────
export const GRADE_POINTS: Record<string, number> = {
  'A': 4.0,
  'A-': 3.7,
  'B+': 3.4,
  'B': 3.0,
  'B-': 2.7,
  'C+': 2.4,
  'C': 2.0,
  'C-': 1.7,
  'D+': 1.4,
  'D': 1.0,
  'F': 0.0,
};

export type ValidGrade = keyof typeof GRADE_POINTS;

/**
 * Converts a letter grade to its official numerical grade points.
 * Returns null for non-credit or withdrawal grades (e.g. W, I, P).
 */
export function gradeToPoints(grade: string): number | null {
  if (!grade) return null;
  const normalized = grade.trim().toUpperCase();
  return GRADE_POINTS[normalized] ?? null;
}

export interface CourseGradeInput {
  courseCode: string;
  credits: number;
  grade: string;
}

export interface SemesterGPA {
  gpa: number;
  attemptedCredits: number;
  earnedCredits: number;
  totalQualityPoints: number;
}

/**
 * Rounds a number to a fixed decimal precision without floating point drift.
 */
function roundTo(num: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
}

/**
 * Calculates semester GPA based on attempted credits and quality points.
 * Failed courses (F) are included in attempted credits (0 QP).
 * Withdrawn (W) or Incomplete (I) courses are excluded.
 */
export function calculateSemesterGPA(courses: CourseGradeInput[]): SemesterGPA {
  let attemptedCredits = 0;
  let earnedCredits = 0;
  let totalQualityPoints = 0;

  for (const course of courses) {
    if (course.credits <= 0) continue;
    const points = gradeToPoints(course.grade);
    if (points === null) continue; // W, I, or non-credit

    attemptedCredits += course.credits;
    if (points > 0) {
      earnedCredits += course.credits;
    }
    totalQualityPoints += course.credits * points;
  }

  const gpa =
    attemptedCredits > 0 ? roundTo(totalQualityPoints / attemptedCredits, 2) : 0.0;

  return {
    gpa,
    attemptedCredits,
    earnedCredits,
    totalQualityPoints: roundTo(totalQualityPoints, 2),
  };
}

export interface SemesterInput {
  semesterNumber: number;
  courses: CourseGradeInput[];
}

export interface CGPAOptions {
  retakePolicy?: 'highest' | 'latest';
}

export interface CGPAResult {
  cgpa: number;
  totalCredits: number;
  totalQualityPoints: number;
  coursesEvaluated: number;
}

/**
 * Computes cumulative GPA across all semesters.
 * Supports course retake replacement policies (highest or latest grade).
 */
export function calculateCGPA(
  semesters: SemesterInput[],
  options: CGPAOptions = { retakePolicy: 'highest' }
): CGPAResult {
  const courseMap = new Map<
    string,
    { credits: number; points: number; semesterNumber: number }
  >();

  // Sort semesters in chronological order
  const sorted = [...semesters].sort(
    (a, b) => a.semesterNumber - b.semesterNumber
  );

  for (const sem of sorted) {
    for (const course of sem.courses) {
      if (course.credits <= 0) continue;
      const points = gradeToPoints(course.grade);
      if (points === null) continue;

      const normCode = course.courseCode.trim().toLowerCase().replace(/[\s-]/g, '');
      const existing = courseMap.get(normCode);

      if (!existing) {
        courseMap.set(normCode, {
          credits: course.credits,
          points,
          semesterNumber: sem.semesterNumber,
        });
      } else {
        if (options.retakePolicy === 'latest') {
          courseMap.set(normCode, {
            credits: course.credits,
            points,
            semesterNumber: sem.semesterNumber,
          });
        } else {
          // 'highest'
          if (points > existing.points) {
            courseMap.set(normCode, {
              credits: course.credits,
              points,
              semesterNumber: sem.semesterNumber,
            });
          }
        }
      }
    }
  }

  let totalCredits = 0;
  let totalQualityPoints = 0;

  for (const record of courseMap.values()) {
    totalCredits += record.credits;
    totalQualityPoints += record.credits * record.points;
  }

  const cgpa =
    totalCredits > 0 ? roundTo(totalQualityPoints / totalCredits, 2) : 0.0;

  return {
    cgpa,
    totalCredits,
    totalQualityPoints: roundTo(totalQualityPoints, 2),
    coursesEvaluated: courseMap.size,
  };
}

export interface AcademicStanding {
  status:
    | 'deans_honor_list'
    | 'first_division'
    | 'good_standing'
    | 'academic_probation';
  label: string;
  isOnProbation: boolean;
}

/**
 * Determines academic standing and honors eligibility from CGPA.
 */
export function getAcademicStanding(cgpa: number): AcademicStanding {
  if (cgpa >= 3.7) {
    return {
      status: 'deans_honor_list',
      label: "Dean's Honor List",
      isOnProbation: false,
    };
  }
  if (cgpa >= 3.0) {
    return {
      status: 'first_division',
      label: 'Good Standing',
      isOnProbation: false,
    };
  }
  if (cgpa >= 2.0) {
    return {
      status: 'good_standing',
      label: 'Good Standing',
      isOnProbation: false,
    };
  }
  return {
    status: 'academic_probation',
    label: 'Academic Probation',
    isOnProbation: true,
  };
}

export interface WhatIfTargetInput {
  currentCGPA: number;
  completedCredits: number;
  targetCGPA: number;
  remainingCredits: number;
}

export interface WhatIfTargetResult {
  isFeasible: boolean;
  requiredGPA: number;
  maxPossibleCGPA: number;
  message: string;
}

/**
 * What-If Target CGPA Planner
 * Calculates the required GPA across remaining credit hours to achieve a target CGPA.
 */
export function calculateWhatIfTarget(
  input: WhatIfTargetInput
): WhatIfTargetResult {
  const { currentCGPA, completedCredits, targetCGPA, remainingCredits } = input;
  const totalCredits = completedCredits + remainingCredits;

  if (totalCredits <= 0 || remainingCredits <= 0) {
    return {
      isFeasible: currentCGPA >= targetCGPA,
      requiredGPA: 0.0,
      maxPossibleCGPA: roundTo(currentCGPA, 2),
      message: 'No remaining credits to adjust GPA.',
    };
  }

  const currentQP = completedCredits * currentCGPA;
  const targetQP = totalCredits * targetCGPA;
  const neededQP = targetQP - currentQP;
  const rawRequiredGPA = neededQP / remainingCredits;

  const maxQP = currentQP + remainingCredits * 4.0;
  const maxPossibleCGPA = roundTo(maxQP / totalCredits, 2);

  if (rawRequiredGPA > 4.0) {
    return {
      isFeasible: false,
      requiredGPA: roundTo(rawRequiredGPA, 2),
      maxPossibleCGPA,
      message: `Target unattainable. Requires a GPA of ${roundTo(
        rawRequiredGPA,
        2
      )} (maximum possible is ${maxPossibleCGPA.toFixed(2)} with straight A's).`,
    };
  }

  if (rawRequiredGPA <= 0) {
    return {
      isFeasible: true,
      requiredGPA: 0.0,
      maxPossibleCGPA,
      message: 'Target already achieved or exceeded.',
    };
  }

  const requiredGPA = roundTo(rawRequiredGPA, 2);
  return {
    isFeasible: true,
    requiredGPA,
    maxPossibleCGPA,
    message: `You need an average GPA of ${requiredGPA.toFixed(
      2
    )} over your remaining ${remainingCredits} credits.`,
  };
}

// ── Card E6 Transcript Parser ─────────────────────────────────────
export * from './parser';
