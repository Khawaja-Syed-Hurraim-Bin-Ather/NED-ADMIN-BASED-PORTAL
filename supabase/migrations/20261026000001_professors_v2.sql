-- ============================================================================
-- EduCompass Migration: Professors V2 (Card M2)
-- Extends the professors table with M2 profile fields and adds the
-- professor_supervised_projects join table.
-- ============================================================================

-- 1. Extend professors table with new M2 fields
ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS slug         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS rank         TEXT,
  ADD COLUMN IF NOT EXISTS qualification TEXT,
  ADD COLUMN IF NOT EXISTS highlights   TEXT,
  ADD COLUMN IF NOT EXISTS selected_publications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS research_areas_source TEXT
    CHECK (research_areas_source IN ('stated','derived','stated+derived')),
  ADD COLUMN IF NOT EXISTS domain_tags  TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS area_tags    TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS name_status  TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (name_status IN ('confirmed','inferred','partial','missing')),
  ADD COLUMN IF NOT EXISTS consent_note TEXT;

-- GIN index on tag arrays for fast tag filtering
CREATE INDEX IF NOT EXISTS idx_professors_domain_tags  ON public.professors USING GIN(domain_tags);
CREATE INDEX IF NOT EXISTS idx_professors_area_tags    ON public.professors USING GIN(area_tags);
CREATE INDEX IF NOT EXISTS idx_professors_slug         ON public.professors (slug);

-- 2. Professor supervised projects
-- Stores FYDP titles and postgraduate project titles per professor.
-- No student names are stored here (Rule #6 / D6).
CREATE TABLE IF NOT EXISTS public.professor_supervised_projects (
  professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  year         INT,
  status       TEXT,
  kind         TEXT NOT NULL DEFAULT 'fydp'
    CHECK (kind IN ('fydp', 'postgraduate')),
  PRIMARY KEY (professor_id, title)
);

-- RLS on new table
ALTER TABLE public.professor_supervised_projects ENABLE ROW LEVEL SECURITY;

-- Public can read supervised projects for published professors only
CREATE POLICY "Public read published supervised projects"
  ON public.professor_supervised_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.professors p
      WHERE p.id = professor_id
        AND (p.review_status = 'published' OR p.review_status = 'approved')
    )
  );

-- Admin full access
CREATE POLICY "Admin full access supervised projects"
  ON public.professor_supervised_projects
  FOR ALL
  USING (public.is_admin());

-- 3. Update the professor tsvector trigger to include new text fields
CREATE OR REPLACE FUNCTION professor_trigger() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector('english',
    coalesce(NEW.name, '')          || ' ' ||
    coalesce(NEW.department, '')    || ' ' ||
    coalesce(array_to_string(NEW.research_areas, ' '), '') || ' ' ||
    coalesce(NEW.qualification, '') || ' ' ||
    coalesce(NEW.highlights, '')    || ' ' ||
    coalesce(array_to_string(NEW.domain_tags, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.area_tags, ' '), '')
  );
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger already exists from init_schema; recreating ensures updated function fires
DROP TRIGGER IF EXISTS tsvector_update_professor ON public.professors;
CREATE TRIGGER tsvector_update_professor
  BEFORE INSERT OR UPDATE ON public.professors
  FOR EACH ROW EXECUTE PROCEDURE professor_trigger();

-- 4. RLS: update published read policy to respect name_status
-- (A profile with name_status = 'missing' must never be published — enforced in loader and admin queue)
-- The existing policy already handles review_status; no structural change needed.
-- Comment for documentation:
-- DO NOT publish records where name_status = 'missing'. Admin queue must block this.

COMMENT ON COLUMN public.professors.name_status IS
  'confirmed | inferred | partial | missing. Records with name_status=missing must never be published (Rule M2).';
COMMENT ON COLUMN public.professors.domain_tags IS
  'Tags from the controlled FYP vocabulary (pipeline/vocab/domains.json). Used for match scoring.';
COMMENT ON COLUMN public.professors.area_tags IS
  'Proposed extended vocabulary tags (see EDUCOMPASS_PROFESSOR_PROFILES.md Section 5).';
COMMENT ON COLUMN public.professors.research_areas_source IS
  'stated = from source text; derived = inferred from publications/roles; stated+derived = both.';
