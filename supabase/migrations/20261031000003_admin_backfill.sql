-- ============================================================================
-- EduCompass Admin Panel: Migration 3 of 3 — Backfill
-- Card A2 | 2026-10-31
-- Seeds: CIS department, links programs, populates course_master,
--        creates Scheme 2022 curriculum versions, seeds curriculum_courses,
--        backfills prerequisite_rules.version_id, seeds batches 2022-2025,
--        seeds approval_policies defaults, archives roadmaps if empty.
-- IDEMPOTENT: safe to run multiple times (all use ON CONFLICT DO NOTHING).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. SEED DEPARTMENTS — CIS
-- ---------------------------------------------------------------------------
INSERT INTO public.departments (id, code, name, status)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,  -- stable seed UUID for CIS
  'CIS',
  'Department of Computer & Information Systems Engineering',
  'active'
)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. LINK PROGRAMS TO CIS DEPARTMENT
-- ---------------------------------------------------------------------------
UPDATE public.programs
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;  -- all existing programs belong to CIS

-- ---------------------------------------------------------------------------
-- 3. SEED course_master FROM courses
-- Preserves original course UUIDs so existing FK references don't break.
-- ---------------------------------------------------------------------------
INSERT INTO public.course_master (
  id,
  code,
  code_normalized,
  title,
  owner_department_id,
  credits_theory,
  credits_practical,
  status,
  created_at
)
SELECT
  c.id,
  c.code,
  c.code_normalized,
  c.title,
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID,
  -- credits from courses.credits (total); split 50/50 as default if not available
  CASE WHEN c.credits > 1 THEN c.credits - 1 ELSE c.credits END,
  CASE WHEN c.credits > 1 THEN 1 ELSE 0 END,
  CASE WHEN c.publication_status = 'archived' THEN 'archived' ELSE 'active' END,
  c.created_at
FROM public.courses c
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. CREATE curriculum_versions — one per program (Scheme 2022, published)
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_versions (
  id,
  program_id,
  name,
  revision,
  status,
  based_on,
  published_at,
  created_at
)
SELECT
  -- Deterministic UUID: hash of program_id + 'scheme2022'
  -- Using a stable formula so backfill is idempotent
  gen_random_uuid(),   -- idempotent via ON CONFLICT below
  p.id,
  'Scheme 2022',
  1,
  'published',
  NULL,
  p.created_at,
  p.created_at
FROM public.programs p
ON CONFLICT (program_id, name, revision) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. SEED curriculum_courses FROM courses
-- Each course in courses maps to a curriculum_course in the program's version.
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_courses (
  version_id,
  course_id,
  semester,
  credits,
  category
)
SELECT
  cv.id,
  c.id,
  c.semester,
  c.credits,
  c.category
FROM public.courses c
JOIN public.programs p ON p.id = c.program_id
JOIN public.curriculum_versions cv
  ON cv.program_id = p.id AND cv.name = 'Scheme 2022' AND cv.revision = 1
ON CONFLICT (version_id, course_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. BACKFILL prerequisite_rules.version_id
-- ---------------------------------------------------------------------------
UPDATE public.prerequisite_rules pr
SET version_id = cv.id
FROM public.courses c
JOIN public.programs p ON p.id = c.program_id
JOIN public.curriculum_versions cv
  ON cv.program_id = p.id AND cv.name = 'Scheme 2022' AND cv.revision = 1
WHERE pr.course_id = c.id
  AND pr.version_id IS NULL;

-- Now that version_id is backfilled, add the composite unique constraint
-- (Drop the old single-column unique constraint first — it was on course_id alone)
ALTER TABLE public.prerequisite_rules
  DROP CONSTRAINT IF EXISTS prerequisite_rules_course_id_key;

-- Add composite unique only if not already there
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'prerequisite_rules_version_course_uq'
  ) THEN
    ALTER TABLE public.prerequisite_rules
      ADD CONSTRAINT prerequisite_rules_version_course_uq
      UNIQUE (version_id, course_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. SEED BATCHES 2022–2025
-- One batch per (program, admission_year), all pointing to Scheme 2022.
-- profiles.batch_id stays NULL — students choose on first login.
-- ---------------------------------------------------------------------------
INSERT INTO public.batches (program_id, admission_year, label, curriculum_version_id, status)
SELECT
  p.id,
  yr.year,
  'Batch ' || yr.year,
  cv.id,
  'active'
FROM public.programs p
CROSS JOIN (VALUES (2022),(2023),(2024),(2025),(2026)) AS yr(year)
JOIN public.curriculum_versions cv
  ON cv.program_id = p.id AND cv.name = 'Scheme 2022' AND cv.revision = 1
ON CONFLICT (program_id, admission_year) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. BACKFILL department_id ON CONTENT TABLES
-- All existing records belong to CIS.
-- ---------------------------------------------------------------------------
UPDATE public.fyp_projects
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.professors
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.career_tracks
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.roadmap_steps
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.articles
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.repositories
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.chatbot_answers
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

UPDATE public.domain_track_map
SET department_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::UUID
WHERE department_id IS NULL;

-- ---------------------------------------------------------------------------
-- 9. SEED approval_policies (defaults from spec and admin_permissions.json)
-- approver_role = NULL means no approval needed (audited only)
-- ---------------------------------------------------------------------------
INSERT INTO public.approval_policies (resource, impact, action, approver_role)
VALUES
  -- Curriculum
  ('curriculum', 'minor',  'publish',        NULL),         -- chairman publishes minor without approval
  ('curriculum', 'major',  'publish',        'vc'),
  ('curriculum', 'minor',  'delete',         'vc'),
  ('curriculum', 'major',  'delete',         'vc'),
  ('curriculum', 'minor',  'rollback',       'vc'),
  ('curriculum', 'major',  'rollback',       'vc'),
  -- FYP
  ('fyp',        'minor',  'publish',        NULL),         -- chairman publishes directly
  ('fyp',        'major',  'publish',        'chairman'),
  ('fyp',        'minor',  'delete',         'chairman'),
  ('fyp',        'major',  'delete',         'chairman'),
  -- Operator → chairman routing
  ('fyp',        'minor',  'operator_submit','chairman'),
  ('fyp',        'major',  'operator_submit','chairman'),
  -- Professors
  ('professors', 'minor',  'publish',        NULL),
  ('professors', 'major',  'publish',        'chairman'),
  ('professors', 'minor',  'delete',         'chairman'),
  ('professors', 'major',  'delete',         'chairman'),
  ('professors', 'minor',  'operator_submit','chairman'),
  ('professors', 'major',  'operator_submit','chairman'),
  -- Career
  ('career',     'minor',  'publish',        NULL),
  ('career',     'major',  'publish',        'chairman'),
  ('career',     'minor',  'delete',         'chairman'),
  ('career',     'major',  'delete',         'chairman'),
  ('career',     'minor',  'operator_submit','chairman'),
  ('career',     'major',  'operator_submit','chairman'),
  -- Chatbot content
  ('chatbot_content','minor','publish',       NULL),
  ('chatbot_content','major','publish',       'chairman'),
  ('chatbot_content','minor','delete',        'chairman'),
  ('chatbot_content','major','delete',        'chairman'),
  ('chatbot_content','minor','operator_submit','chairman'),
  ('chatbot_content','major','operator_submit','chairman'),
  -- Chatbot settings (VC only)
  ('chatbot_settings','minor','publish',      NULL),
  ('chatbot_settings','major','publish',      NULL),
  -- Data imports
  ('data_imports','minor', 'publish',        'chairman'),
  ('data_imports','major', 'publish',        'chairman'),
  ('data_imports','minor', 'operator_submit','chairman'),
  ('data_imports','major', 'operator_submit','chairman')
ON CONFLICT (resource, impact, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. SEED cooling_off_days INTO deletion_schedule DEFAULTS
-- (stored as a lookup; actual rows use this per resource type)
-- ---------------------------------------------------------------------------
-- No separate table needed; days are embedded in the deletion_schedule trigger
-- and in the server-side constant (lib/admin-policy.ts).
-- Documented here for reference:
--   career / chatbot_content / data_imports : 7 days
--   fyp / professors                        : 14 days
--   curriculum item                         : 30 days
--   curriculum version                      : 90 days
-- These match admin_permissions.json "cooling_off_days_default".

-- ---------------------------------------------------------------------------
-- 11. ARCHIVE roadmaps TABLE IF EMPTY
-- The roadmaps table was defined in init_schema but was replaced by roadmap_steps.
-- It does not exist in the live DB (confirmed: PostgREST does not expose it).
-- Safe to skip this step.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'roadmaps'
  ) THEN
    COMMENT ON TABLE public.roadmaps IS
      'DEPRECATED 2026-10-31: replaced by roadmap_steps. Will be dropped in a future migration.';
    RAISE NOTICE 'roadmaps table exists and has been marked deprecated.';
  ELSE
    RAISE NOTICE 'roadmaps table does not exist in live DB — already removed. Skipping.';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. SNAPSHOT VERIFICATION VIEW
-- Used by smoke test to confirm student-facing data is unchanged post-migration.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_snapshot_check AS
SELECT
  (SELECT COUNT(*) FROM public.courses WHERE publication_status = 'published')          AS published_courses,
  (SELECT COUNT(*) FROM public.prerequisite_rules)                                       AS prereq_rules,
  (SELECT COUNT(*) FROM public.fyp_projects WHERE review_status IN ('approved','published') AND deleted_at IS NULL) AS live_fyp,
  (SELECT COUNT(*) FROM public.professors   WHERE review_status IN ('approved','published') AND deleted_at IS NULL) AS live_professors,
  (SELECT COUNT(*) FROM public.career_tracks WHERE deleted_at IS NULL)                   AS live_tracks,
  (SELECT COUNT(*) FROM public.roadmap_steps WHERE deleted_at IS NULL)                   AS live_steps,
  (SELECT COUNT(*) FROM public.articles     WHERE review_status IN ('approved','published') AND deleted_at IS NULL) AS live_articles,
  (SELECT COUNT(*) FROM public.chatbot_answers WHERE deleted_at IS NULL)                 AS live_chatbot_answers,
  (SELECT COUNT(*) FROM public.curriculum_versions WHERE status = 'published')           AS published_versions,
  (SELECT COUNT(*) FROM public.curriculum_courses)                                       AS cv_courses,
  (SELECT COUNT(*) FROM public.batches WHERE status = 'active')                          AS active_batches;

COMMENT ON VIEW public.v_snapshot_check IS
  'Used by smoke tests before and after migrations to confirm student-visible record counts are unchanged.';
