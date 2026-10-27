-- ============================================================================
-- EduCompass Migration: FYP Advanced (Card M1)
-- Adds fyp_team_ideas table for student team formation board.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fyp_team_ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    domain_tags TEXT[] NOT NULL DEFAULT '{}',
    team_size_wanted INT NOT NULL DEFAULT 3,
    contact_hint TEXT, -- e.g. "DM on WhatsApp" — no actual phone/email stored (Rule #3)
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Basic content length guard
    CONSTRAINT title_max_len CHECK (char_length(title) <= 200),
    CONSTRAINT description_max_len CHECK (char_length(description) <= 1000)
);

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_team_ideas_user ON public.fyp_team_ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_team_ideas_open ON public.fyp_team_ideas(is_open) WHERE is_open = TRUE;

-- Row Level Security
ALTER TABLE public.fyp_team_ideas ENABLE ROW LEVEL SECURITY;

-- Enrolled students can see all open ideas
CREATE POLICY team_ideas_select_policy ON public.fyp_team_ideas
    FOR SELECT USING (TRUE); -- public read (unauthenticated can browse)

-- Enrolled students can create their own ideas
CREATE POLICY team_ideas_insert_policy ON public.fyp_team_ideas
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('enrolled', 'admin')
        )
    );

-- Only the author can update their own idea
CREATE POLICY team_ideas_update_policy ON public.fyp_team_ideas
    FOR UPDATE USING (auth.uid() = user_id);

-- Only the author or admin can delete an idea
CREATE POLICY team_ideas_delete_policy ON public.fyp_team_ideas
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
