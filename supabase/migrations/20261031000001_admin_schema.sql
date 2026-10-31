-- ============================================================================
-- EduCompass Admin Panel: Migration 1 of 3 — Schema
-- Card A2 | 2026-10-31
-- Adds: departments, admin_users, invitations, step_up, login events,
--       curriculum versioning tables, domain_track_map PK,
--       column additions to all content tables, audit_log hardening.
-- NEVER changes data in student tables.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. DEPARTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,          -- 'CIS'
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
-- RLS policy for departments added after admin_users is created (see end of file)

-- Public: deny (no read needed by student site)

-- ---------------------------------------------------------------------------
-- 2. ADMIN_USERS (separate from profiles — never mixed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_users (
  id               UUID PRIMARY KEY,              -- same UUID as auth.users
  email            TEXT UNIQUE NOT NULL,
  full_name        TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('vc','chairman','operator')),
  department_id    UUID REFERENCES public.departments(id),
  allowed_modules  TEXT[] NOT NULL DEFAULT '{}',  -- for operators only
  status           TEXT NOT NULL DEFAULT 'invited'
                   CHECK (status IN ('invited','active','suspended','deactivated')),
  invited_by       UUID REFERENCES public.admin_users(id),
  last_login_at    TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- VC need not have department_id; chairman and operator must
  CONSTRAINT dept_required CHECK (role = 'vc' OR department_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email       ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_dept_role   ON public.admin_users(department_id, role);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can only view their own row (server uses service role)
CREATE POLICY "Admin user views own row"
  ON public.admin_users FOR SELECT
  USING (id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS (security definer — used in RLS throughout)
-- ---------------------------------------------------------------------------

-- Returns the role of the current admin session ('vc','chairman','operator', or NULL)
CREATE OR REPLACE FUNCTION public.admin_role()
RETURNS TEXT AS $$
  SELECT role FROM public.admin_users
  WHERE id = auth.uid() AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns the department_id of the current admin
CREATE OR REPLACE FUNCTION public.admin_department()
RETURNS UUID AS $$
  SELECT department_id FROM public.admin_users
  WHERE id = auth.uid() AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns TRUE if admin is active
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns TRUE if the current operator has the given module assigned
CREATE OR REPLACE FUNCTION public.allowed_module(module TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid()
      AND status = 'active'
      AND (role IN ('vc','chairman') OR module = ANY(allowed_modules))
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------------------------------------------------------------------------
-- 4. ADMIN_INVITATIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_invitations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('chairman','operator')),
  department_id   UUID NOT NULL REFERENCES public.departments(id),
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  invited_by      UUID NOT NULL REFERENCES public.admin_users(id),
  token_hash      TEXT NOT NULL,   -- bcrypt hash of the single-use token
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  used_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.admin_invitations(email);

ALTER TABLE public.admin_invitations ENABLE ROW LEVEL SECURITY;
-- Only service role (server) reads/writes invitations; deny all client access
CREATE POLICY "Deny all client access to invitations"
  ON public.admin_invitations FOR ALL USING (FALSE);

-- ---------------------------------------------------------------------------
-- 5. STEP-UP CHALLENGES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.step_up_challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL,   -- 'approve','publish','delete','purge','rollback','user_mgmt','settings'
  code_hash   TEXT NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_stepup_admin ON public.step_up_challenges(admin_id);

ALTER TABLE public.step_up_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny all client access to step_up"
  ON public.step_up_challenges FOR ALL USING (FALSE);

-- ---------------------------------------------------------------------------
-- 6. ADMIN LOGIN EVENTS (audit of auth events; never PII)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_login_events (
  id          BIGSERIAL PRIMARY KEY,
  at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_hash  TEXT,          -- sha256 of email, NOT the email itself
  admin_id    UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  event       TEXT NOT NULL, -- login_ok, login_fail, otp_ok, otp_fail, locked, step_up_ok, step_up_fail, logout
  ip_hash     TEXT,          -- sha256 of IP
  user_agent  TEXT
);

CREATE INDEX IF NOT EXISTS idx_login_events_admin  ON public.admin_login_events(admin_id);
CREATE INDEX IF NOT EXISTS idx_login_events_at     ON public.admin_login_events(at DESC);

ALTER TABLE public.admin_login_events ENABLE ROW LEVEL SECURITY;
-- Immutable append-only: deny UPDATE and DELETE from all client roles
CREATE POLICY "Deny all client access to login events"
  ON public.admin_login_events FOR ALL USING (FALSE);

-- ---------------------------------------------------------------------------
-- 7. CURRICULUM VERSIONING — course_master
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_master (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT UNIQUE NOT NULL,   -- 'CS-218'
  code_normalized      TEXT UNIQUE NOT NULL,   -- 'cs218'
  title                TEXT NOT NULL,
  owner_department_id  UUID NOT NULL REFERENCES public.departments(id),
  description          TEXT,
  credits_theory       INT,
  credits_practical    INT,
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','archived')),
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_master_dept ON public.course_master(owner_department_id);

ALTER TABLE public.course_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active courses"
  ON public.course_master FOR SELECT
  USING (status = 'active' AND deleted_at IS NULL);

-- ---------------------------------------------------------------------------
-- 8. CURRICULUM_VERSIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.curriculum_versions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id              UUID NOT NULL REFERENCES public.programs(id) ON DELETE RESTRICT,
  name                    TEXT NOT NULL,            -- 'Scheme 2022'
  revision                INT NOT NULL DEFAULT 1,
  status                  TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','in_review','published','archived')),
  based_on                UUID REFERENCES public.curriculum_versions(id),
  grade_scale             JSONB,                    -- null = inherit from programs
  passing_grade           TEXT,
  max_credits_per_semester INT,
  graduation_rules        JSONB,                    -- degree predictor settings
  chart_layout            JSONB,
  release_id              UUID,                     -- set on publish; FK added later (circular)
  published_at            TIMESTAMPTZ,
  created_by              UUID REFERENCES public.admin_users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_id, name, revision)
);

CREATE INDEX IF NOT EXISTS idx_cv_program ON public.curriculum_versions(program_id, status);

ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published versions"
  ON public.curriculum_versions FOR SELECT
  USING (status = 'published');
CREATE POLICY "Admin read own department versions"
  ON public.curriculum_versions FOR SELECT
  USING (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 9. CURRICULUM_COURSES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.curriculum_courses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id       UUID NOT NULL REFERENCES public.curriculum_versions(id) ON DELETE CASCADE,
  course_id        UUID NOT NULL REFERENCES public.course_master(id),
  semester         INT NOT NULL CHECK (semester BETWEEN 1 AND 12),
  credits          NUMERIC(3,1),
  category         TEXT,
  elective_group_id UUID,   -- FK added after elective_groups is created
  slot             JSONB,   -- {col, band, row} chart position
  UNIQUE (version_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_cc_version ON public.curriculum_courses(version_id);

ALTER TABLE public.curriculum_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read curriculum courses of published version"
  ON public.curriculum_courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.curriculum_versions cv
      WHERE cv.id = version_id AND cv.status = 'published'
    )
  );
CREATE POLICY "Admin read curriculum courses"
  ON public.curriculum_courses FOR SELECT
  USING (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 10. ELECTIVE_GROUPS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.elective_groups (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id   UUID NOT NULL REFERENCES public.curriculum_versions(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  choose_count INT NOT NULL DEFAULT 1
);

-- Now add the FK from curriculum_courses
ALTER TABLE public.curriculum_courses
  ADD CONSTRAINT fk_cc_elective_group
  FOREIGN KEY (elective_group_id) REFERENCES public.elective_groups(id);

ALTER TABLE public.elective_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read elective groups"
  ON public.elective_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.curriculum_versions cv
      WHERE cv.id = version_id AND cv.status = 'published'
    )
  );

-- ---------------------------------------------------------------------------
-- 11. BATCHES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.batches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id            UUID NOT NULL REFERENCES public.programs(id),
  admission_year        INT NOT NULL,
  label                 TEXT NOT NULL,           -- 'Batch 2022'
  curriculum_version_id UUID NOT NULL REFERENCES public.curriculum_versions(id),
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','archived')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (program_id, admission_year)
);

CREATE INDEX IF NOT EXISTS idx_batches_program ON public.batches(program_id, status);

ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active batches"
  ON public.batches FOR SELECT
  USING (status = 'active');
CREATE POLICY "Admin read all batches"
  ON public.batches FOR SELECT
  USING (public.is_active_admin());

-- 11a. Add batch_id to profiles (NULL = not yet selected; student picks on first login)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.batches(id);

-- ---------------------------------------------------------------------------
-- 12. COURSE_EQUIVALENCES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.course_equivalences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_version_id UUID REFERENCES public.curriculum_versions(id),
  from_course_id  UUID REFERENCES public.course_master(id),
  to_version_id   UUID REFERENCES public.curriculum_versions(id),
  to_course_id    UUID REFERENCES public.course_master(id),
  relation        TEXT NOT NULL CHECK (relation IN ('same','replaced_by','split','merged'))
);

ALTER TABLE public.course_equivalences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read course equivalences"
  ON public.course_equivalences FOR SELECT USING (TRUE);

-- ---------------------------------------------------------------------------
-- 13. ADD version_id TO prerequisite_rules
-- ---------------------------------------------------------------------------
ALTER TABLE public.prerequisite_rules
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.curriculum_versions(id);

-- Index for version-scoped lookups
CREATE INDEX IF NOT EXISTS idx_prereq_version ON public.prerequisite_rules(version_id);

-- Note: After backfill (migration 3), we will add:
-- ALTER TABLE public.prerequisite_rules DROP CONSTRAINT IF EXISTS prerequisite_rules_course_id_key;
-- ALTER TABLE public.prerequisite_rules ADD UNIQUE (version_id, course_id);
-- We do NOT add the unique constraint now because version_id is NULL until backfill.

-- ---------------------------------------------------------------------------
-- 14. ADD department_id TO programs
-- ---------------------------------------------------------------------------
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- ---------------------------------------------------------------------------
-- 15. COLUMN ADDITIONS TO CONTENT TABLES
-- (department_id, deleted_at, delete_state, updated_by, updated_at)
-- ---------------------------------------------------------------------------

-- 15a. fyp_projects
ALTER TABLE public.fyp_projects
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,  -- references admin_users; no FK to avoid circular dep
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- 15b. professors
ALTER TABLE public.professors
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- 15c. career_tracks
ALTER TABLE public.career_tracks
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS review_status  TEXT NOT NULL DEFAULT 'published'
    CHECK (review_status IN ('draft','approved','published','archived')),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- 15d. roadmap_steps
ALTER TABLE public.roadmap_steps
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID;

-- 15e. articles
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- 15f. repositories
ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- 15g. chatbot_answers
ALTER TABLE public.chatbot_answers
  ADD COLUMN IF NOT EXISTS department_id  UUID REFERENCES public.departments(id),
  ADD COLUMN IF NOT EXISTS review_status  TEXT NOT NULL DEFAULT 'published'
    CHECK (review_status IN ('draft','approved','published','archived')),
  ADD COLUMN IF NOT EXISTS deleted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delete_state   TEXT
    CHECK (delete_state IN ('cooling_off','ready_to_purge','purged') OR delete_state IS NULL),
  ADD COLUMN IF NOT EXISTS updated_by     UUID,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 16. DOMAIN_TRACK_MAP — add id PK and department_id
-- ---------------------------------------------------------------------------
-- Add surrogate PK (was no PK before)
ALTER TABLE public.domain_track_map
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Make it PK only if it doesn't already have one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'domain_track_map' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.domain_track_map ADD PRIMARY KEY (id);
  END IF;
END $$;

ALTER TABLE public.domain_track_map
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id);

-- ---------------------------------------------------------------------------
-- 17. AUDIT_LOG HARDENING
-- (Add new columns; add immutability trigger; revoke destructive privs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS seq         BIGSERIAL,   -- ordering column (id stays uuid)
  ADD COLUMN IF NOT EXISTS actor_role  TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS resource    TEXT,        -- e.g. 'fyp','curriculum','professor'
  ADD COLUMN IF NOT EXISTS record_id   UUID,
  ADD COLUMN IF NOT EXISTS result      TEXT,        -- 'allow' | 'deny' | 'error'
  ADD COLUMN IF NOT EXISTS ip_hash     TEXT;        -- sha256 of IP, never raw

-- Immutability: no UPDATE or DELETE on audit_log, ever.
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_audit_immutable ON public.audit_log;
CREATE TRIGGER enforce_audit_immutable
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- Revoke destructive privileges from all non-service roles
REVOKE UPDATE, DELETE ON public.audit_log FROM anon, authenticated;

-- Also revoke for admin_login_events
CREATE OR REPLACE FUNCTION public.login_events_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'admin_login_events is immutable: UPDATE and DELETE are not permitted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_login_events_immutable ON public.admin_login_events;
CREATE TRIGGER enforce_login_events_immutable
  BEFORE UPDATE OR DELETE ON public.admin_login_events
  FOR EACH ROW EXECUTE FUNCTION public.login_events_immutable();

-- ---------------------------------------------------------------------------
-- 18. UPDATE existing public read policies on content tables to respect deleted_at
-- ---------------------------------------------------------------------------

-- FYP projects: hide soft-deleted records from students
DROP POLICY IF EXISTS "Public read approved FYP projects" ON public.fyp_projects;
CREATE POLICY "Public read approved FYP projects"
  ON public.fyp_projects FOR SELECT
  USING (
    (review_status = 'approved' OR review_status = 'published')
    AND deleted_at IS NULL
    AND (public.is_admin() OR NOT public.is_active_admin())
  );

-- Professors: hide soft-deleted
DROP POLICY IF EXISTS "Public read approved professors" ON public.professors;
CREATE POLICY "Public read approved professors"
  ON public.professors FOR SELECT
  USING (
    (review_status = 'approved' OR review_status = 'published')
    AND deleted_at IS NULL
  );

-- Articles / repositories: hide soft-deleted
DROP POLICY IF EXISTS "Public read approved articles" ON public.articles;
CREATE POLICY "Public read approved articles"
  ON public.articles FOR SELECT
  USING (
    (review_status = 'approved' OR review_status = 'published')
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "Public read approved repositories" ON public.repositories;
CREATE POLICY "Public read approved repositories"
  ON public.repositories FOR SELECT
  USING (
    (review_status = 'approved' OR review_status = 'published')
    AND deleted_at IS NULL
  );

-- Chatbot answers: hide soft-deleted and drafts
DROP POLICY IF EXISTS "Public read chatbot answers" ON public.chatbot_answers;
CREATE POLICY "Public read chatbot answers"
  ON public.chatbot_answers FOR SELECT
  USING (
    review_status = 'published'
    AND deleted_at IS NULL
  );

-- Career tracks: hide soft-deleted
DROP POLICY IF EXISTS "Public read career tracks" ON public.career_tracks;
CREATE POLICY "Public read career tracks"
  ON public.career_tracks FOR SELECT
  USING (
    review_status = 'published'
    AND deleted_at IS NULL
  );

COMMENT ON TABLE public.departments IS 'University departments. CIS is the first; add more with the VC wizard.';
COMMENT ON TABLE public.admin_users IS 'Admin-panel users (vc, chairman, operator). Separate from student profiles.';
COMMENT ON TABLE public.curriculum_versions IS 'Named, versioned curriculum snapshots. Published versions are immutable.';
COMMENT ON TABLE public.batches IS 'Admission-year groups bound to a curriculum version.';
COMMENT ON COLUMN public.profiles.batch_id IS 'NULL until student selects on first login. Determines curriculum version.';

-- ---------------------------------------------------------------------------
-- 19. DEPARTMENTS RLS (must be added after admin_users exists)
-- ---------------------------------------------------------------------------
CREATE POLICY "VC full access departments"
  ON public.departments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid() AND au.role = 'vc' AND au.status = 'active'
    )
  );

