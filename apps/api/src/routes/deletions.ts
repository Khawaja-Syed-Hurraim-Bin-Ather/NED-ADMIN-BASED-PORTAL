import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth, requireStepUp } from '../middleware/admin-auth';

export const deletionsRouter = Router();

// Require admin authentication for all deletion lifecycle routes
deletionsRouter.use(requireAdminAuth);

// ── Cooling-Off Duration Helpers (Section 5 & Section 16 Decision 3) ──────────

export function getCoolingOffDays(resource: string): number {
  switch (resource) {
    case 'career':
    case 'chatbot':
    case 'chatbot_content':
      return 7;
    case 'fyp':
    case 'professors':
      return 14;
    case 'curriculum':
      return 30;
    case 'curriculum_version':
    case 'curriculum_versions':
      return 90;
    default:
      return 14;
  }
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const CreateDeletionSchema = z.object({
  tableName: z.string().min(1),
  recordId: z.string().uuid(),
  resource: z.enum(['fyp', 'professors', 'career', 'chatbot_content', 'curriculum', 'curriculum_version']),
  reason: z.string().min(5, 'A clear justification is required for deletion').max(500),
  departmentId: z.string().uuid().optional(),
});

const ListDeletionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  state: z.string().optional(),
  departmentId: z.string().uuid().optional(),
});

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/admin/deletions
 * Stages a soft deletion into deletion_schedule and immediately hides the item.
 * Golden Rule 3: Deleting is slow on purpose (request, approval, cooling-off, purge).
 */
deletionsRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateDeletionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid deletion request', parsed.error.errors));
    return;
  }

  const { tableName, recordId, resource, reason, departmentId } = parsed.data;
  const admin = req.adminUser!;
  const targetDept = departmentId || admin.departmentId;

  if (!targetDept && admin.role !== 'vc') {
    res.status(400).json(apiError('VALIDATION_ERROR', 'departmentId is required for deletion'));
    return;
  }

  // Operator check: Operators request deletion (needs approval); Chairman & VC place directly into cooling_off
  const isOperator = admin.role === 'operator';
  const initialState = isOperator ? 'requested' : 'cooling_off';

  const coolingOffDays = getCoolingOffDays(resource);
  const now = new Date();
  const coolingOffUntil = new Date(now.getTime() + coolingOffDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    // 1. Soft-delete immediately to hide the item from students
    await supabaseAdmin
      .from(tableName)
      .update({ deleted_at: now.toISOString() })
      .eq('id', recordId);

    // 2. Insert into deletion_schedule
    const { data: scheduleEntry, error: insertErr } = await supabaseAdmin
      .from('deletion_schedule')
      .insert({
        table_name: tableName,
        record_id: recordId,
        department_id: targetDept,
        resource,
        requested_by: admin.adminId,
        approved_by: isOperator ? null : admin.adminId,
        state: initialState,
        cooling_off_days: coolingOffDays,
        cooling_off_until: coolingOffUntil,
        reason,
      })
      .select('*')
      .single();

    if (insertErr || !scheduleEntry) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create deletion schedule entry', [
        { field: 'deletion_schedule', message: insertErr?.message || 'DB error' },
      ]));
      return;
    }

    res.status(201).json({
      message: isOperator
        ? 'Deletion request submitted for Chairman approval.'
        : `Soft deletion scheduled with a ${coolingOffDays}-day cooling-off period. Item hidden from students.`,
      deletion: scheduleEntry,
      coolingOffDays,
      coolingOffUntil,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error processing deletion request'));
  }
});

/**
 * GET /api/v1/admin/deletions
 * Lists scheduled deletions with countdowns and status filters (Section 13).
 */
deletionsRouter.get('/', async (req: Request, res: Response) => {
  const parsed = ListDeletionsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors));
    return;
  }

  const { page, pageSize, state, departmentId } = parsed.data;
  const admin = req.adminUser!;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabaseAdmin
      .from('deletion_schedule')
      .select('*', { count: 'exact' });

    if (admin.role !== 'vc') {
      if (admin.departmentId) {
        query = query.eq('department_id', admin.departmentId);
      }
    } else if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    if (state) {
      query = query.eq('state', state);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    const now = Date.now();
    const enriched = (data || []).map((d) => {
      const until = d.cooling_off_until ? new Date(d.cooling_off_until).getTime() : now;
      const hoursRemaining = Math.max(0, Math.ceil((until - now) / (1000 * 60 * 60)));
      return {
        ...d,
        hoursRemaining,
        coolingOffElapsed: until <= now,
      };
    });

    res.json({
      data: enriched,
      meta: {
        page,
        pageSize,
        total: count ?? (data?.length || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error listing deletions'));
  }
});

/**
 * POST /api/v1/admin/deletions/:id/restore
 * Restores a soft-deleted item before purge (Section 5).
 */
deletionsRouter.post('/:id/restore', async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { id } = req.params;

  try {
    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('deletion_schedule')
      .select('*')
      .eq('id', id)
      .single();

    if (sErr || !schedule) {
      res.status(404).json(apiError('NOT_FOUND', `Deletion record '${id}' not found`));
      return;
    }

    if (schedule.state === 'purged') {
      res.status(409).json(apiError('CONFLICT', 'Record has already been permanently purged and cannot be restored.'));
      return;
    }

    // Department check
    if (admin.role !== 'vc' && admin.departmentId && schedule.department_id !== admin.departmentId) {
      res.status(403).json(apiError('FORBIDDEN', 'Cannot restore a record belonging to another department.'));
      return;
    }

    // 1. Clear deleted_at on live table
    await supabaseAdmin
      .from(schedule.table_name)
      .update({ deleted_at: null })
      .eq('id', schedule.record_id);

    // 2. Update state to 'restored'
    await supabaseAdmin
      .from('deletion_schedule')
      .update({ state: 'restored' })
      .eq('id', id);

    // 3. Log audit
    await supabaseAdmin.from('audit_log').insert({
      actor_id: admin.adminId,
      action: 'RESTORE_RECORD',
      target_table: schedule.table_name,
      target_ids: [schedule.record_id],
      meta: { deletion_id: id, restored_by: admin.email },
    });

    res.json({
      message: `Record '${schedule.record_id}' in '${schedule.table_name}' restored successfully.`,
      restored: true,
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error restoring record'));
  }
});

/**
 * POST /api/v1/admin/deletions/:id/purge
 * Final permanent physical purge (Section 5 & 14 Test 4).
 * Constraints:
 * - VC role only
 * - Fresh email code (step-up verified)
 * - Cooling-off period elapsed
 * - Max 5 purges per day rate cap
 */
deletionsRouter.post('/:id/purge', requireStepUp, async (req: Request, res: Response) => {
  const admin = req.adminUser!;
  const { id } = req.params;

  // 1. Role verification: VC only (Golden Rule 3 & Section 5)
  if (admin.role !== 'vc') {
    res.status(403).json(
      apiError('FORBIDDEN', 'Only the Vice Chancellor has the authority to permanently purge records.', [
        { field: 'role', message: 'Current role is not Vice Chancellor.' },
      ])
    );
    return;
  }

  try {
    const { data: schedule, error: sErr } = await supabaseAdmin
      .from('deletion_schedule')
      .select('*')
      .eq('id', id)
      .single();

    if (sErr || !schedule) {
      res.status(404).json(apiError('NOT_FOUND', `Deletion record '${id}' not found`));
      return;
    }

    if (schedule.state === 'purged') {
      res.status(409).json(apiError('CONFLICT', 'Record is already permanently purged.'));
      return;
    }

    // 2. Cooling-off period verification
    const now = new Date();
    if (schedule.cooling_off_until && new Date(schedule.cooling_off_until) > now) {
      res.status(400).json(
        apiError(
          'COOLING_OFF_NOT_ELAPSED',
          `Cooling-off period has not elapsed yet. Earliest permissible purge date is ${schedule.cooling_off_until}.`,
          [{ field: 'cooling_off_until', message: schedule.cooling_off_until }]
        )
      );
      return;
    }

    // 3. Daily purge rate cap check (Max 5 per 24h, Section 16 Decision 3)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: dailyPurgesCount } = await supabaseAdmin
      .from('deletion_schedule')
      .select('id', { count: 'exact' })
      .eq('state', 'purged')
      .gte('purged_at', twentyFourHoursAgo);

    if (dailyPurgesCount && dailyPurgesCount >= 5) {
      res.status(429).json(
        apiError(
          'PURGE_DAILY_LIMIT_EXCEEDED',
          'Daily institutional purge limit exceeded (maximum 5 purges allowed per 24-hour window).'
        )
      );
      return;
    }

    // 4. Physical deletion from table
    await supabaseAdmin
      .from(schedule.table_name)
      .delete()
      .eq('id', schedule.record_id);

    // 5. Update deletion_schedule record
    await supabaseAdmin
      .from('deletion_schedule')
      .update({
        state: 'purged',
        purged_by: admin.adminId,
        purged_at: now.toISOString(),
      })
      .eq('id', id);

    // 6. Write immutable tombstone to audit_log (Section 5)
    await supabaseAdmin.from('audit_log').insert({
      actor_id: admin.adminId,
      action: 'PURGE_RECORD',
      target_table: schedule.table_name,
      target_ids: [schedule.record_id],
      meta: {
        tombstone: true,
        record_id: schedule.record_id,
        table_name: schedule.table_name,
        purged_by: admin.email,
        reason: schedule.reason,
      },
    });

    res.json({
      message: `Record '${schedule.record_id}' in '${schedule.table_name}' has been permanently purged. Tombstone created in audit log.`,
      purged: true,
      recordId: schedule.record_id,
      purgedAt: now.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error executing final purge'));
  }
});
