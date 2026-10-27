import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CareerTrack {
  slug: string;
  title: string;
  srs_basis: string;
  summary: string;
  relevant_courses: string[];
  roadmap_variants: string[];
  stages: string[];
  fyp_count?: number;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TracksData = require('../../../../docs/data/career_tracks.json') as {
  schema_version: number;
  tracks: CareerTrack[];
};

export const careersRouter = Router();

// FYP domain_tag → career track slug mapping
const DOMAIN_TO_SLUG_MAP: Record<string, string[]> = {
  'ai-ml':            ['ai-ml-engineering', 'data-science'],
  'healthcare-tech':  ['ai-ml-engineering', 'data-science'],
  'web-mobile':       ['frontend-development', 'backend-development', 'mobile-development'],
  'robotics-embedded':['embedded-iot', 'systems-hardware-design'],
  cybersecurity:      ['cybersecurity'],
};

const QuerySchema = z.object({
  slug: z.string().optional(),
});

/**
 * GET /api/v1/careers
 * Returns all 12 career tracks enriched with FYP domain counts.
 * Static data — no live scraping (Rule #1).
 */
careersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    // Pull published FYP domain_tags counts from Supabase
    // Only published records are visible to users (Rule #2)
    const { data: fypRows, error } = await supabaseAdmin
      .from('fyp_projects')
      .select('domain_tags')
      .eq('review_status', 'published');

    // Build slug → count map even if Supabase fails (graceful degradation)
    const slugCountMap: Record<string, number> = {};
    if (!error && fypRows) {
      for (const row of fypRows) {
        const tags: string[] = row.domain_tags ?? [];
        for (const tag of tags) {
          const slugs = DOMAIN_TO_SLUG_MAP[tag] ?? [];
          for (const slug of slugs) {
            slugCountMap[slug] = (slugCountMap[slug] ?? 0) + 1;
          }
        }
      }
    }

    const enriched = TracksData.tracks.map((t) => ({
      ...t,
      fyp_count: slugCountMap[t.slug] ?? 0,
    }));

    res.json({ data: enriched, meta: { total: enriched.length } });
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to load career tracks')
    );
  }
});

/**
 * GET /api/v1/careers/:slug
 * Returns a single career track with its full detail.
 */
careersRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const parseResult = QuerySchema.safeParse(req.params);
    const slug = parseResult.success ? parseResult.data.slug : req.params.slug;

    const track = TracksData.tracks.find((t) => t.slug === slug);
    if (!track) {
      res.status(404).json(apiError('NOT_FOUND', `Career track '${slug}' not found`));
      return;
    }

    // Related FYP count for this specific track
    const relatedDomains = Object.entries(DOMAIN_TO_SLUG_MAP)
      .filter(([, slugs]) => slugs.includes(track.slug))
      .map(([domain]) => domain);

    let fypCount = 0;
    if (relatedDomains.length > 0) {
      const { count } = await supabaseAdmin
        .from('fyp_projects')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'published')
        .overlaps('domain_tags', relatedDomains);
      fypCount = count ?? 0;
    }

    res.json({ data: { ...track, fyp_count: fypCount } });
  } catch (err: unknown) {
    res.status(500).json(
      apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to load career track')
    );
  }
});
