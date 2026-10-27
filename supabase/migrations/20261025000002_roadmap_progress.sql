-- ============================================================================
-- EduCompass Migration: Roadmap Steps v2 + Progress Tracker
-- Playbook ref: Sections 7.1, 7.2, 7.5
-- ============================================================================

-- 1. Drop the old roadmap_steps table (it was keyed on roadmap_id, not track/variant/topic_key)
--    The old roadmap_steps had no topic_key; we replace the whole design.
--    Cascade-drop roadmap_progress which depends on the old step_id column.

DROP TABLE IF EXISTS public.roadmap_progress CASCADE;
DROP TABLE IF EXISTS public.roadmap_steps CASCADE;
DROP TABLE IF EXISTS public.roadmaps CASCADE;

-- 2. New roadmap_steps: keyed by (track_slug, variant, topic_key)
CREATE TABLE public.roadmap_steps (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  track_slug      TEXT        NOT NULL,
  variant         TEXT        NOT NULL CHECK (variant IN ('6-12-months', '2-4-years')),
  stage           TEXT        NOT NULL CHECK (stage IN ('first-year', 'second-year', 'third-year', 'final-year')),
  step_order      INT         NOT NULL,
  topic_key       TEXT        NOT NULL,          -- stable slug, e.g. "sql-basics"
  title           TEXT        NOT NULL,
  description     TEXT,
  est_weeks       INT,
  resources       JSONB       NOT NULL DEFAULT '[]',
  related_courses TEXT[]      NOT NULL DEFAULT '{}',
  source          TEXT,
  proposed_by     TEXT        NOT NULL DEFAULT 'agent', -- 'agent' or 'human'
  review_status   TEXT        NOT NULL DEFAULT 'Extracted'
    CHECK (review_status IN ('Extracted', 'Flagged', 'Approved', 'Rejected', 'Published')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (track_slug, variant, step_order),
  UNIQUE (track_slug, variant, topic_key)        -- topic_key must be unique per track+variant pair
);

-- 3. Roadmap progress: keyed by (user, track, topic_key) — not by step_id.
--    Switching between variants keeps the same ticks because the key is topic_key.
CREATE TABLE public.roadmap_progress (
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_slug    TEXT        NOT NULL,
  topic_key     TEXT        NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'done')),
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, track_slug, topic_key)
);

-- 4. RLS -----------------------------------------------------------------------

-- roadmap_steps: public read of published steps; admin writes
ALTER TABLE public.roadmap_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published roadmap steps"
  ON public.roadmap_steps FOR SELECT USING (
    review_status = 'Published' OR public.is_admin()
  );

CREATE POLICY "Admin manage roadmap steps"
  ON public.roadmap_steps FOR ALL USING (public.is_admin());

-- roadmap_progress: strict per-user isolation; anon gets nothing
ALTER TABLE public.roadmap_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_progress"
  ON public.roadmap_progress
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Trigger to auto-update updated_at on roadmap_steps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roadmap_steps_updated_at ON public.roadmap_steps;
CREATE TRIGGER trg_roadmap_steps_updated_at
  BEFORE UPDATE ON public.roadmap_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roadmap_progress_updated_at ON public.roadmap_progress;
CREATE TRIGGER trg_roadmap_progress_updated_at
  BEFORE UPDATE ON public.roadmap_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. Note: roadmap_progress must be included in the account-deletion job (SEC-07).
--    When a user requests account deletion the job must DELETE FROM roadmap_progress WHERE user_id = <id>.
--    The ON DELETE CASCADE on user_id already handles this if auth.users row is deleted,
--    but the soft-deletion job should also clear it explicitly and log to audit_log.
