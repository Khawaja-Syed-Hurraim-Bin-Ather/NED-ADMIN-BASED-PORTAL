-- ============================================================================
-- EduCompass Database Schema Migration (F2)
-- Architecture: Supabase PostgreSQL + pgvector
-- SRS Reference: 5.2 Data Model, SEC-06 RLS, NFR-28, NFR-33
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. ENUMS & DOMAINS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('public', 'enrolled', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('extracted', 'flagged', 'approved', 'rejected', 'published');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE publication_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ----------------------------------------------------------------------------
-- D1: ACCOUNTS & ACCESS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'enrolled',
    university_id UUID,
    program_id UUID,
    current_semester INT DEFAULT 1,
    interests TEXT[] DEFAULT '{}',
    career_goal TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES public.profiles(id)
);

-- ----------------------------------------------------------------------------
-- D5: UNIVERSITIES, PROGRAMS, & COURSES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.universities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL,
    city TEXT DEFAULT 'Karachi',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. 'SE', 'CIS', 'CSE'
    name TEXT NOT NULL, -- e.g. 'BS Software Engineering'
    degree TEXT NOT NULL DEFAULT 'Bachelor',
    max_credits_per_semester INT NOT NULL DEFAULT 18,
    passing_grade TEXT NOT NULL DEFAULT 'D',
    grade_scale JSONB NOT NULL DEFAULT '{"A": 4.0, "A-": 3.7, "B+": 3.4, "B": 3.0, "B-": 2.7, "C+": 2.4, "C": 2.0, "C-": 1.7, "D+": 1.4, "D": 1.0, "F": 0.0}'::jsonb,
    publication_status publication_status NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(university_id, code)
);

CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- e.g. 'CS-101'
    code_normalized TEXT NOT NULL, -- e.g. 'cs101' (lowercase, no hyphen/spaces)
    title TEXT NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    semester INT NOT NULL, -- standard recommended semester (1-8)
    category TEXT NOT NULL DEFAULT 'core_computing', -- core_computing, mathematics, science, general_education, language, fyp, elective
    publication_status publication_status NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, code_normalized)
);

CREATE TABLE IF NOT EXISTS public.prerequisite_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
    rule_tree JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.semester_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
    semester_number INT NOT NULL,
    course_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(program_id, semester_number)
);

-- ----------------------------------------------------------------------------
-- D2: ACADEMIC RECORDS (Student completed / in-progress courses)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'completed', -- completed, in_progress, failed, not_taken
    grade TEXT,
    credit_hours INT NOT NULL DEFAULT 3,
    term TEXT, -- e.g. 'Fall 2024'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- ----------------------------------------------------------------------------
-- D3: FYP PROJECTS & SHORTLISTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fyp_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    abstract TEXT,
    supervisor TEXT,
    year INT NOT NULL,
    tools TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'completed',
    source_url TEXT,
    extracted_at TIMESTAMPTZ,
    review_status review_status NOT NULL DEFAULT 'approved',
    tsv TSVECTOR,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.fyp_shortlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.fyp_projects(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, project_id)
);

-- ----------------------------------------------------------------------------
-- D4: PROFESSORS & OUTREACH TRACKER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.professors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id UUID REFERENCES public.universities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    research_areas TEXT[] DEFAULT '{}',
    publications JSONB DEFAULT '[]'::jsonb,
    contact_route TEXT, -- mailto or official webpage
    source TEXT,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    review_status review_status NOT NULL DEFAULT 'approved',
    tsv TSVECTOR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outreach_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    professor_id UUID NOT NULL REFERENCES public.professors(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, contacted, replied, meeting
    subject TEXT,
    body TEXT,
    notes TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- D6: CAREER HUB & ROADMAPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_tracks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID NOT NULL REFERENCES public.career_tracks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_type TEXT NOT NULL, -- '6_to_12_months' or '2_to_4_years'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.roadmap_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    resources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(roadmap_id, order_index)
);

CREATE TABLE IF NOT EXISTS public.roadmap_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES public.roadmap_steps(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, step_id)
);

CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID REFERENCES public.career_tracks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    source_url TEXT,
    review_status review_status NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.repositories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    track_id UUID REFERENCES public.career_tracks(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    stars INT DEFAULT 0,
    review_status review_status NOT NULL DEFAULT 'approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chatbot_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_pattern TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    category TEXT,
    confidence_threshold FLOAT DEFAULT 0.8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- CHATBOT & KNOWLEDGE BASE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kb_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content TEXT NOT NULL,
    source_table TEXT NOT NULL,
    source_id UUID,
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chatbot_unanswered (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.llm_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    day DATE NOT NULL DEFAULT CURRENT_DATE,
    requests INT NOT NULL DEFAULT 1,
    tokens_in INT NOT NULL DEFAULT 0,
    tokens_out INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, day)
);

-- ----------------------------------------------------------------------------
-- ADMIN, PIPELINE & AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingestion_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    source_type TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ingestion_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID REFERENCES public.ingestion_files(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status review_status NOT NULL DEFAULT 'extracted',
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by UUID REFERENCES public.profiles(id),
    review_notes TEXT
);

CREATE TABLE IF NOT EXISTS public.dataset_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_tag TEXT NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- FULL-TEXT SEARCH & TSVECTOR TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION fyp_trigger() RETURNS trigger AS $$
BEGIN
    NEW.tsv := to_tsvector('english', coalesce(NEW.title, '') || ' ' || coalesce(NEW.abstract, '') || ' ' || coalesce(array_to_string(NEW.tags, ' '), ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update_fyp ON public.fyp_projects;
CREATE TRIGGER tsvector_update_fyp
BEFORE INSERT OR UPDATE ON public.fyp_projects
FOR EACH ROW EXECUTE PROCEDURE fyp_trigger();

CREATE OR REPLACE FUNCTION professor_trigger() RETURNS trigger AS $$
BEGIN
    NEW.tsv := to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.department, '') || ' ' || coalesce(array_to_string(NEW.research_areas, ' '), ''));
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update_professor ON public.professors;
CREATE TRIGGER tsvector_update_professor
BEFORE INSERT OR UPDATE ON public.professors
FOR EACH ROW EXECUTE PROCEDURE professor_trigger();

-- GIN Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_fyp_tsv ON public.fyp_projects USING gin(tsv);
CREATE INDEX IF NOT EXISTS idx_professor_tsv ON public.professors USING gin(tsv);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- SRS Reference: SEC-06, 100% of user data tables protected
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fyp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fyp_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prerequisite_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semester_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_unanswered ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

-- Helper function: Is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles: Users can view & update only their own profile; Admin can view all
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- 2. Deletion requests: Users can insert and read their own; Admin manages all
CREATE POLICY "Users view own deletion requests" ON public.deletion_requests
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users create deletion request" ON public.deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin manages deletion requests" ON public.deletion_requests
    FOR ALL USING (public.is_admin());

-- 3. Academic records: User sees/edits only their own records; Admin can read
CREATE POLICY "Users manage own academic records" ON public.academic_records
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- 4. FYP Shortlists: User manages own shortlist
CREATE POLICY "Users manage own FYP shortlist" ON public.fyp_shortlists
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- 5. Outreach tracker: User manages own outreach tracker
CREATE POLICY "Users manage own outreach" ON public.outreach_tracker
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- 6. Roadmap progress: User manages own career roadmap progress
CREATE POLICY "Users manage own roadmap progress" ON public.roadmap_progress
    FOR ALL USING (auth.uid() = user_id OR public.is_admin());

-- 7. Public Content Read Policies (Only Approved/Published content is visible to public)
CREATE POLICY "Public read published universities" ON public.universities
    FOR SELECT USING (true);

CREATE POLICY "Public read published programs" ON public.programs
    FOR SELECT USING (publication_status = 'published' OR public.is_admin());

CREATE POLICY "Public read published courses" ON public.courses
    FOR SELECT USING (publication_status = 'published' OR public.is_admin());

CREATE POLICY "Public read prerequisite rules" ON public.prerequisite_rules
    FOR SELECT USING (true);

CREATE POLICY "Public read semester plans" ON public.semester_plans
    FOR SELECT USING (true);

CREATE POLICY "Public read approved FYP projects" ON public.fyp_projects
    FOR SELECT USING (review_status = 'approved' OR review_status = 'published' OR public.is_admin());

CREATE POLICY "Public read approved professors" ON public.professors
    FOR SELECT USING (review_status = 'approved' OR review_status = 'published' OR public.is_admin());

CREATE POLICY "Public read career tracks" ON public.career_tracks
    FOR SELECT USING (true);

CREATE POLICY "Public read roadmaps" ON public.roadmaps
    FOR SELECT USING (true);

CREATE POLICY "Public read roadmap steps" ON public.roadmap_steps
    FOR SELECT USING (true);

CREATE POLICY "Public read approved articles" ON public.articles
    FOR SELECT USING (review_status = 'approved' OR review_status = 'published' OR public.is_admin());

CREATE POLICY "Public read approved repositories" ON public.repositories
    FOR SELECT USING (review_status = 'approved' OR review_status = 'published' OR public.is_admin());

CREATE POLICY "Public read chatbot answers" ON public.chatbot_answers
    FOR SELECT USING (true);

CREATE POLICY "Public read kb chunks" ON public.kb_chunks
    FOR SELECT USING (true);

-- 8. Admin-only tables: Audit log, Ingestion, Dataset versions, Sources, LLM Usage
CREATE POLICY "Admin full access audit log" ON public.audit_log
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admin full access ingestion files" ON public.ingestion_files
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admin full access ingestion records" ON public.ingestion_records
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admin full access dataset versions" ON public.dataset_versions
    FOR ALL USING (public.is_admin());

CREATE POLICY "Admin full access sources" ON public.sources
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users read own llm usage" ON public.llm_usage
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admin manages all llm usage" ON public.llm_usage
    FOR ALL USING (public.is_admin());

-- 9. Automatic profile creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN new.email = 'cursor.pro.test124@gmail.com' THEN 'admin'::user_role
      ELSE 'enrolled'::user_role
    END
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
