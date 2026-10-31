import { Router, Request, Response } from 'express';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';

export const curriculumRouter = Router();

// GET /api/v1/curriculum/versions
curriculumRouter.get('/versions', async (req: Request, res: Response) => {
  try {
    const { programId, programCode } = req.query;

    let query = supabaseAdmin
      .from('curriculum_versions')
      .select(`
        id,
        name,
        revision,
        status,
        based_on,
        grade_scale,
        passing_grade,
        max_credits_per_semester,
        graduation_rules,
        chart_layout,
        published_at,
        created_at,
        program:programs!inner(
          id,
          code,
          name,
          degree
        )
      `)
      .order('revision', { ascending: false });

    if (typeof programId === 'string') {
      query = query.eq('program_id', programId);
    } else if (typeof programCode === 'string') {
      query = query.ilike('programs.code', programCode);
    }

    const { data: versions, error } = await query;

    if (error) {
      res.status(500).json(apiError('INTERNAL_ERROR', 'Failed to retrieve curriculum versions', [
        { field: 'versions', message: error.message },
      ]));
      return;
    }

    res.json({
      success: true,
      data: versions || [],
      total: versions?.length || 0,
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error', [
      { field: 'versions', message: (err as Error).message },
    ]));
  }
});

// GET /api/v1/curriculum/:versionId
curriculumRouter.get('/:versionId', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.params;

    const { data: version, error: vErr } = await supabaseAdmin
      .from('curriculum_versions')
      .select(`
        id,
        name,
        revision,
        status,
        based_on,
        grade_scale,
        passing_grade,
        max_credits_per_semester,
        graduation_rules,
        chart_layout,
        published_at,
        created_at,
        program:programs!inner(
          id,
          code,
          name,
          degree
        )
      `)
      .eq('id', versionId)
      .maybeSingle();

    if (vErr || !version) {
      res.status(404).json(apiError('NOT_FOUND', `Curriculum version ${versionId} not found`));
      return;
    }

    // Fetch courses in this version
    const { data: courses } = await supabaseAdmin
      .from('curriculum_courses')
      .select(`
        id,
        semester,
        credits,
        category,
        slot,
        course:course_master!inner(
          id,
          code,
          title,
          description,
          credits_theory,
          credits_practical,
          status
        )
      `)
      .eq('version_id', versionId)
      .order('semester', { ascending: true });

    // Fetch elective groups
    const { data: electiveGroups } = await supabaseAdmin
      .from('elective_groups')
      .select('*')
      .eq('version_id', versionId);

    // Fetch prerequisite rules for this version
    const { data: prereqRules } = await supabaseAdmin
      .from('prerequisite_rules')
      .select('course_id, rule_tree')
      .eq('version_id', versionId);

    res.json({
      success: true,
      data: {
        ...version,
        courses: courses || [],
        electiveGroups: electiveGroups || [],
        prerequisiteRules: prereqRules || [],
      },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error', [
      { field: 'curriculum', message: (err as Error).message },
    ]));
  }
});
