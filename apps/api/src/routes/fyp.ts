import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError, paginate } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { requireRole } from '../middleware/auth';
import { getEmbedding } from '../lib/llm-gateway';

export const fypRouter = Router();

const FypQuerySchema = z.object({
  query: z.string().optional(),
  year: z.coerce.number().int().min(2020).max(2030).optional(),
  domain: z.string().optional(),
  supervisor: z.string().optional(),
  outcome: z.enum(['accepted', 'rejected', 'unknown', 'all']).optional().default('all'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * GET /api/v1/fyp
 * Lists and searches FYDP records from public.fyp_projects.
 */
fypRouter.get('/', async (req: Request, res: Response) => {
  try {
    const parseResult = FypQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json(
        apiError('VALIDATION_ERROR', 'Invalid query parameters', parseResult.error.errors)
      );
      return;
    }

    const { query, year, domain, supervisor, outcome, page, pageSize } = parseResult.data;

    let dbQuery = supabaseAdmin.from('fyp_projects').select('*', { count: 'exact' });

    if (year) dbQuery = dbQuery.eq('year', year);
    if (outcome && outcome !== 'all') dbQuery = dbQuery.eq('proposal_outcome', outcome);
    if (supervisor) dbQuery = dbQuery.ilike('supervisor', `%${supervisor}%`);
    if (domain && domain !== 'all') dbQuery = dbQuery.contains('domain_tags', [domain]);
    if (query && query.trim()) dbQuery = dbQuery.ilike('title', `%${query.trim()}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    dbQuery = dbQuery.order('year', { ascending: false }).range(from, to);

    const { data: records, count, error } = await dbQuery;

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json(paginate(records ?? [], count ?? 0, page, pageSize));
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to query FYP records')
    );
  }
});

/**
 * GET /api/v1/fyp/user/shortlist
 * Returns current user's shortlisted projects.
 * IMPORTANT: Must be declared BEFORE /:id to avoid Express route collision.
 */
fypRouter.get('/user/shortlist', requireRole('enrolled', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: shortlists, error } = await supabaseAdmin
      .from('fyp_shortlists')
      .select('project_id, created_at, fyp_projects(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    res.json({ data: shortlists });
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to retrieve shortlist')
    );
  }
});

// ─── Card M1: Team Formation Board ───────────────────────────────────────────

const TeamIdeaSchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(20).max(1000),
  required_skills: z.array(z.string().trim()).max(10).default([]),
  domain_tags: z.array(z.string().trim()).max(5).default([]),
  team_size_wanted: z.number().int().min(1).max(6).default(3),
  contact_hint: z.string().trim().max(100).optional(),
});

/**
 * GET /api/v1/fyp/team-ideas
 * Lists open team formation posts. Public read.
 */
fypRouter.get('/team-ideas', async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Number(req.query.pageSize) || 20);

  const { data, count, error } = await supabaseAdmin
    .from('fyp_team_ideas')
    .select('*', { count: 'exact' })
    .eq('is_open', true)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.json(paginate(data ?? [], count ?? 0, page, pageSize));
});

/**
 * POST /api/v1/fyp/team-ideas
 * Enrolled student posts a new team formation idea.
 */
fypRouter.post('/team-ideas', requireRole('enrolled', 'admin'), async (req: Request, res: Response) => {
  const parse = TeamIdeaSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json(
      apiError('VALIDATION_ERROR', 'Invalid team idea', parse.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })))
    );
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('fyp_team_ideas')
    .insert({ ...parse.data, user_id: req.user!.id })
    .select()
    .single();

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.status(201).json({ data });
});

/**
 * PATCH /api/v1/fyp/team-ideas/:id
 * Author closes or edits their team idea.
 */
fypRouter.patch('/team-ideas/:id', requireRole('enrolled', 'admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const { data: existing } = await supabaseAdmin
    .from('fyp_team_ideas')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing || existing.user_id !== userId) {
    res.status(403).json(apiError('FORBIDDEN', 'Not the author of this idea'));
    return;
  }

  const patch = z.object({
    is_open: z.boolean().optional(),
    title: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    required_skills: z.array(z.string().trim()).max(10).optional(),
  }).safeParse(req.body);

  if (!patch.success) {
    res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid patch payload'));
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('fyp_team_ideas')
    .update({ ...patch.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    res.status(500).json(apiError('DB_ERROR', error.message));
    return;
  }

  res.json({ data });
});

/**
 * DELETE /api/v1/fyp/team-ideas/:id
 * Author or admin removes a team idea.
 */
fypRouter.delete('/team-ideas/:id', requireRole('enrolled', 'admin'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const isAdmin = req.user!.role === 'admin';

  const { data: existing } = await supabaseAdmin
    .from('fyp_team_ideas')
    .select('user_id')
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    res.status(404).json(apiError('NOT_FOUND', 'Team idea not found'));
    return;
  }

  if (!isAdmin && existing.user_id !== userId) {
    res.status(403).json(apiError('FORBIDDEN', 'Not authorized to delete this idea'));
    return;
  }

  await supabaseAdmin.from('fyp_team_ideas').delete().eq('id', id);
  res.json({ data: { deleted: true } });
});

// ─── Card M1: Similarity Search ──────────────────────────────────────────────

/**
 * GET /api/v1/fyp/:id/similar
 * Returns up to N similar FYP projects.
 * Strategy 1: pgvector cosine similarity if source embedding exists.
 * Strategy 2: keyword + domain_tag overlap scoring (no embedding required).
 * Always labelled Estimate in response (Rule #7).
 */
fypRouter.get('/:id/similar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(10, Number(req.query.limit) || 5);

    const { data: source, error: srcErr } = await supabaseAdmin
      .from('fyp_projects')
      .select('id, title, abstract, domain_tags, embedding')
      .eq('id', id)
      .maybeSingle();

    if (srcErr || !source) {
      res.status(404).json(apiError('NOT_FOUND', 'FYP project not found'));
      return;
    }

    let results: Array<Record<string, unknown>> = [];
    let matchMethod = 'keyword_overlap';

    // Strategy 1: pgvector cosine similarity
    if (source.embedding) {
      const { data: vecResults, error: vecErr } = await supabaseAdmin.rpc(
        'fyp_similarity_search',
        { query_embedding: source.embedding, exclude_id: id, match_count: limit }
      );

      if (!vecErr && vecResults && vecResults.length > 0) {
        results = (vecResults as Array<Record<string, unknown>>).map((r) => ({
          ...r,
          matchMethod: 'vector_cosine',
          matchLabel: 'Estimate (cosine similarity)',
        }));
        matchMethod = 'vector_cosine';
      }
    }

    // Strategy 2: keyword + tag overlap fallback
    if (results.length === 0) {
      const { data: allProjects } = await supabaseAdmin
        .from('fyp_projects')
        .select('id, title, abstract, domain_tags, year, supervisor')
        .neq('id', id)
        .limit(200);

      if (allProjects && allProjects.length > 0) {
        const sourceTags = new Set<string>(source.domain_tags ?? []);
        const sourceTitleWords = new Set<string>(
          (source.title ?? '').toLowerCase().split(/\W+/).filter((w: string) => w.length > 3)
        );

        const scored = allProjects.map((p) => {
          const pTags: string[] = (p.domain_tags as string[]) ?? [];
          const pTitle: string = (p.title as string) ?? '';
          const pWords = new Set<string>(pTitle.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3));

          const tagOverlap = pTags.filter((t) => sourceTags.has(t)).length;
          const tagScore = Math.min(1.0, tagOverlap / Math.max(1, sourceTags.size)) * 60;

          let titleOverlap = 0;
          for (const w of pWords) {
            if (sourceTitleWords.has(w)) titleOverlap++;
          }
          const titleScore = Math.min(1.0, titleOverlap / Math.max(1, sourceTitleWords.size)) * 40;
          const similarity = Math.round(tagScore + titleScore);

          return {
            id: p.id,
            title: p.title,
            year: p.year,
            supervisor: p.supervisor,
            domain_tags: p.domain_tags,
            similarity,
            matchMethod: 'keyword_overlap',
            matchLabel: 'Estimate (keyword + tag overlap)',
          };
        });

        results = scored
          .filter((p) => p.similarity > 0)
          .sort((a, b) => (b.similarity as number) - (a.similarity as number))
          .slice(0, limit);
      }
    }

    res.json({
      sourceId: id,
      sourceTitle: source.title,
      matchMethod,
      estimateDisclaimer:
        'Similarity scores are guidance estimates, not official rankings (Rule #7).',
      results,
    });
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Similarity search failed')
    );
  }
});

/**
 * GET /api/v1/fyp/:id
 * Retrieves full details for a single FYDP.
 */
fypRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: project, error } = await supabaseAdmin
      .from('fyp_projects')
      .select('*, fyp_company_interest(company_id, interest_type, companies(name))')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      res.status(500).json(apiError('DB_ERROR', error.message));
      return;
    }

    if (!project) {
      res.status(404).json(apiError('NOT_FOUND', 'FYP project not found'));
      return;
    }

    res.json({ data: project });
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to fetch FYP details')
    );
  }
});

/**
 * POST /api/v1/fyp/:id/shortlist
 * Enrolled student shortlists or un-shortlists a project.
 */
fypRouter.post('/:id/shortlist', requireRole('enrolled', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: projectId } = req.params;

    const { data: existing } = await supabaseAdmin
      .from('fyp_shortlists')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin.from('fyp_shortlists').delete().eq('id', existing.id);
      res.json({ data: { isShortlisted: false, message: 'Removed from shortlist' } });
    } else {
      await supabaseAdmin.from('fyp_shortlists').insert({ user_id: userId, project_id: projectId });
      res.status(201).json({ data: { isShortlisted: true, message: 'Saved to shortlist' } });
    }
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to update shortlist')
    );
  }
});

// Prevent unused import warning — getEmbedding used by seed_fyp_embeddings.mjs offline only
void (getEmbedding as unknown);
