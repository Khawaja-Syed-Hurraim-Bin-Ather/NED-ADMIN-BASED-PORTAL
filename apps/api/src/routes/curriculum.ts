import { Router, Request, Response } from 'express';
import { apiError } from '@educompass/shared';
import { supabaseAdmin } from '../lib/supabase';
import { buildDefaultCurriculumGraph } from './prereq';

export const curriculumRouter = Router();

// GET /api/v1/curriculum?batch=2022&program=CSE
curriculumRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { batch, program = 'CSE' } = req.query;

    const defaultG = buildDefaultCurriculumGraph();
    const fallbackCourses = Array.from(defaultG.courses.values()).map((c) => {
      // Find direct prereqs from rules
      const prereqs: string[] = [];
      const rule = defaultG.rules.get(c.code);
      if (rule) {
        if (rule.type === 'course' && rule.courseCode) {
          prereqs.push(rule.courseCode);
        } else if (rule.type === 'and' && rule.children) {
          for (const child of rule.children) {
            if (child.type === 'course' && child.courseCode) {
              prereqs.push(child.courseCode);
            }
          }
        }
      }
      return {
        code: c.code,
        title: c.title,
        credits: c.credits,
        theoryCredits: c.theoryCredits ?? 3,
        practicalCredits: c.practicalCredits ?? (c.credits > 3 ? 1 : 0),
        semester: c.semester,
        category: c.category ?? 'core_computing',
        isElective: c.isElective ?? false,
        prereqs,
      };
    });

    let versionInfo: any = {
      name: 'BE Computer Systems Engineering (2018 Onwards)',
      revision: 'v1.0',
      batch: typeof batch === 'string' ? batch : '2022',
      program: typeof program === 'string' ? program : 'CSE',
    };

    // If batch specified, check batches table for linked curriculum version
    if (typeof batch === 'string' && batch.trim()) {
      const { data: batchRecord } = await supabaseAdmin
        .from('batches')
        .select(`
          id,
          label,
          admission_year,
          curriculum_version:curriculum_versions(
            id,
            name,
            revision,
            status,
            max_credits_per_semester,
            grade_scale,
            passing_grade
          )
        `)
        .eq('admission_year', parseInt(batch.trim(), 10))
        .maybeSingle();

      if (batchRecord?.curriculum_version) {
        const cv: any = batchRecord.curriculum_version;
        versionInfo = {
          id: cv.id,
          name: cv.name,
          revision: cv.revision,
          batch: batchRecord.admission_year,
          status: cv.status,
          maxCredits: cv.max_credits_per_semester,
          passingGrade: cv.passing_grade,
        };
      }
    }

    res.json({
      success: true,
      data: {
        version: versionInfo,
        courses: fallbackCourses,
        total: fallbackCourses.length,
      },
    });
  } catch (err) {
    res.status(500).json(apiError('INTERNAL_ERROR', 'Unexpected error retrieving curriculum', [
      { field: 'curriculum', message: (err as Error).message },
    ]));
  }
});

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

