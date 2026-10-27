-- ============================================================================
-- EduCompass Student Planner Migration (Card M3)
-- SRS Reference: Student Semester Schedule Planner, RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_custom_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT NOT NULL DEFAULT 'My Degree Plan',
    target_graduation_term TEXT,
    max_credits_per_semester INT NOT NULL DEFAULT 18,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { semesterNumber: int, courseCodes: string[] }
    notes TEXT,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    total_planned_credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.student_custom_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Students can view their own plan
CREATE POLICY student_plans_select_policy ON public.student_custom_plans
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Students can insert their own plan
CREATE POLICY student_plans_insert_policy ON public.student_custom_plans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Students can update their own plan
CREATE POLICY student_plans_update_policy ON public.student_custom_plans
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Students can delete their own plan
CREATE POLICY student_plans_delete_policy ON public.student_custom_plans
    FOR DELETE USING (auth.uid() = user_id);

-- Admin Policy: Admins can view all plans for advising
CREATE POLICY student_plans_admin_policy ON public.student_custom_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );
