import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/auth';

export const adminRouter = Router();

// All admin routes require 'admin' role (Rule #2)
adminRouter.use(requireRole('admin'));

// ─── Schemas ──────────────────────────────────────────────────────────────────

const ReviewStatusSchema = z.enum(['extracted', 'approved', 'published', 'rejected']);

const ListQuerySchema = z.object({
  status: ReviewStatusSchema.optional().default('extracted'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

const BulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['approve', 'publish', 'reject', 'reset']),
  note: z.string().max(500).optional(),
});

const PatchRecordSchema = z.object({
  review_status: ReviewStatusSchema.optional(),
  title: z.string().min(3).max(300).optional(),
  supervisor: z.string().min(2).max(200).optional(),
  domain_tags: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  proposal_outcome: z.enum(['accepted', 'rejected', 'unknown']).optional(),
  outcome_reason: z.string().max(500).nullable().optional(),
  review_note: z.string().max(500).nullable().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusFromAction(action: string): string {
  switch (action) {
    case 'approve':  return 'approved';
    case 'publish':  return 'published';
    case 'reject':   return 'rejected';
    case 'reset':    return 'extracted';
    default:         return 'extracted';
  }
}

async function writeAuditLog(
  adminId: string,
  action: string,
  targetIds: string[],
  meta: Record<string, unknown> = {}
): Promise<void> {
  await supabaseAdmin.from('audit_log').insert({
    actor_id: adminId,
    action,
    target_table: 'fyp_projects',
    target_ids: targetIds,
    meta,
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/fyp
 * List FYP records by review status — for the Admin review queue.
 */
adminRouter.get('/fyp', async (req: Request, res: Response) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query params', parsed.error.errors));
    return;
  }
  const { status, page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await supabaseAdmin
    .from('fyp_projects')
    .select('id, title, year, supervisor, domain_tags, proposal_outcome, review_status, source_file, created_at, review_note', { count: 'exact' })
    .eq('review_status', status)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.json({
    data,
    meta: { total: count ?? 0, page, pageSize, status },
  });
});

/**
 * GET /api/v1/admin/fyp/stats
 * Quick count per review_status for the dashboard header.
 */
adminRouter.get('/fyp/stats', async (_req: Request, res: Response) => {
  const statuses = ['extracted', 'approved', 'published', 'rejected'] as const;
  const counts: Record<string, number> = {};

  for (const s of statuses) {
    const { count } = await supabaseAdmin
      .from('fyp_projects')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', s);
    counts[s] = count ?? 0;
  }

  res.json({ data: counts });
});

/**
 * PATCH /api/v1/admin/fyp/:id
 * Edit a single FYP record (correct domain tags, title, etc.).
 */
adminRouter.patch('/fyp/:id', async (req: Request, res: Response) => {
  const parsed = PatchRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid update payload', parsed.error.errors));
    return;
  }

  const id = req.params.id as string;
  const adminId = req.user!.id;

  const { data, error } = await supabaseAdmin
    .from('fyp_projects')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, title, review_status')
    .single();

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  await writeAuditLog(adminId, 'admin.fyp.patch', [id], { fields: Object.keys(parsed.data) });
  res.json({ data });
});

/**
 * POST /api/v1/admin/fyp/bulk
 * Bulk approve / publish / reject / reset FYP records.
 * Rule #8: Failure simulation never touches real records.
 */
adminRouter.post('/fyp/bulk', async (req: Request, res: Response) => {
  const parsed = BulkActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid bulk action payload', parsed.error.errors));
    return;
  }

  const { ids, action, note } = parsed.data;
  const adminId = req.user!.id;
  const newStatus = statusFromAction(action);

  const updatePayload: Record<string, unknown> = {
    review_status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (note) updatePayload.review_note = note;

  const { data, error } = await supabaseAdmin
    .from('fyp_projects')
    .update(updatePayload)
    .in('id', ids)
    .select('id, title, review_status');

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  await writeAuditLog(adminId, `admin.fyp.bulk_${action}`, ids, { note, newStatus });

  res.json({
    data: { updated: data?.length ?? 0, action, newStatus },
  });
});

/**
 * GET /api/v1/admin/audit
 * Paginated audit log — admin-only.
 */
adminRouter.get('/audit', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
  const from = (page - 1) * pageSize;

  const { data, count, error } = await supabaseAdmin
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.json({ data, meta: { total: count ?? 0, page, pageSize } });
});

/**
 * GET /api/v1/admin/deletion-requests
 * List pending account deletion requests.
 */
adminRouter.get('/deletion-requests', async (_req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from('deletion_requests')
    .select('id, user_id, reason, created_at, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.json({ data });
});

/**
 * POST /api/v1/admin/deletion-requests/:id/complete
 * Mark a deletion request complete and delete the user's data.
 */
adminRouter.post('/deletion-requests/:id/complete', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const adminId = req.user!.id;

  // Fetch the request
  const { data: reqData, error: reqErr } = await supabaseAdmin
    .from('deletion_requests')
    .select('id, user_id, status')
    .eq('id', id)
    .single();

  if (reqErr || !reqData) {
    res.status(404).json(apiError('NOT_FOUND', 'Deletion request not found'));
    return;
  }
  if (reqData.status !== 'pending') {
    res.status(409).json(apiError('CONFLICT', 'Request already processed'));
    return;
  }

  const userId = reqData.user_id;

  // 1. Delete user profile & data (cascade deletes via FK)
  await supabaseAdmin.from('profiles').delete().eq('id', userId);
  await supabaseAdmin.from('fyp_shortlists').delete().eq('user_id', userId);
  await supabaseAdmin.from('roadmap_progress').delete().eq('user_id', userId);

  // 2. Mark request complete
  await supabaseAdmin
    .from('deletion_requests')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);

  // 3. Audit log (anonymised — just the request ID, not the user ID in logs)
  await writeAuditLog(adminId, 'admin.account.deleted', [id], { note: 'User-requested deletion' });

  res.json({ data: { message: 'User data deleted successfully', requestId: id } });
});
