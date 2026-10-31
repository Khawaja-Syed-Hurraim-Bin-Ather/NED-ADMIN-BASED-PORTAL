import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth, requireStepUp } from '../middleware/admin-auth';
import { generateApprovalMessage, ChangeDiffItem } from '../lib/diff-message-generator';
import { checkPermission, Resource } from '../lib/admin-permissions';

export const workflowRouter = Router();

// ── Validation Schemas ────────────────────────────────────────────────────────

const CreateChangeSetSchema = z.object({
  resource: z.enum([
    'curriculum',
    'fyp',
    'professors',
    'career',
    'chatbot_content',
    'data_imports',
    'chatbot_settings',
    'admin_accounts',
    'student_deletion_requests',
    'departments',
    'releases',
  ]),
  title: z.string().min(3).max(120),
  departmentId: z.string().uuid().optional(),
  impact: z.enum(['minor', 'major']).default('minor'),
  items: z
    .array(
      z.object({
        tableName: z.string().min(1),
        recordId: z.string().uuid().optional(),
        op: z.enum(['insert', 'update', 'delete', 'archive']),
        before: z.record(z.any()).optional().nullable(),
        after: z.record(z.any()).optional().nullable(),
      })
    )
    .min(1, 'At least one change item is required'),
});

const SubmitChangeSetSchema = z.object({
  reason: z.string().min(3, 'A clear reason is required for approval review'),
  sectionName: z.string().optional().default('General'),
});

const DecisionSchema = z.object({
  code: z.string().length(6, '6-digit approval code required'),
  note: z.string().optional(),
});

// ── Change Sets Endpoints ─────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/change-sets
 * Lists change sets scoped to caller's role and department.
 */
workflowRouter.get('/change-sets', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;
    let query = supabaseAdmin
      .from('change_sets')
      .select(`
        id,
        resource,
        title,
        status,
        impact,
        created_by,
        submitted_at,
        decided_by,
        decided_at,
        decision_note,
        created_at,
        department:departments(id, code, name),
        creator:admin_users!created_by(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false });

    // Scoping (Section 3)
    if (admin.role !== 'vc') {
      if (admin.departmentId) {
        query = query.eq('department_id', admin.departmentId);
      }
      if (admin.role === 'operator') {
        query = query.eq('created_by', admin.adminId);
      }
    }

    const { data: changeSets, error } = await query;
    if (error) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to retrieve change sets', [
        { field: 'change_sets', message: error.message },
      ]));
      return;
    }

    res.json({
      success: true,
      data: changeSets || [],
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error retrieving change sets', [
      { field: 'change_sets', message: (err as Error).message },
    ]));
  }
});

/**
 * POST /api/v1/admin/change-sets
 * Creates a new draft change set with its associated change items.
 */
workflowRouter.post('/change-sets', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;
    const parsed = CreateChangeSetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid change set payload', parsed.error.errors));
      return;
    }

    const { resource, title, impact, items } = parsed.data;
    const departmentId = admin.role === 'vc' ? (parsed.data.departmentId || admin.departmentId) : admin.departmentId;

    if (!departmentId) {
      res.status(400).json(apiError('VALIDATION_ERROR', 'Department ID is required for change sets.'));
      return;
    }

    // Permission check
    const perm = checkPermission(resource as Resource, 'draft', {
      role: admin.role,
      userDepartmentId: admin.departmentId,
      targetDepartmentId: departmentId,
      allowedModules: admin.allowedModules,
    });

    if (!perm.allowed) {
      res.status(403).json(apiError('FORBIDDEN', perm.reason || 'Not allowed to draft this resource'));
      return;
    }

    // Insert change set
    const { data: changeSet, error: csErr } = await supabaseAdmin
      .from('change_sets')
      .insert({
        department_id: departmentId,
        resource,
        title,
        status: 'draft',
        impact,
        created_by: admin.adminId,
      })
      .select('id, resource, title, status, impact, created_at')
      .single();

    if (csErr || !changeSet) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create change set', [
        { field: 'change_sets', message: csErr?.message || 'Insert failed' },
      ]));
      return;
    }

    // Insert change items
    const changeItemsPayload = items.map((i) => ({
      change_set_id: changeSet.id,
      table_name: i.tableName,
      record_id: i.recordId || null,
      op: i.op,
      before: i.before || null,
      after: i.after || null,
    }));

    const { error: itemsErr } = await supabaseAdmin.from('change_items').insert(changeItemsPayload);

    if (itemsErr) {
      // rollback draft
      await supabaseAdmin.from('change_sets').delete().eq('id', changeSet.id);
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to save change items', [
        { field: 'change_items', message: itemsErr.message },
      ]));
      return;
    }

    res.json({
      success: true,
      message: 'Draft change set created successfully.',
      data: {
        changeSet,
        totalItems: items.length,
      },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error creating change set', [
      { field: 'change_sets', message: (err as Error).message },
    ]));
  }
});

/**
 * POST /api/v1/admin/change-sets/:id/submit
 * Submits a draft change set for approval or self-publishes minor changes (Chairman).
 * Generates deterministic approval message and single-use 72-hour approval code.
 */
workflowRouter.post('/change-sets/:id/submit', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;
    const { id } = req.params;

    const parsed = SubmitChangeSetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(apiError('VALIDATION_ERROR', 'Reason is required to submit change set', parsed.error.errors));
      return;
    }

    const { reason, sectionName } = parsed.data;

    // Fetch change set and items
    const { data: cs, error: csErr } = await supabaseAdmin
      .from('change_sets')
      .select(`
        id,
        resource,
        title,
        status,
        impact,
        department_id,
        created_by,
        department:departments(id, code, name),
        creator:admin_users!created_by(id, full_name, role, email)
      `)
      .eq('id', id)
      .single();

    if (csErr || !cs) {
      res.status(404).json(apiError('NOT_FOUND', `Change set ${id} not found.`));
      return;
    }

    if (cs.status !== 'draft') {
      res.status(400).json(apiError('INVALID_STATE', `Only draft change sets can be submitted (current: ${cs.status})`));
      return;
    }

    if (cs.created_by !== admin.adminId && admin.role !== 'vc') {
      res.status(403).json(apiError('FORBIDDEN', 'Only the author may submit their change set.'));
      return;
    }

    // Load change items to construct diff
    const { data: items } = await supabaseAdmin
      .from('change_items')
      .select('*')
      .eq('change_set_id', id);

    const diffItems: ChangeDiffItem[] = (items || []).map((i) => ({
      recordName: i.table_name || 'Record',
      field: i.op === 'update' ? Object.keys(i.after || {})[0] : undefined,
      oldValue: i.before ? JSON.stringify(i.before).slice(0, 40) : null,
      newValue: i.after ? JSON.stringify(i.after).slice(0, 40) : null,
      op: i.op as any,
    }));

    // Routing Logic (Section 4.2)
    let approverRole: 'Chairman' | 'Vice Chancellor' = 'Chairman';
    let targetApprover: any = null;

    if (admin.role === 'operator') {
      // Operator always routes to their department chairman
      approverRole = 'Chairman';
      const { data: ch } = await supabaseAdmin
        .from('admin_users')
        .select('id, full_name, email, role')
        .eq('department_id', cs.department_id)
        .eq('role', 'chairman')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      targetApprover = ch;
    } else if (admin.role === 'chairman') {
      if (cs.impact === 'major' || cs.resource === 'curriculum') {
        approverRole = 'Vice Chancellor';
        const { data: vc } = await supabaseAdmin
          .from('admin_users')
          .select('id, full_name, email, role')
          .eq('role', 'vc')
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        targetApprover = vc;
      }
    }

    // Generate public ref e.g. CIS-2026-0042
    const deptCode = (cs.department as any)?.code || 'GEN';
    const year = new Date().getFullYear();
    const shortId = (Array.isArray(id) ? id[0] : id).slice(0, 4).toUpperCase();
    const publicRef = `${deptCode}-${year}-${shortId}`;

    // Generate single-use approval code (72 hour expiry)
    const rawCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

    const approverName = targetApprover?.full_name || (approverRole === 'Vice Chancellor' ? 'Vice Chancellor' : 'Department Chairman');
    const approverEmail = targetApprover?.email || (approverRole === 'Vice Chancellor' ? 'vc@nedut.edu.pk' : 'chairman.cis@nedut.edu.pk');

    const generatedMsg = generateApprovalMessage({
      publicRef,
      approverName,
      approverRole,
      approverEmail,
      requesterName: (cs.creator as any)?.full_name || 'EduCompass Admin',
      requesterRole: admin.role === 'operator' ? 'Data-entry operator' : 'Department Chairman',
      departmentName: (cs.department as any)?.name || 'CISE',
      moduleName: cs.resource,
      sectionName,
      diffItems,
      reason,
      impact: cs.impact === 'major' ? 'Major' : 'Minor',
      expiresAt: `${new Date(expiresAt).toLocaleDateString()} ${new Date(expiresAt).toLocaleTimeString()} PKT`,
      code: rawCode,
    });

    // Create approval_request
    const { data: approvalReq, error: appErr } = await supabaseAdmin
      .from('approval_requests')
      .insert({
        public_ref: publicRef,
        change_set_id: id,
        requested_by: admin.adminId,
        approver_role: approverRole === 'Vice Chancellor' ? 'vc' : 'chairman',
        approver_id: targetApprover?.id || null,
        message_text: generatedMsg,
        code_hash: codeHash,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, public_ref, status, expires_at')
      .single();

    if (appErr) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create approval request', [
        { field: 'approval_requests', message: appErr.message },
      ]));
      return;
    }

    // Update change_set status to 'submitted'
    await supabaseAdmin
      .from('change_sets')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', id);

    res.json({
      success: true,
      message: 'Change set submitted for institutional approval.',
      data: {
        approvalRequestId: approvalReq.id,
        publicRef,
        approverName,
        approverRole,
        approverEmail,
        messageText: generatedMsg,
        approvalCode: rawCode, // shown in UI pop-up for copy-to-clipboard
        expiresAt,
      },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error submitting change set', [
      { field: 'change_sets', message: (err as Error).message },
    ]));
  }
});

// ── Approvals Queue Endpoints ─────────────────────────────────────────────────

/**
 * GET /api/v1/admin/approvals
 * Lists pending approvals requiring caller's review.
 */
workflowRouter.get('/approvals', requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;

    let query = supabaseAdmin
      .from('approval_requests')
      .select(`
        id,
        public_ref,
        change_set_id,
        approver_role,
        message_text,
        status,
        expires_at,
        created_at,
        change_set:change_sets(
          id,
          title,
          resource,
          impact,
          department_id,
          department:departments(code, name)
        ),
        requester:admin_users!requested_by(
          id,
          full_name,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (admin.role === 'vc') {
      // VC sees all approvals routed to VC or all departments
      query = query.or(`approver_role.eq.vc,status.eq.pending`);
    } else if (admin.role === 'chairman') {
      // Chairman sees approvals for their department
      query = query.eq('approver_role', 'chairman');
    } else {
      // Operators see only their own requests
      query = query.eq('requested_by', admin.adminId);
    }

    const { data: approvals, error } = await query;

    if (error) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to retrieve approvals queue', [
        { field: 'approvals', message: error.message },
      ]));
      return;
    }

    res.json({
      success: true,
      data: approvals || [],
      total: approvals?.length || 0,
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error retrieving approvals', [
      { field: 'approvals', message: (err as Error).message },
    ]));
  }
});

/**
 * POST /api/v1/admin/approvals/:id/approve
 * Approves a change set with 6-digit approval code and fresh step-up token.
 * Triggers atomic apply_change_set() database transaction and cascade.
 */
workflowRouter.post('/approvals/:id/approve', requireAdminAuth, requireStepUp, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;
    const { id } = req.params;

    const parsed = DecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(apiError('VALIDATION_ERROR', 'Valid 6-digit approval code required', parsed.error.errors));
      return;
    }

    const { code, note } = parsed.data;
    const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');

    // Fetch approval request
    const { data: appReq, error: appErr } = await supabaseAdmin
      .from('approval_requests')
      .select('*, change_set:change_sets(*)')
      .eq('id', id)
      .single();

    if (appErr || !appReq) {
      res.status(404).json(apiError('NOT_FOUND', `Approval request ${id} not found.`));
      return;
    }

    if (appReq.status !== 'pending') {
      res.status(400).json(apiError('INVALID_STATE', `Approval is no longer pending (current: ${appReq.status})`));
      return;
    }

    // Expiry check
    if (new Date(appReq.expires_at) < new Date()) {
      await supabaseAdmin.from('approval_requests').update({ status: 'expired' }).eq('id', id);
      res.status(400).json(apiError('EXPIRED', 'Approval request has expired.'));
      return;
    }

    // Self-approval prevention (Golden Rule & Section 3)
    if (appReq.requested_by === admin.adminId) {
      res.status(403).json(apiError('FORBIDDEN', 'Self-approval is forbidden under university governance rules.'));
      return;
    }

    // Role authorization check
    if (appReq.approver_role === 'vc' && admin.role !== 'vc') {
      res.status(403).json(apiError('FORBIDDEN', 'This request requires Vice Chancellor approval.'));
      return;
    }

    // Verify approval code hash
    if (appReq.code_hash !== codeHash) {
      res.status(401).json(apiError('INVALID_CODE', 'Invalid 6-digit approval code.'));
      return;
    }

    // Update approval request to 'approved'
    await supabaseAdmin
      .from('approval_requests')
      .update({
        status: 'approved',
        approver_id: admin.adminId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Update change set to 'approved'
    await supabaseAdmin
      .from('change_sets')
      .update({
        status: 'approved',
        decided_by: admin.adminId,
        decided_at: new Date().toISOString(),
        decision_note: note || 'Approved by official governance review',
      })
      .eq('id', appReq.change_set_id);

    // Execute atomic apply_change_set stored procedure
    const { data: applyResult, error: applyErr } = await supabaseAdmin.rpc('apply_change_set', {
      p_change_set_id: appReq.change_set_id,
    });

    if (applyErr) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to publish approved change set to live tables', [
        { field: 'apply_change_set', message: applyErr.message },
      ]));
      return;
    }

    res.json({
      success: true,
      message: 'Approved and published to live tables successfully.',
      data: {
        changeSetId: appReq.change_set_id,
        applyResult,
      },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error during approval execution', [
      { field: 'approvals', message: (err as Error).message },
    ]));
  }
});

/**
 * POST /api/v1/admin/approvals/:id/reject
 * Rejects a change set with a mandatory reviewer note.
 */
workflowRouter.post('/approvals/:id/reject', requireAdminAuth, requireStepUp, async (req: Request, res: Response) => {
  try {
    const admin = req.adminUser!;
    const { id } = req.params;

    const { note } = req.body;
    if (!note || typeof note !== 'string' || note.trim().length < 5) {
      res.status(400).json(apiError('VALIDATION_ERROR', 'A rejection reason (at least 5 characters) is required.'));
      return;
    }

    const { data: appReq } = await supabaseAdmin
      .from('approval_requests')
      .select('change_set_id, requested_by, status')
      .eq('id', id)
      .single();

    if (!appReq || appReq.status !== 'pending') {
      res.status(400).json(apiError('INVALID_STATE', 'Approval is not pending.'));
      return;
    }

    if (appReq.requested_by === admin.adminId) {
      res.status(403).json(apiError('FORBIDDEN', 'You cannot reject your own request.'));
      return;
    }

    await supabaseAdmin
      .from('approval_requests')
      .update({
        status: 'rejected',
        approver_id: admin.adminId,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);

    await supabaseAdmin
      .from('change_sets')
      .update({
        status: 'rejected',
        decided_by: admin.adminId,
        decided_at: new Date().toISOString(),
        decision_note: note.trim(),
      })
      .eq('id', appReq.change_set_id);

    res.json({
      success: true,
      message: 'Change set rejected with institutional note.',
      data: { changeSetId: appReq.change_set_id, status: 'rejected' },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error rejecting change set', [
      { field: 'approvals', message: (err as Error).message },
    ]));
  }
});

