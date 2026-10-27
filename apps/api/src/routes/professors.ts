import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfessorRow {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  rank: string | null;
  name_status: 'confirmed' | 'inferred' | 'partial' | 'missing';
  department: string;
  qualification: string | null;
  research_areas: string[];
  research_areas_source: 'stated' | 'derived' | 'stated+derived' | null;
  domain_tags: string[];
  area_tags: string[];
  highlights: string | null;
  selected_publications: string[];
  contact_route: string | null;
  is_simulated: boolean;
  review_status: string;
  created_at: string;
}

interface MatchBreakdown {
  domain_overlap: number;  // 0-50 pts: shared domain_tags
  area_overlap: number;    // 0-30 pts: shared area_tags
  keyword_match: number;   // 0-20 pts: query keywords in research_areas / highlights
  total: number;           // 0-100
  label: 'Estimate';
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const professorsRouter = Router();

// ─── Query schema ────────────────────────────────────────────────────────────

const ListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  domain: z.string().optional(),
  area: z.string().optional(),
  interests: z.string().optional(),   // comma-separated student interest tags
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(20),
});

const SlugParamSchema = z.object({
  slug: z.string().min(1).max(100),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate a 0-100 match score between a professor and student interests.
 * Rule #7: always labelled "Estimate" with visible breakdown.
 * Only domain_tags, area_tags, and research_areas text are used — no personal data.
 */
function calcMatchScore(
  prof: ProfessorRow,
  interestTags: string[],
  keywords: string[],
): MatchBreakdown {
  if (!interestTags.length && !keywords.length) {
    return { domain_overlap: 0, area_overlap: 0, keyword_match: 0, total: 0, label: 'Estimate' };
  }

  const allProfTags = [...(prof.domain_tags ?? []), ...(prof.area_tags ?? [])];
  const profTagSet = new Set(allProfTags.map(t => t.toLowerCase()));

  // Domain overlap: up to 50 pts (10 pts per matching tag, capped)
  const matchedDomain = interestTags.filter(t => profTagSet.has(t.toLowerCase())).length;
  const domain_overlap = Math.min(matchedDomain * 10, 50);

  // Area overlap: up to 30 pts (10 pts per matching area_tag)
  const matchedArea = interestTags.filter(t =>
    (prof.area_tags ?? []).map(a => a.toLowerCase()).includes(t.toLowerCase())
  ).length;
  const area_overlap = Math.min(matchedArea * 10, 30);

  // Keyword match: up to 20 pts (5 pts per keyword found in research_areas + highlights)
  const textBlob = [
    ...(prof.research_areas ?? []),
    prof.highlights ?? '',
    prof.qualification ?? '',
  ].join(' ').toLowerCase();
  const matchedKw = keywords.filter(kw => textBlob.includes(kw.toLowerCase())).length;
  const keyword_match = Math.min(matchedKw * 5, 20);

  const total = Math.min(domain_overlap + area_overlap + keyword_match, 100);

  return { domain_overlap, area_overlap, keyword_match, total, label: 'Estimate' };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/professors
 * List published professors with optional search, domain/area tag filter, and match scoring.
 * Only published (or approved) records returned (Rule #2).
 * Static data from Supabase — no live scraping (Rule #1).
 */
professorsRouter.get('/', async (req: Request, res: Response) => {
  const parseResult = ListQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid query parameters', parseResult.error.errors));
  }

  const { q, domain, area, interests, page, per_page } = parseResult.data;

  try {
    let query = supabaseAdmin
      .from('professors')
      .select('*')
      .in('review_status', ['published', 'approved'])
      .neq('name_status', 'missing')  // never show profiles without a name
      .order('name', { ascending: true });

    // Full-text search
    if (q) {
      query = query.textSearch('tsv', q, { type: 'plain', config: 'english' });
    }

    // Domain tag filter (contains)
    if (domain) {
      query = query.contains('domain_tags', [domain]);
    }

    // Area tag filter (contains)
    if (area) {
      query = query.contains('area_tags', [area]);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error('[professors] supabase error', error);
      return res.status(500).json(apiError('DB_ERROR', 'Failed to fetch professors'));
    }

    const professors = (rows ?? []) as ProfessorRow[];

    // Match scoring — only when student passes interests or search keywords
    const interestTags = interests
      ? interests.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const keywords = q ? q.split(/\s+/).filter(Boolean) : [];

    const enriched = professors.map(prof => ({
      ...prof,
      match_score: calcMatchScore(prof, interestTags, keywords),
    }));

    // Sort by match score descending when interests provided
    if (interestTags.length > 0) {
      enriched.sort((a, b) => b.match_score.total - a.match_score.total);
    }

    // Paginate
    const total = enriched.length;
    const start = (page - 1) * per_page;
    const paginated = enriched.slice(start, start + per_page);

    return res.json({
      data: paginated,
      meta: {
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
    });
  } catch (err) {
    console.error('[professors] unexpected error', err);
    return res.status(500).json(apiError('INTERNAL_ERROR', 'An unexpected error occurred'));
  }
});

/**
 * GET /api/v1/professors/:slug
 * Single professor profile with supervised projects.
 * Only published/approved professors are returned (Rule #2).
 */
professorsRouter.get('/:slug', async (req: Request, res: Response) => {
  const parseResult = SlugParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    return res.status(400).json(apiError('VALIDATION_ERROR', 'Invalid slug'));
  }

  const { slug } = parseResult.data;

  try {
    const { data: prof, error } = await supabaseAdmin
      .from('professors')
      .select('*')
      .eq('slug', slug)
      .in('review_status', ['published', 'approved'])
      .neq('name_status', 'missing')
      .single();

    if (error || !prof) {
      return res.status(404).json(apiError('NOT_FOUND', 'Professor not found'));
    }

    // Fetch supervised projects
    const { data: projects } = await supabaseAdmin
      .from('professor_supervised_projects')
      .select('title, year, kind')
      .eq('professor_id', prof.id)
      .order('kind', { ascending: true });

    return res.json({
      data: {
        ...(prof as ProfessorRow),
        supervised_projects: projects ?? [],
      },
    });
  } catch (err) {
    console.error('[professors/:slug] unexpected error', err);
    return res.status(500).json(apiError('INTERNAL_ERROR', 'An unexpected error occurred'));
  }
});
