import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireAdminAuth } from '../middleware/admin-auth';

export const adminContentRouter = Router();

// Apply admin authentication to all content module routes
adminContentRouter.use(requireAdminAuth);

// ── Module Metadata & Table Mappings ──────────────────────────────────────────

export type ContentModuleKey = 'fyp' | 'professors' | 'career' | 'chatbot' | 'imports';

interface ModuleConfig {
  resource: string;
  defaultTable: string;
  allowedTables: string[];
  departmentScoped: boolean;
}

const MODULE_CONFIGS: Record<ContentModuleKey, ModuleConfig> = {
  fyp: {
    resource: 'fyp',
    defaultTable: 'fyp_projects',
    allowedTables: ['fyp_projects', 'companies', 'fyp_company_interest'],
    departmentScoped: false, // FYP records are university-wide or department-tagged
  },
  professors: {
    resource: 'professors',
    defaultTable: 'professors',
    allowedTables: ['professors'],
    departmentScoped: true,
  },
  career: {
    resource: 'career',
    defaultTable: 'career_tracks',
    allowedTables: ['career_tracks', 'roadmap_steps', 'articles', 'repositories'],
    departmentScoped: false,
  },
  chatbot: {
    resource: 'chatbot_content',
    defaultTable: 'chatbot_answers',
    allowedTables: ['chatbot_answers', 'chatbot_unanswered'],
    departmentScoped: true,
  },
  imports: {
    resource: 'data_imports',
    defaultTable: 'fyp_projects',
    allowedTables: ['fyp_projects'],
    departmentScoped: false,
  },
};

// ── Impact Classifier (Section 2.3) ───────────────────────────────────────────

export function classifyImpact(
  action: 'insert' | 'update' | 'delete',
  targetTable: string,
  afterState: Record<string, any>
): 'minor' | 'major' {
  if (action === 'delete') return 'major';

  // Major: Department reassignment or structural changes
  if (afterState.department_id !== undefined && action === 'update') return 'major';
  if (targetTable === 'curriculum_courses' || targetTable === 'prerequisite_rules') return 'major';

  // Content edits (text, titles, links, FAQs, outcomes) are minor
  return 'minor';
}

// ── Validation Schemas ────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
  table: z.string().optional(),
  status: z.string().optional(),
});

const DraftActionSchema = z.object({
  action: z.enum(['insert', 'update', 'delete']),
  targetTable: z.string().min(1),
  recordId: z.string().uuid().optional(),
  changeSetId: z.string().uuid().optional(),
  title: z.string().min(3).max(120).optional(),
  after: z.record(z.any()).optional().default({}),
});

// ── Middleware: Module Entitlement Check ───────────────────────────────────────

function checkModuleEntitlement(req: Request, res: Response, moduleKey: ContentModuleKey): boolean {
  const admin = req.adminUser!;

  // VC has unrestricted access to all modules
  if (admin.role === 'vc') return true;

  // Chairman has access to all content modules within their department
  if (admin.role === 'chairman') return true;

  // Operator MUST have the module in their allowed_modules array
  if (admin.role === 'operator') {
    const allowed = admin.allowedModules || [];
    // 'chatbot' maps to 'chatbot_content' or 'chatbot', 'career' maps to 'career', etc.
    const hasModule = allowed.includes(moduleKey) || allowed.includes(MODULE_CONFIGS[moduleKey]?.resource);
    if (!hasModule) {
      res.status(403).json(
        apiError('FORBIDDEN', `Operator access denied. Module '${moduleKey}' is not in your allowed_modules.`, [
          { field: 'allowed_modules', message: `Current allowed modules: [${allowed.join(', ')}]` },
        ])
      );
      return false;
    }
    return true;
  }

  res.status(403).json(apiError('FORBIDDEN', 'Access denied.'));
  return false;
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/content/imports/queue
 * List unreviewed extracted records across data pipelines.
 * Enforces Rule 2 (Review status: extracted -> approved -> published).
 */
adminContentRouter.get('/imports/queue', async (req: Request, res: Response) => {
  if (!checkModuleEntitlement(req, res, 'imports')) return;

  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors));
    return;
  }

  const { page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, count, error } = await supabaseAdmin
      .from('fyp_projects')
      .select('id, title, year, supervisor, domain_tags, proposal_outcome, review_status, source_file, created_at', { count: 'exact' })
      .eq('review_status', 'extracted')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({
      queue: data || [],
      meta: {
        page,
        pageSize,
        total: count ?? (data?.length || 0),
        status: 'extracted',
      },
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching extraction queue'));
  }
});

/**
 * POST /api/v1/admin/content/imports/:id/stage
 * Allows operators to verify/edit an extracted record and stage it into a draft change set.
 * GOLDEN RULE 1: Live table is NEVER directly mutated.
 */
adminContentRouter.post('/imports/:id/stage', async (req: Request, res: Response) => {
  if (!checkModuleEntitlement(req, res, 'imports')) return;

  const recordId = req.params.id;
  const admin = req.adminUser!;

  try {
    const { data: currentRecord, error } = await supabaseAdmin
      .from('fyp_projects')
      .select('*')
      .eq('id', recordId)
      .single();

    if (error || !currentRecord) {
      res.status(404).json(apiError('NOT_FOUND', `Extracted record '${recordId}' not found`));
      return;
    }

    const updates = req.body || {};
    const afterState = {
      ...currentRecord,
      ...updates,
      review_status: 'approved',
    };

    // Find or create a draft change set
    let targetChangeSetId = req.body?.changeSetId;
    if (!targetChangeSetId) {
      const { data: newCs, error: csError } = await supabaseAdmin
        .from('change_sets')
        .insert({
          resource: 'data_imports',
          title: `Approve extracted FYP record: ${afterState.title?.slice(0, 50)}`,
          status: 'draft',
          impact: 'minor',
          created_by: admin.adminId,
          department_id: admin.departmentId,
        })
        .select('id, title, status, impact')
        .single();

      if (csError || !newCs) {
        res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create change set for import review'));
        return;
      }
      targetChangeSetId = newCs.id;
    }

    // Insert change item
    const { data: changeItem, error: itemError } = await supabaseAdmin
      .from('change_items')
      .insert({
        change_set_id: targetChangeSetId,
        table_name: 'fyp_projects',
        record_id: recordId,
        op: 'update',
        before: currentRecord,
        after: afterState,
      })
      .select('id, change_set_id, table_name, record_id, op, created_at')
      .single();

    if (itemError) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to stage import review change item', [
        { field: 'change_items', message: itemError.message },
      ]));
      return;
    }

    res.status(201).json({
      message: 'Extracted record staged for review. Live table untouched.',
      changeSetId: targetChangeSetId,
      changeItem,
      notice: 'Submit change set for Chairman approval to finalize publishing.',
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error staging imported record'));
  }
});

/**
 * GET /api/v1/admin/content/:module
 * Read paginated live content records for a given module.
 * Never exposes individual student records or PII (Section 12).
 */
adminContentRouter.get('/:module', async (req: Request, res: Response) => {
  const moduleParam = req.params.module as ContentModuleKey;
  const config = MODULE_CONFIGS[moduleParam];

  if (!config) {
    res.status(404).json(apiError('NOT_FOUND', `Unknown content module '${req.params.module}'`));
    return;
  }

  if (!checkModuleEntitlement(req, res, moduleParam)) return;

  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parsed.error.errors));
    return;
  }

  const { page, pageSize, search, table: reqTable, status } = parsed.data;
  const targetTable = (reqTable && config.allowedTables.includes(reqTable)) ? reqTable : config.defaultTable;

  const admin = req.adminUser!;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabaseAdmin.from(targetTable).select('*', { count: 'exact' });

    // Scoping by department if table has department_id
    if (config.departmentScoped && admin.role !== 'vc' && admin.departmentId) {
      query = query.eq('department_id', admin.departmentId);
    }

    // Status filter if present
    if (status) {
      if (targetTable === 'fyp_projects') {
        query = query.eq('review_status', status);
      }
    }

    // Search filter if present
    if (search) {
      if (targetTable === 'fyp_projects') {
        query = query.ilike('title', `%${search}%`);
      } else if (targetTable === 'professors') {
        query = query.ilike('name', `%${search}%`);
      } else if (targetTable === 'career_tracks') {
        query = query.ilike('title', `%${search}%`);
      } else if (targetTable === 'chatbot_answers') {
        query = query.ilike('question_canonical', `%${search}%`);
      }
    }

    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({
      data: data || [],
      meta: {
        module: moduleParam,
        table: targetTable,
        page,
        pageSize,
        total: count ?? (data?.length || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching content records'));
  }
});

/**
 * GET /api/v1/admin/content/:module/:id
 * Retrieve a single record along with any pending draft change_items against it.
 */
adminContentRouter.get('/:module/:id', async (req: Request, res: Response) => {
  const moduleParam = req.params.module as ContentModuleKey;
  const config = MODULE_CONFIGS[moduleParam];
  const recordId = req.params.id;

  if (!config) {
    res.status(404).json(apiError('NOT_FOUND', `Unknown content module '${req.params.module}'`));
    return;
  }

  if (!checkModuleEntitlement(req, res, moduleParam)) return;

  const targetTable = (req.query.table as string) || config.defaultTable;
  if (!config.allowedTables.includes(targetTable)) {
    res.status(400).json(apiError('VALIDATION_ERROR', `Table '${targetTable}' is not allowed for module '${moduleParam}'`));
    return;
  }

  try {
    const { data: record, error } = await supabaseAdmin
      .from(targetTable)
      .select('*')
      .eq('id', recordId)
      .single();

    if (error || !record) {
      res.status(404).json(apiError('NOT_FOUND', `Record '${recordId}' not found in '${targetTable}'`));
      return;
    }

    // Check for pending draft changes against this record
    const { data: pendingItems } = await supabaseAdmin
      .from('change_items')
      .select('id, change_set_id, op, before, after, created_at')
      .eq('table_name', targetTable)
      .eq('record_id', recordId);

    res.json({
      data: record,
      pendingDrafts: pendingItems || [],
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Error fetching record'));
  }
});

/**
 * POST /api/v1/admin/content/:module/draft
 * Stages an insert, update, or delete into a draft change set.
 * GOLDEN RULE 1: NEVER writes directly to the live table!
 */
adminContentRouter.post('/:module/draft', async (req: Request, res: Response) => {
  const moduleParam = req.params.module as ContentModuleKey;
  const config = MODULE_CONFIGS[moduleParam];

  if (!config) {
    res.status(404).json(apiError('NOT_FOUND', `Unknown content module '${req.params.module}'`));
    return;
  }

  if (!checkModuleEntitlement(req, res, moduleParam)) return;

  const parsed = DraftActionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid draft payload', parsed.error.errors));
    return;
  }

  const { action, targetTable, recordId, changeSetId, title, after } = parsed.data;

  if (!config.allowedTables.includes(targetTable)) {
    res.status(400).json(apiError('VALIDATION_ERROR', `Table '${targetTable}' is not authorized for module '${moduleParam}'`));
    return;
  }

  if ((action === 'update' || action === 'delete') && !recordId) {
    res.status(400).json(apiError('VALIDATION_ERROR', `recordId is required for action '${action}'`));
    return;
  }

  const admin = req.adminUser!;
  let beforeState: Record<string, any> | null = null;

  try {
    // 1. Fetch current live state if updating or deleting
    if (action === 'update' || action === 'delete') {
      const { data: currentRecord, error } = await supabaseAdmin
        .from(targetTable)
        .select('*')
        .eq('id', recordId)
        .single();

      if (error || !currentRecord) {
        res.status(404).json(apiError('NOT_FOUND', `Target live record '${recordId}' does not exist in '${targetTable}'`));
        return;
      }
      beforeState = currentRecord;
    }

    // 2. Classify impact
    const impact = classifyImpact(action, targetTable, after);

    // 3. Find or create a draft change set
    let targetChangeSetId = changeSetId;
    if (!targetChangeSetId) {
      const defaultTitle = title || `Draft ${action} on ${targetTable} by ${admin.email}`;
      const { data: newChangeSet, error: csError } = await supabaseAdmin
        .from('change_sets')
        .insert({
          resource: config.resource,
          title: defaultTitle,
          status: 'draft',
          impact,
          created_by: admin.adminId,
          department_id: admin.departmentId,
        })
        .select('id, title, status, impact')
        .single();

      if (csError || !newChangeSet) {
        res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to create draft change set', [
          { field: 'change_sets', message: csError?.message || 'DB error' },
        ]));
        return;
      }
      targetChangeSetId = newChangeSet.id;
    } else {
      // Validate existing change set belongs to caller and is in draft state
      const { data: existingCs, error: checkError } = await supabaseAdmin
        .from('change_sets')
        .select('id, status, created_by, impact')
        .eq('id', targetChangeSetId)
        .single();

      if (checkError || !existingCs) {
        res.status(404).json(apiError('NOT_FOUND', `Change set '${targetChangeSetId}' not found`));
        return;
      }

      if (existingCs.status !== 'draft') {
        res.status(409).json(apiError('CONFLICT', `Cannot append to change set in '${existingCs.status}' status`));
        return;
      }

      // If new item is major, escalate change set to major
      if (impact === 'major' && existingCs.impact !== 'major') {
        await supabaseAdmin.from('change_sets').update({ impact: 'major' }).eq('id', targetChangeSetId);
      }
    }

    // 4. Insert change item into draft change set
    const { data: changeItem, error: itemError } = await supabaseAdmin
      .from('change_items')
      .insert({
        change_set_id: targetChangeSetId,
        table_name: targetTable,
        record_id: recordId || null,
        op: action,
        before: beforeState,
        after: action === 'delete' ? null : after,
      })
      .select('id, change_set_id, table_name, record_id, op, created_at')
      .single();

    if (itemError) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to stage change item', [
        { field: 'change_items', message: itemError.message },
      ]));
      return;
    }

    res.status(201).json({
      message: 'Draft change staged successfully. Live tables unchanged.',
      changeSetId: targetChangeSetId,
      changeItem,
      impact,
      notice: admin.role === 'operator'
        ? 'As an operator, you must submit this change set for Chairman approval before it can go live.'
        : 'Review your change set and submit or approve when ready.',
    });
  } catch (err: any) {
    res.status(500).json(apiError('INTERNAL_ERROR', err.message || 'Unexpected error staging draft change'));
  }
});
