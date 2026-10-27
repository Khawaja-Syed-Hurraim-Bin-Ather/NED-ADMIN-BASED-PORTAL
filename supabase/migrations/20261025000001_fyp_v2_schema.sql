-- ============================================================================
-- EduCompass Migration: FYP v2 Schema + Companies + domain_track_map
-- Playbook ref: Sections 6.3, 6.6, 6.11, 8.1, 8.2
-- ============================================================================

-- 1. Extend fyp_projects to match the fyp.v2 canonical record
ALTER TABLE public.fyp_projects
  ADD COLUMN IF NOT EXISTS schema_version      TEXT    NOT NULL DEFAULT 'fyp.v2',
  ADD COLUMN IF NOT EXISTS raw_title           TEXT,
  ADD COLUMN IF NOT EXISTS proposal_outcome    TEXT    NOT NULL DEFAULT 'unknown'
    CHECK (proposal_outcome IN ('accepted', 'rejected', 'unknown')),
  ADD COLUMN IF NOT EXISTS outcome_reason      TEXT,
  ADD COLUMN IF NOT EXISTS outcome_evidence    TEXT,
  ADD COLUMN IF NOT EXISTS relevance           TEXT    NOT NULL DEFAULT 'uncertain'
    CHECK (relevance IN ('in_scope', 'uncertain', 'out_of_scope')),
  ADD COLUMN IF NOT EXISTS relevance_reason    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_size           INT,
  ADD COLUMN IF NOT EXISTS supervisor_title    TEXT,
  ADD COLUMN IF NOT EXISTS co_supervisor       TEXT,
  ADD COLUMN IF NOT EXISTS program             TEXT,
  ADD COLUMN IF NOT EXISTS department          TEXT,
  ADD COLUMN IF NOT EXISTS university          TEXT    NOT NULL DEFAULT 'NED University of Engineering & Technology',
  ADD COLUMN IF NOT EXISTS tags_source         TEXT    NOT NULL DEFAULT 'derived',
  ADD COLUMN IF NOT EXISTS domain_tags         TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS supervisor_id       UUID    REFERENCES public.professors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_file         TEXT,
  ADD COLUMN IF NOT EXISTS source_page         INT,
  ADD COLUMN IF NOT EXISTS raw_text_redacted   TEXT,
  ADD COLUMN IF NOT EXISTS confidence          FLOAT,
  ADD COLUMN IF NOT EXISTS natural_key         TEXT    UNIQUE;  -- sha1 for idempotent load

-- Update the tsvector trigger to include domain_tags
CREATE OR REPLACE FUNCTION fyp_trigger() RETURNS trigger AS $$
BEGIN
    NEW.tsv := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.abstract, '') || ' ' ||
        coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
        coalesce(array_to_string(NEW.domain_tags, ' '), '') || ' ' ||
        coalesce(NEW.supervisor, '')
    );
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 2. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  name_normalised  TEXT        NOT NULL UNIQUE,
  aliases          TEXT[]      NOT NULL DEFAULT '{}',
  source           TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. FYP ↔ Company interest table
CREATE TABLE IF NOT EXISTS public.fyp_company_interest (
  project_id     UUID NOT NULL REFERENCES public.fyp_projects(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  interest_type  TEXT NOT NULL DEFAULT 'approached'
    CHECK (interest_type IN ('approached', 'sponsored', 'collaborated', 'unknown')),
  raw_text       TEXT,
  PRIMARY KEY (project_id, company_id)
);

-- 4. Domain → Track mapping
CREATE TABLE IF NOT EXISTS public.domain_track_map (
  domain      TEXT NOT NULL,
  track_slug  TEXT NOT NULL,
  PRIMARY KEY (domain, track_slug)
);

-- 5. RLS -----------------------------------------------------------------------

-- Companies: public read; admin writes
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read companies"
  ON public.companies FOR SELECT USING (true);

CREATE POLICY "Admin manage companies"
  ON public.companies FOR ALL USING (public.is_admin());

-- FYP company interest: visible when parent project is published + in_scope
ALTER TABLE public.fyp_company_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read fyp_company_interest"
  ON public.fyp_company_interest FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.fyp_projects p
      WHERE p.id = project_id
        AND p.review_status IN ('approved', 'published')
        AND p.relevance = 'in_scope'
    )
  );

CREATE POLICY "Admin manage fyp_company_interest"
  ON public.fyp_company_interest FOR ALL USING (public.is_admin());

-- Domain track map: public read; admin writes
ALTER TABLE public.domain_track_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read domain_track_map"
  ON public.domain_track_map FOR SELECT USING (true);

CREATE POLICY "Admin manage domain_track_map"
  ON public.domain_track_map FOR ALL USING (public.is_admin());

-- Tighten the FYP public read policy: only published + in_scope rows are public
DROP POLICY IF EXISTS "Public read approved FYP projects" ON public.fyp_projects;

CREATE POLICY "Public read published in_scope FYP projects"
  ON public.fyp_projects FOR SELECT USING (
    (review_status = 'published' AND relevance = 'in_scope')
    OR public.is_admin()
  );

-- 6. Analytics views -----------------------------------------------------------
-- security_invoker = true means the view respects the caller's RLS context.

CREATE OR REPLACE VIEW public.v_fyp_year_outcome
  WITH (security_invoker = true) AS
SELECT year, proposal_outcome, count(*) AS n
FROM public.fyp_projects
WHERE review_status = 'published' AND relevance = 'in_scope'
GROUP BY year, proposal_outcome;

CREATE OR REPLACE VIEW public.v_fyp_domain_year
  WITH (security_invoker = true) AS
SELECT year, unnest(domain_tags) AS domain, count(*) AS n
FROM public.fyp_projects
WHERE review_status = 'published' AND relevance = 'in_scope'
GROUP BY year, domain;

CREATE OR REPLACE VIEW public.v_fyp_company_counts
  WITH (security_invoker = true) AS
SELECT c.name AS company, p.year, count(*) AS n
FROM public.fyp_company_interest i
JOIN public.companies c ON c.id = i.company_id
JOIN public.fyp_projects p ON p.id = i.project_id
WHERE p.review_status = 'published' AND p.relevance = 'in_scope'
GROUP BY c.name, p.year;

CREATE OR REPLACE VIEW public.v_fyp_supervisor_load
  WITH (security_invoker = true) AS
SELECT p.year, s.name AS supervisor, count(*) AS n
FROM public.fyp_projects p
JOIN public.professors s ON s.id = p.supervisor_id
WHERE p.review_status = 'published' AND p.relevance = 'in_scope'
GROUP BY p.year, s.name;

-- 7. Seed domain_track_map (Ram reviews and adjusts) ---------------------------
INSERT INTO public.domain_track_map (domain, track_slug) VALUES
  ('ai-ml',            'ai-ml-engineering'),
  ('nlp',              'ai-ml-engineering'),
  ('computer-vision',  'ai-ml-engineering'),
  ('data',             'data-science'),
  ('web',              'frontend-development'),
  ('web',              'backend-development'),
  ('mobile',           'mobile-development'),
  ('cybersecurity',    'cybersecurity'),
  ('iot',              'embedded-iot'),
  ('embedded',         'embedded-iot'),
  ('networks',         'systems-hardware-design'),
  ('networks',         'devops-cloud'),
  ('games',            'game-development'),
  ('ar-vr',            'game-development'),
  ('robotics',         'embedded-iot'),
  ('robotics',         'ai-ml-engineering'),
  ('blockchain',       'backend-development'),
  ('fintech',          'backend-development')
ON CONFLICT DO NOTHING;

-- 8. Professors: add missing columns for pipeline seeds ------------------------
ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS title         TEXT,
  ADD COLUMN IF NOT EXISTS is_simulated  BOOLEAN NOT NULL DEFAULT FALSE;
