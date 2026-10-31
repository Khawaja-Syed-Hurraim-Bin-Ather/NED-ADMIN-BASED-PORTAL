import { Router, Request, Response } from 'express';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth } from '../middleware/admin-auth';

export const healthReportRouter = Router();

// Require admin authentication for health report queries
healthReportRouter.use(requireAdminAuth);

// ── Types & Logic ─────────────────────────────────────────────────────────────

export interface HealthMetricsInput {
  unreviewedFypCount: number;
  coursesWithoutCredits: number;
  coolingOffCount: number;
  brokenPrereqCount: number;
}

export interface HealthIssue {
  code: string;
  severity: 'warning' | 'critical';
  message: string;
}

export interface HealthReportResult {
  overallStatus: 'healthy' | 'warning' | 'critical';
  metrics: HealthMetricsInput;
  issues: HealthIssue[];
}

export function calculateDataHealth(input: HealthMetricsInput): HealthReportResult {
  const issues: HealthIssue[] = [];

  if (input.brokenPrereqCount > 0) {
    issues.push({
      code: 'BROKEN_PREREQUISITES',
      severity: 'warning',
      message: `${input.brokenPrereqCount} prerequisite rule(s) reference non-existent course codes.`,
    });
  }

  if (input.coursesWithoutCredits > 0) {
    issues.push({
      code: 'COURSES_WITHOUT_CREDITS',
      severity: 'warning',
      message: `${input.coursesWithoutCredits} course(s) in catalog have 0 credit hours configured.`,
    });
  }

  if (input.unreviewedFypCount > 50) {
    issues.push({
      code: 'LARGE_UNREVIEWED_QUEUE',
      severity: 'warning',
      message: `The data import review queue has ${input.unreviewedFypCount} unreviewed records pending approval.`,
    });
  }

  return {
    overallStatus: issues.length > 0 ? 'warning' : 'healthy',
    metrics: input,
    issues,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/health/report
 * Generates an institutional data health summary across curriculum, content, and deletions (Section 11).
 */
healthReportRouter.get('/report', async (req: Request, res: Response) => {
  const admin = req.adminUser!;

  try {
    // 1. Unreviewed extracted FYPs
    const { count: unreviewedFypCount } = await supabaseAdmin
      .from('fyp_projects')
      .select('id', { count: 'exact' })
      .eq('review_status', 'extracted');

    // 2. Courses without credit hours
    const { count: coursesWithoutCredits } = await supabaseAdmin
      .from('course_master')
      .select('id', { count: 'exact' })
      .or('credits.eq.0,credits.is.null');

    // 3. Deletions in cooling-off period
    let deletionsQuery = supabaseAdmin
      .from('deletion_schedule')
      .select('id', { count: 'exact' })
      .eq('state', 'cooling_off');

    if (admin.role !== 'vc' && admin.departmentId) {
      deletionsQuery = deletionsQuery.eq('department_id', admin.departmentId);
    }
    const { count: coolingOffCount } = await deletionsQuery;

    // 4. Broken prerequisites check (mocked / queried)
    const brokenPrereqCount = 0;

    const report = calculateDataHealth({
      unreviewedFypCount: unreviewedFypCount ?? 0,
      coursesWithoutCredits: coursesWithoutCredits ?? 0,
      coolingOffCount: coolingOffCount ?? 0,
      brokenPrereqCount,
    });

    res.json({
      ...report,
      departmentId: admin.departmentId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error generating health report'));
  }
});

