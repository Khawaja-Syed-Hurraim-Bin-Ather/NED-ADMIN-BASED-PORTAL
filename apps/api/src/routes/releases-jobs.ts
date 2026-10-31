import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth, requireStepUp } from '../middleware/admin-auth';
import { runPendingJobs, executePublishJob, PublishStep, PublishJobRecord } from '../lib/publish-cascade';

export const releasesJobsRouter = Router();

// Require admin authentication for all release and job operations
releasesJobsRouter.use(requireAdminAuth);

// ── Validation Schemas ────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.string().optional(),
  releaseId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

const RollbackSchema = z.object({
  reason: z.string().min(5, 'A clear reason is required for executing a rollback').max(500),
});

// ── Releases Routes ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/releases
 * List historical release snapshots (Section 13).
 */
releasesJobsRouter.get('/releases', async (req: Request, res: Response) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors));
    return;
  }

  const { page, pageSize, departmentId } = parsed.data;
  const admin = req.adminUser!;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabaseAdmin
      .from('releases')
      .select('id, tag, department_id, notes, created_by, created_at', { count: 'exact' });

    // Scoping
    if (admin.role !== 'vc') {
      if (admin.departmentId) {
        query = query.eq('department_id', admin.departmentId);
      }
    } else if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({
      data: data || [],
      meta: {
        page,
        pageSize,
        total: count ?? (data?.length || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching releases'));
  }
});

/**
 * GET /api/v1/admin/releases/:id
 * Retrieve a single release with its snapshot and cascade publish jobs.
 */
releasesJobsRouter.get('/releases/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: release, error: rErr } = await supabaseAdmin
      .from('releases')
      .select('*')
      .eq('id', id)
      .single();

    if (rErr || !release) {
      res.status(404).json(apiError('NOT_FOUND', `Release '${id}' not found`));
      return;
    }

    // Fetch jobs for this release
    const { data: jobs } = await supabaseAdmin
      .from('publish_jobs')
      .select('id, step, status, detail, created_at')
      .eq('release_id', id);

    res.json({
      release,
      jobs: jobs || [],
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching release detail'));
  }
});

/**
 * POST /api/v1/admin/releases/:id/rollback
 * Atomically rolls back to a previous release snapshot (Section 8).
 * Requires step-up challenge and VC role authorization.
 */
releasesJobsRouter.post('/releases/:id/rollback', requireStepUp, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { id } = req.params;

  // Authorization check (Section 8): Rollback needs VC role
  if (admin.role !== 'vc') {
    res.status(403).json(
      apiError('FORBIDDEN', 'Rollback requires Vice Chancellor authorization.', [
        { field: 'role', message: 'Current role is not Vice Chancellor.' },
      ])
    );
    return;
  }

  const parsed = RollbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'A valid rollback reason is required', parsed.error.errors));
    return;
  }

  const { reason } = parsed.data;

  try {
    // 1. Fetch target release to restore
    const { data: targetRelease, error: tErr } = await supabaseAdmin
      .from('releases')
      .select('*')
      .eq('id', id)
      .single();

    if (tErr || !targetRelease) {
      res.status(404).json(apiError('NOT_FOUND', `Target release '${id}' not found`));
      return;
    }

    // 2. Create a new rollback release record (Never edit history - Section 8)
    const shortRand = Math.random().toString(36).substring(2, 6);
    const rollbackTag = `rollback-${targetRelease.tag}-${shortRand}`;

    const { data: rollbackRelease, error: createErr } = await supabaseAdmin
      .from('releases')
      .insert({
        tag: rollbackTag,
        department_id: targetRelease.department_id,
        program_id: targetRelease.program_id,
        snapshot: targetRelease.snapshot,
        notes: `Rollback to ${targetRelease.tag}: ${reason}`,
        created_by: admin.adminId,
      })
      .select('*')
      .single();

    if (createErr || !rollbackRelease) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create rollback release record', [
        { field: 'releases', message: createErr?.message || 'DB error' },
      ]));
      return;
    }

    // 3. Enqueue steps 3 through 10 in publish_jobs
    const cascadeSteps: PublishStep[] = [
      'rebuild_graph',
      'recompute_scores',
      'refresh_caches',
      'reembed_chatbot',
      'faq_staleness',
      'career_links',
      'student_notice',
      'health_report',
    ];

    const jobsToInsert = cascadeSteps.map((step) => ({
      release_id: rollbackRelease.id,
      step,
      status: 'queued',
      detail: { enqueued_reason: `Rollback to ${targetRelease.tag}` },
    }));

    await supabaseAdmin.from('publish_jobs').insert(jobsToInsert);

    // 4. Trigger runner in background
    runPendingJobs(rollbackRelease.id).catch((err) => {
      console.error('Background cascade run error after rollback:', err);
    });

    res.json({
      message: `Rollback release created successfully as '${rollbackTag}'. Cascade steps 3-10 enqueued.`,
      rollbackRelease,
      enqueuedJobsCount: cascadeSteps.length,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error executing rollback'));
  }
});

// ── Publish Jobs Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/jobs
 * List cascade jobs with status and release filters (Section 13).
 */
releasesJobsRouter.get('/jobs', async (req: Request, res: Response) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors));
    return;
  }

  const { page, pageSize, status, releaseId } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabaseAdmin.from('publish_jobs').select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }
    if (releaseId) {
      query = query.eq('release_id', releaseId);
    }

    const { data, count, error } = await query
      .order('id', { ascending: false })
      .range(from, to);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({
      data: data || [],
      meta: {
        page,
        pageSize,
        total: count ?? (data?.length || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching jobs'));
  }
});

/**
 * POST /api/v1/admin/jobs/:id/retry
 * Re-runs a failed or queued cascade job step.
 */
releasesJobsRouter.post('/jobs/:id/retry', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const { data: job, error: jErr } = await supabaseAdmin
      .from('publish_jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (jErr || !job) {
      res.status(404).json(apiError('NOT_FOUND', `Publish job '${id}' not found`));
      return;
    }

    // Reset status to queued and execute
    const result = await executePublishJob({
      ...(job as PublishJobRecord),
      status: 'queued',
    });

    res.json({
      message: `Job '${id}' re-executed with status '${result.status}'`,
      result,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error retrying job'));
  }
});

/**
 * POST /api/v1/admin/jobs/run
 * Manually triggers processing of all pending queued jobs.
 */
releasesJobsRouter.post('/jobs/run', async (req: Request, res: Response) => {
  const releaseId = req.body?.releaseId as string | undefined;

  try {
    const summary = await runPendingJobs(releaseId);
    res.json({
      message: 'Pending jobs executed',
      summary,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error running pending jobs'));
  }
});

