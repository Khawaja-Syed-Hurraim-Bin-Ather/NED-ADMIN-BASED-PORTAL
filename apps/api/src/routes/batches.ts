import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';

export const batchesRouter = Router();

// GET /api/v1/batches?program=CSE&q=2022
batchesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { program, q } = req.query;

    let query = supabaseAdmin
      .from('batches')
      .select(`
        id,
        admission_year,
        label,
        status,
        created_at,
        program:programs!inner(
          id,
          code,
          name,
          degree
        ),
        curriculum_version:curriculum_versions!inner(
          id,
          name,
          revision,
          status,
          published_at
        )
      `)
      .eq('status', 'active')
      .order('admission_year', { ascending: false });

    if (typeof program === 'string' && program.trim()) {
      query = query.ilike('programs.code', program.trim());
    }

    const { data: rawBatches, error } = await query;

    if (error) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to retrieve batches', [
        { field: 'batches', message: error.message },
      ]));
      return;
    }

    let results = rawBatches || [];

    // In-memory text filter if q provided
    if (typeof q === 'string' && q.trim()) {
      const needle = q.trim().toLowerCase();
      results = results.filter((b: any) => {
        return (
          b.label?.toLowerCase().includes(needle) ||
          String(b.admission_year).includes(needle) ||
          b.program?.code?.toLowerCase().includes(needle) ||
          b.curriculum_version?.name?.toLowerCase().includes(needle)
        );
      });
    }

    res.json({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error retrieving batches', [
      { field: 'batches', message: (err as Error).message },
    ]));
  }
});

// GET /api/v1/batches/:id
batchesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data: batch, error } = await supabaseAdmin
      .from('batches')
      .select(`
        id,
        admission_year,
        label,
        status,
        created_at,
        program:programs!inner(
          id,
          code,
          name,
          degree
        ),
        curriculum_version:curriculum_versions!inner(
          id,
          name,
          revision,
          status,
          grade_scale,
          passing_grade,
          max_credits_per_semester,
          graduation_rules,
          chart_layout,
          published_at
        )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !batch) {
      res.status(404).json(apiError('NOT_FOUND', `Batch ${id} not found`));
      return;
    }

    res.json({
      success: true,
      data: batch,
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error retrieving batch', [
      { field: 'batch', message: (err as Error).message },
    ]));
  }
});
