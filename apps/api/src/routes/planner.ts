import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import {
  validateSemesterPlan,
  generateDefaultSchedulePlan,
  StudentSchedulePlan,
} from '@educompass/engine';
import { buildDefaultCurriculumGraph } from './prereq';
import { requireRole } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

export const plannerRouter = Router();
const curriculumGraph = buildDefaultCurriculumGraph();

// ─── Input Validation Schemas ─────────────────────────────────────────────────

const SlotSchema = z.object({
  semesterNumber: z.number().int().min(1).max(12),
  courseCodes: z.array(z.string().trim()),
});

const ValidatePlanSchema = z.object({
  slots: z.array(SlotSchema).min(1, 'Provide at least one semester slot'),
  priorCompletedCourses: z.array(z.string().trim()).optional().default([]),
  maxCreditsPerSemester: z.number().int().min(12).max(25).optional().default(18),
  overloadLimit: z.number().int().min(18).max(30).optional().default(21),
});

const SavePlanSchema = z.object({
  planName: z.string().trim().max(100).optional().default('My Degree Plan'),
  targetGraduationTerm: z.string().trim().max(50).optional(),
  slots: z.array(SlotSchema).min(1, 'Provide at least one semester slot'),
  notes: z.string().trim().max(1000).optional(),
  maxCreditsPerSemester: z.number().int().min(12).max(25).optional().default(18),
});

// ─── 1. GET /template ─────────────────────────────────────────────────────────
// Returns default 8-semester schedule template from verified NED CISE curriculum

plannerRouter.get('/template', (_req: Request, res: Response) => {
  const defaultPlan = generateDefaultSchedulePlan(curriculumGraph);
  const validation = validateSemesterPlan(defaultPlan, curriculumGraph);

  const coursesList = Array.from(curriculumGraph.courses.values()).map((c) => ({
    code: c.code,
    title: c.title,
    credits: c.credits,
    theoryCredits: c.theoryCredits,
    practicalCredits: c.practicalCredits,
    semester: c.semester,
    category: c.category,
    isElective: c.isElective,
    electiveDomain: c.electiveDomain,
  }));

  res.json({
    program: 'BE Computer Systems Engineering (CISE), NED University',
    degreeTargetCredits: 136,
    defaultPlan,
    validation,
    courses: coursesList,
    disclaimer: 'Curriculum estimates based on NED CISE Scheme of Studies. Not an official university transcript.',
  });
});

// ─── 2. POST /validate ────────────────────────────────────────────────────────
// Validates a candidate multi-semester plan for prerequisite & workload constraints

plannerRouter.post('/validate', (req: Request, res: Response) => {
  const parseResult = ValidatePlanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      apiError('VALIDATION_ERROR', 'Invalid plan payload', parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })))
    );
    return;
  }

  const { slots, priorCompletedCourses, maxCreditsPerSemester, overloadLimit } = parseResult.data;

  const plan: StudentSchedulePlan = {
    slots,
    priorCompletedCourses,
    maxCreditsPerSemester,
    overloadLimit,
  };

  const validationResult = validateSemesterPlan(plan, curriculumGraph, 136);

  res.json({
    ...validationResult,
    disclaimer: 'Guidance estimate only. Registration is subject to official NED University prerequisite rules.',
  });
});

// ─── 3. GET /my-plan ──────────────────────────────────────────────────────────
// Retrieves the authenticated student's saved custom degree plan

plannerRouter.get('/my-plan', requireRole('enrolled'), async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('student_custom_plans')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    res.status(500).json(apiError('DATABASE_ERROR', 'Failed to retrieve saved plan'));
    return;
  }

  if (!data) {
    res.json({
      hasCustomPlan: false,
      plan: null,
      message: 'No custom plan saved yet. Use the default template to begin planning.',
    });
    return;
  }

  res.json({
    hasCustomPlan: true,
    plan: {
      id: data.id,
      planName: data.plan_name,
      targetGraduationTerm: data.target_graduation_term,
      maxCreditsPerSemester: data.max_credits_per_semester,
      slots: data.slots,
      notes: data.notes,
      isValid: data.is_valid,
      totalPlannedCredits: data.total_planned_credits,
      updatedAt: data.updated_at,
    },
    disclaimer: 'Guidance estimates only. Consult with your academic advisor before official enrollment.',
  });
});

// ─── 4. PUT /my-plan ──────────────────────────────────────────────────────────
// Upserts the authenticated student's custom degree plan

plannerRouter.put('/my-plan', requireRole('enrolled'), async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json(apiError('UNAUTHORIZED', 'Authentication required'));
    return;
  }

  const parseResult = SavePlanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json(
      apiError('VALIDATION_ERROR', 'Invalid plan payload', parseResult.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })))
    );
    return;
  }

  const { planName, targetGraduationTerm, slots, notes, maxCreditsPerSemester } = parseResult.data;

  // Validate the plan before saving
  const plan: StudentSchedulePlan = {
    slots,
    maxCreditsPerSemester,
  };
  const validation = validateSemesterPlan(plan, curriculumGraph, 136);

  const { data, error } = await supabaseAdmin
    .from('student_custom_plans')
    .upsert(
      {
        user_id: user.id,
        plan_name: planName,
        target_graduation_term: targetGraduationTerm ?? null,
        max_credits_per_semester: maxCreditsPerSemester,
        slots: slots,
        notes: notes ?? null,
        is_valid: validation.isValid,
        total_planned_credits: validation.totalCredits,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    res.status(500).json(apiError('DATABASE_ERROR', 'Failed to save student plan: ' + error.message));
    return;
  }

  res.json({
    success: true,
    message: 'Degree plan saved successfully',
    plan: {
      id: data.id,
      planName: data.plan_name,
      targetGraduationTerm: data.target_graduation_term,
      slots: data.slots,
      notes: data.notes,
      isValid: data.is_valid,
      totalPlannedCredits: data.total_planned_credits,
      updatedAt: data.updated_at,
    },
    validation,
    disclaimer: 'Guidance estimate only. Registration is subject to official NED University prerequisite rules.',
  });
});
