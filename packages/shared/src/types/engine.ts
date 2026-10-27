// ── Engine contract (SRS 5.4) ──────────────────────────────────
// Pure TypeScript — no database, no network, no side effects.

export type Grade = string;

export type RuleNode =
  | { type: 'course'; courseId: string; minGrade?: Grade }
  | { type: 'and'; children: RuleNode[] }
  | { type: 'or'; children: RuleNode[] };

export type CourseCategory =
  | 'core_computing'
  | 'mathematics'
  | 'science'
  | 'general_education'
  | 'language'
  | 'fyp'
  | 'elective';

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  semester: number;
  category: CourseCategory;
  rule?: RuleNode;
  coreq?: string[];
}

export interface Program {
  id: string;
  name: string;
  courses: Course[];
  passingGrade: Grade;
  maxCreditsPerSemester: number;
  gradeScale: Record<Grade, number>;
}

export interface Attempt {
  courseId: string;
  grade?: Grade;
  status: 'completed' | 'in_progress' | 'failed' | 'not_taken';
  term?: string;
}

export interface Weights {
  downstream: number;  // default 40
  chainDepth: number;  // default 25
  coreStatus: number;  // default 20
  gatekeeping: number; // default 15
}

export const DEFAULT_WEIGHTS: Weights = {
  downstream: 40,
  chainDepth: 25,
  coreStatus: 20,
  gatekeeping: 15,
};

// Engine function signatures (implemented in packages/engine)
export interface EngineResult {
  eligible: boolean;
  missing: string[];
  explanation: string;
}

export interface BacklogItem {
  courseId: string;
  blocks: string[];
}

export interface LoadRecommendation {
  courses: string[];
  credits: number;
  reasons: Record<string, string>;
}

export interface SimulationResult {
  blocked: string[];
  delaySemesters: number;
  newGraduationSemester: number;
}

export interface ImportanceScore {
  score: number;
  breakdown: Record<string, number>;
}
