import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth } from '../middleware/admin-auth';

export const adminCurriculumRouter = Router();

// Institutional admin authentication required
adminCurriculumRouter.use(requireAdminAuth);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CurriculumCourseInput {
  courseId: string;
  code: string;
  semester: number;
  credits: number;
  ownerDepartmentId?: string;
}

export interface PrereqRuleInput {
  courseId: string;
  courseCode: string;
  prereqCourseCode: string;
  minGrade?: string;
}

export interface ValidationError {
  code: 'CIRCULAR_DEPENDENCY' | 'BACKWARD_PREREQUISITE' | 'CREDIT_LIMIT_EXCEEDED' | 'INVALID_GRADE_SCALE' | 'ORPHAN_PREREQUISITE';
  message: string;
  details?: Record<string, any>;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

export interface CurriculumValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface CurriculumValidationInput {
  courses: CurriculumCourseInput[];
  rules: PrereqRuleInput[];
  maxCreditsPerSemester: number;
  gradeScale: Record<string, number>;
  passingGrade: string;
}

// ── Validation Logic (Pure TypeScript, Section 14 Test 5) ─────────────────────

export function validateCurriculumDraft(input: CurriculumValidationInput): CurriculumValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const courseMap = new Map<string, CurriculumCourseInput>();
  const semesterCredits = new Map<number, number>();

  for (const course of input.courses) {
    courseMap.set(course.code, course);
    const currentSemCreds = semesterCredits.get(course.semester) || 0;
    semesterCredits.set(course.semester, currentSemCreds + course.credits);
  }

  // 1. Grade Scale Validation
  if (input.gradeScale && input.passingGrade) {
    if (!(input.passingGrade in input.gradeScale)) {
      errors.push({
        code: 'INVALID_GRADE_SCALE',
        message: `Passing grade '${input.passingGrade}' is not defined in the version grade scale.`,
      });
    }
  }

  // 2. Semester Credit Limits
  for (const [semester, credits] of semesterCredits.entries()) {
    if (credits > input.maxCreditsPerSemester) {
      errors.push({
        code: 'CREDIT_LIMIT_EXCEEDED',
        message: `Semester ${semester} has ${credits} credits, which exceeds the maximum limit of ${input.maxCreditsPerSemester} credits.`,
        details: { semester, credits, max: input.maxCreditsPerSemester },
      });
    }
  }

  // 3. Backward Prerequisite Check (prerequisite in later or same semester)
  for (const rule of input.rules) {
    const course = courseMap.get(rule.courseCode);
    const prereq = courseMap.get(rule.prereqCourseCode);

    if (course && prereq) {
      if (course.semester <= prereq.semester) {
        errors.push({
          code: 'BACKWARD_PREREQUISITE',
          message: `Course ${course.code} (Semester ${course.semester}) requires ${prereq.code} (Semester ${prereq.semester}). Prerequisites must be taken in an earlier semester.`,
          details: {
            course: course.code,
            courseSemester: course.semester,
            prereq: prereq.code,
            prereqSemester: prereq.semester,
          },
        });
      }
    } else if (!prereq) {
      warnings.push({
        code: 'EXTERNAL_OR_UNSCHEDULED_PREREQ',
        message: `Prerequisite ${rule.prereqCourseCode} for ${rule.courseCode} is not listed in this curriculum version.`,
      });
    }
  }

  // 4. Circular Dependency Detection (DFS Cycle Detection)
  // Dependency graph: prereq -> course (prereq must precede course)
  const adj = new Map<string, string[]>();
  for (const course of input.courses) {
    adj.set(course.code, []);
  }

  for (const rule of input.rules) {
    if (adj.has(rule.prereqCourseCode)) {
      adj.get(rule.prereqCourseCode)!.push(rule.courseCode);
    }
  }

  // Cycle detection: 0 = unvisited, 1 = visiting (on current stack), 2 = visited
  const visited = new Map<string, number>();
  let hasCycle = false;
  const cycleNodes: string[] = [];

  function dfs(node: string, path: string[]): boolean {
    visited.set(node, 1);
    path.push(node);

    const neighbors = adj.get(node) || [];
    for (const neighbor of neighbors) {
      const state = visited.get(neighbor) || 0;
      if (state === 1) {
        hasCycle = true;
        const cycleStartIndex = path.indexOf(neighbor);
        cycleNodes.push(...path.slice(cycleStartIndex), neighbor);
        return true;
      }
      if (state === 0) {
        if (dfs(neighbor, path)) return true;
      }
    }

    path.pop();
    visited.set(node, 2);
    return false;
  }

  for (const course of input.courses) {
    if ((visited.get(course.code) || 0) === 0) {
      if (dfs(course.code, [])) break;
    }
  }

  if (hasCycle) {
    errors.push({
      code: 'CIRCULAR_DEPENDENCY',
      message: `Circular prerequisite dependency detected: ${cycleNodes.join(' → ')}`,
      details: { cycle: cycleNodes },
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ── Middleware: Curriculum Access Protection ───────────────────────────────────

function requireCurriculumRole(req: Request, res: Response): boolean {
  const admin = req.adminUser;
  if (!admin) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Admin authentication required'));
    return false;
  }

  // Operators have NO access to curriculum (admin_permissions.json: curriculum -> operator: none)
  if (admin.role === 'operator') {
    res.status(403).json(
      apiError('FORBIDDEN', 'Operators do not have permission to manage curriculum versions or prerequisites.', [
        { field: 'role', message: 'Requires Department Chairman or Vice Chancellor role.' },
      ])
    );
    return false;
  }

  return true;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/curriculum/versions/:id/clone
 * Clones a published scheme into a new draft revision.
 */
adminCurriculumRouter.post('/versions/:id/clone', async (req: Request, res: Response) => {
  if (!requireCurriculumRole(req, res)) return;

  const { id } = req.params;
  const { name } = req.body || {};

  try {
    // 1. Fetch source version
    const { data: source, error: srcErr } = await supabaseAdmin
      .from('curriculum_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (srcErr || !source) {
      res.status(404).json(apiError('NOT_FOUND', `Curriculum version '${id}' not found`));
      return;
    }

    // 2. Fetch latest revision number for this program
    const { data: latest } = await supabaseAdmin
      .from('curriculum_versions')
      .select('revision')
      .eq('program_id', source.program_id)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRevision = ((latest as any)?.revision || source.revision || 1) + 1;
    const targetName = name || `${source.name} (Revision ${nextRevision})`;

    // 3. Create new draft version
    const { data: newVersion, error: createErr } = await supabaseAdmin
      .from('curriculum_versions')
      .insert({
        program_id: source.program_id,
        name: targetName,
        revision: nextRevision,
        status: 'draft',
        based_on: id,
        grade_scale: source.grade_scale,
        passing_grade: source.passing_grade,
        max_credits_per_semester: source.max_credits_per_semester,
        graduation_rules: source.graduation_rules,
        chart_layout: source.chart_layout,
      })
      .select('*')
      .single();

    if (createErr || !newVersion) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to clone curriculum version', [
        { field: 'curriculum_versions', message: createErr?.message || 'DB error' },
      ]));
      return;
    }

    // 4. Clone curriculum_courses
    const { data: courses } = await supabaseAdmin
      .from('curriculum_courses')
      .select('*')
      .eq('version_id', id);

    if (courses && courses.length > 0) {
      const clonedCourses = courses.map((c) => ({
        version_id: newVersion.id,
        course_id: c.course_id,
        semester: c.semester,
        credits: c.credits,
        theory_credits: c.theory_credits,
        practical_credits: c.practical_credits,
        category: c.category,
        is_elective: c.is_elective,
        elective_group_id: c.elective_group_id,
      }));

      await supabaseAdmin.from('curriculum_courses').insert(clonedCourses);
    }

    res.status(201).json({
      message: `Curriculum version cloned successfully as Revision ${nextRevision} (Draft)`,
      newVersion,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error cloning curriculum version'));
  }
});

/**
 * POST /api/v1/admin/curriculum/versions/:id/validate
 * Validates a curriculum draft for cycles, backward prereqs, and credit overload.
 */
adminCurriculumRouter.post('/versions/:id/validate', async (req: Request, res: Response) => {
  if (!requireCurriculumRole(req, res)) return;

  const { id } = req.params;

  try {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('curriculum_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (vErr || !version) {
      res.status(404).json(apiError('NOT_FOUND', `Curriculum version '${id}' not found`));
      return;
    }

    // Fetch courses with course_master codes
    const { data: courses } = await supabaseAdmin
      .from('curriculum_courses')
      .select(`
        course_id,
        semester,
        credits,
        course:course_master(id, code, title, owner_department_id)
      `)
      .eq('version_id', id);

    // Fetch prerequisite rules
    const { data: rules } = await supabaseAdmin
      .from('prerequisite_rules')
      .select(`
        course_id,
        course_code,
        prereq_course_code,
        min_grade
      `);

    const courseInputs: CurriculumCourseInput[] = (courses || []).map((c: any) => ({
      courseId: c.course_id,
      code: c.course?.code || 'UNKNOWN',
      semester: c.semester,
      credits: c.credits,
      ownerDepartmentId: c.course?.owner_department_id,
    }));

    const ruleInputs: PrereqRuleInput[] = (rules || []).map((r: any) => ({
      courseId: r.course_id,
      courseCode: r.course_code,
      prereqCourseCode: r.prereq_course_code,
      minGrade: r.min_grade,
    }));

    const result = validateCurriculumDraft({
      courses: courseInputs,
      rules: ruleInputs,
      maxCreditsPerSemester: version.max_credits_per_semester || 21,
      gradeScale: version.grade_scale || {},
      passingGrade: version.passing_grade || 'D',
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error validating curriculum'));
  }
});

/**
 * GET /api/v1/admin/curriculum/versions/:id/impact
 * Generates impact preview of a draft version compared to its base version.
 * Adheres to Section 12 (Aggregates only, zero student PII, small numbers suppressed).
 */
adminCurriculumRouter.get('/versions/:id/impact', async (req: Request, res: Response) => {
  if (!requireCurriculumRole(req, res)) return;

  const { id } = req.params;

  try {
    const { data: version, error: vErr } = await supabaseAdmin
      .from('curriculum_versions')
      .select('*')
      .eq('id', id)
      .single();

    if (vErr || !version) {
      res.status(404).json(apiError('NOT_FOUND', `Curriculum version '${id}' not found`));
      return;
    }

    const { data: currentCourses } = await supabaseAdmin
      .from('curriculum_courses')
      .select('course_id, semester, credits')
      .eq('version_id', id);

    let baseCourses: any[] = [];
    if (version.based_on) {
      const { data: bCourses } = await supabaseAdmin
        .from('curriculum_courses')
        .select('course_id, semester, credits')
        .eq('version_id', version.based_on);
      baseCourses = bCourses || [];
    }

    const currentMap = new Map((currentCourses || []).map((c) => [c.course_id, c]));
    const baseMap = new Map(baseCourses.map((c) => [c.course_id, c]));

    const added: string[] = [];
    const removed: string[] = [];
    const shifted: { courseId: string; fromSemester: number; toSemester: number }[] = [];

    for (const [courseId, c] of currentMap.entries()) {
      if (!baseMap.has(courseId)) {
        added.push(courseId);
      } else {
        const base = baseMap.get(courseId)!;
        if (base.semester !== c.semester) {
          shifted.push({ courseId, fromSemester: base.semester, toSemester: c.semester });
        }
      }
    }

    for (const [courseId] of baseMap.entries()) {
      if (!currentMap.has(courseId)) {
        removed.push(courseId);
      }
    }

    // Aggregate affected batches
    const { data: batches } = await supabaseAdmin
      .from('batches')
      .select('id, year, student_count')
      .eq('curriculum_version_id', version.based_on || id);

    const totalStudents = (batches || []).reduce((acc: number, b: any) => acc + (b.student_count || 0), 0);

    res.json({
      versionId: id,
      versionName: version.name,
      basedOn: version.based_on,
      diff: {
        coursesAddedCount: added.length,
        coursesRemovedCount: removed.length,
        coursesShiftedCount: shifted.length,
        shifted,
      },
      affectedBatches: (batches || []).map((b: any) => ({
        batchId: b.id,
        year: b.year,
        // Privacy: suppress small groups (<5)
        studentCountEstimate: b.student_count < 5 ? '<5' : b.student_count,
      })),
      totalEstimatedStudentsAffected: totalStudents < 5 ? '<5' : totalStudents,
      estimateNotice: 'Impact metrics are guidance estimates based on enrolled batch sizes (Rule 7).',
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error generating impact preview'));
  }
});

/**
 * GET /api/v1/admin/curriculum/equivalences
 * List course equivalences.
 */
adminCurriculumRouter.get('/equivalences', async (req: Request, res: Response) => {
  if (!requireCurriculumRole(req, res)) return;

  try {
    const { data, error } = await supabaseAdmin
      .from('course_equivalences')
      .select('*')
      .range(0, 99);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({ data: data || [] });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message));
  }
});
