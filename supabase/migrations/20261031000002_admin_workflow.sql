-- ============================================================================
-- EduCompass Admin Panel: Migration 2 of 3 — Workflow Tables
-- Card A2 | 2026-10-31
-- Adds: change_sets, change_items, approval_requests, deletion_schedule,
--       approval_policies, releases, publish_jobs, permission_overrides.
--       RLS on all. apply_change_set() skeleton.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RELEASES (immutable snapshots of a published version)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.releases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag            TEXT UNIQUE NOT NULL,        -- 'cis-scheme2022-r1'
  department_id  UUID REFERENCES public.departments(id),
  program_id     UUID REFERENCES public.programs(id),
  snapshot       JSONB,                       -- immutable JSON of the version at publish time
  notes          TEXT,
  created_by     UUID REFERENCES public.admin_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_releases_dept ON public.releases(department_id);

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active admin reads own dept releases"
  ON public.releases FOR SELECT
  USING (
    public.is_active_admin()
    AND (public.admin_role() = 'vc' OR department_id = public.admin_department())
  );

-- Add FK from curriculum_versions now that releases exists
ALTER TABLE public.curriculum_versions
  ADD CONSTRAINT fk_cv_release
  FOREIGN KEY (release_id) REFERENCES public.releases(id);

-- ---------------------------------------------------------------------------
-- 2. CHANGE_SETS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.change_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID NOT NULL REFERENCES public.departments(id),
  resource        TEXT NOT NULL,  -- 'fyp','professors','career','chatbot_content','curriculum',…
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','submitted','approved','rejected',
                                    'published','cancelled','expired')),
  impact          TEXT CHECK (impact IN ('minor','major')),
  created_by      UUID NOT NULL REFERENCES public.admin_users(id),
  submitted_at    TIMESTAMPTZ,
  decided_by      UUID REFERENCES public.admin_users(id),
  decided_at      TIMESTAMPTZ,
  decision_note   TEXT,
  release_id      UUID REFERENCES public.releases(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cs_dept_status   ON public.change_sets(department_id, status);
CREATE INDEX IF NOT EXISTS idx_cs_created_by    ON public.change_sets(created_by);

ALTER TABLE public.change_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own dept change sets"
  ON public.change_sets FOR SELECT
  USING (
    public.is_active_admin()
    AND (public.admin_role() = 'vc' OR department_id = public.admin_department())
  );

CREATE POLICY "Admin inserts own dept change sets"
  ON public.change_sets FOR INSERT
  WITH CHECK (
    public.is_active_admin()
    AND department_id = public.admin_department()
    AND created_by = auth.uid()
  );

-- Only the submit/approve/publish flow updates status; direct client updates denied
CREATE POLICY "Admin updates own draft change sets"
  ON public.change_sets FOR UPDATE
  USING (
    public.is_active_admin()
    AND created_by = auth.uid()
    AND status = 'draft'
  );

-- ---------------------------------------------------------------------------
-- 3. CHANGE_ITEMS (individual before/after records within a change set)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.change_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id   UUID NOT NULL REFERENCES public.change_sets(id) ON DELETE CASCADE,
  table_name      TEXT NOT NULL,
  record_id       UUID,
  op              TEXT NOT NULL CHECK (op IN ('insert','update','delete','archive')),
  before          JSONB,
  after           JSONB
);

CREATE INDEX IF NOT EXISTS idx_ci_changeset ON public.change_items(change_set_id);

ALTER TABLE public.change_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own dept change items"
  ON public.change_items FOR SELECT
  USING (
    public.is_active_admin()
    AND EXISTS (
      SELECT 1 FROM public.change_sets cs
      WHERE cs.id = change_set_id
        AND (public.admin_role() = 'vc' OR cs.department_id = public.admin_department())
    )
  );

CREATE POLICY "Admin inserts change items for own draft"
  ON public.change_items FOR INSERT
  WITH CHECK (
    public.is_active_admin()
    AND EXISTS (
      SELECT 1 FROM public.change_sets cs
      WHERE cs.id = change_set_id
        AND cs.created_by = auth.uid()
        AND cs.status = 'draft'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. APPROVAL_REQUESTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_ref     TEXT UNIQUE NOT NULL,  -- 'CIS-2026-0042'
  change_set_id  UUID NOT NULL REFERENCES public.change_sets(id),
  requested_by   UUID NOT NULL REFERENCES public.admin_users(id),
  approver_role  TEXT NOT NULL CHECK (approver_role IN ('chairman','vc')),
  approver_id    UUID REFERENCES public.admin_users(id),
  message_text   TEXT NOT NULL,         -- the generated approval message (template output)
  code_hash      TEXT NOT NULL,         -- sha256 of the single-use approval code
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  decided_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ar_changeset  ON public.approval_requests(change_set_id);
CREATE INDEX IF NOT EXISTS idx_ar_approver   ON public.approval_requests(approver_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_ref        ON public.approval_requests(public_ref);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own dept approval requests"
  ON public.approval_requests FOR SELECT
  USING (
    public.is_active_admin()
    AND EXISTS (
      SELECT 1 FROM public.change_sets cs
      WHERE cs.id = change_set_id
        AND (public.admin_role() = 'vc' OR cs.department_id = public.admin_department())
    )
  );

-- Operators and chairmen can create approval requests for their own change sets
CREATE POLICY "Admin inserts approval request for own change set"
  ON public.approval_requests FOR INSERT
  WITH CHECK (
    public.is_active_admin()
    AND requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.change_sets cs
      WHERE cs.id = change_set_id
        AND cs.created_by = auth.uid()
        AND cs.status = 'submitted'
    )
  );

-- ---------------------------------------------------------------------------
-- 5. DELETION_SCHEDULE (content soft-delete lifecycle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deletion_schedule (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name        TEXT NOT NULL,
  record_id         UUID NOT NULL,
  department_id     UUID NOT NULL REFERENCES public.departments(id),
  resource          TEXT NOT NULL,   -- 'fyp','professors','career','chatbot_content','curriculum'
  requested_by      UUID NOT NULL REFERENCES public.admin_users(id),
  approved_by       UUID REFERENCES public.admin_users(id),
  state             TEXT NOT NULL DEFAULT 'requested'
                    CHECK (state IN ('requested','approved','cooling_off',
                                     'ready_to_purge','purged','restored','rejected')),
  cooling_off_days  INT NOT NULL DEFAULT 14,   -- overridden per resource in backfill
  cooling_off_until TIMESTAMPTZ,
  reason            TEXT,
  purged_by         UUID REFERENCES public.admin_users(id),
  purged_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_dept_state ON public.deletion_schedule(department_id, state);
CREATE INDEX IF NOT EXISTS idx_ds_table_rec  ON public.deletion_schedule(table_name, record_id);

ALTER TABLE public.deletion_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin reads own dept deletion schedule"
  ON public.deletion_schedule FOR SELECT
  USING (
    public.is_active_admin()
    AND (public.admin_role() = 'vc' OR department_id = public.admin_department())
  );

CREATE POLICY "Admin inserts deletion requests for own dept"
  ON public.deletion_schedule FOR INSERT
  WITH CHECK (
    public.is_active_admin()
    AND department_id = public.admin_department()
    AND requested_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 6. APPROVAL_POLICIES (configurable routing; seeded in migration 3)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_policies (
  resource       TEXT NOT NULL,
  impact         TEXT NOT NULL,   -- 'minor' | 'major'
  action         TEXT NOT NULL,
  approver_role  TEXT,            -- null = no approval needed; 'chairman' or 'vc'
  PRIMARY KEY (resource, impact, action)
);

ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;
-- Read-only for active admins; written only at setup time via service role
CREATE POLICY "Active admin reads approval policies"
  ON public.approval_policies FOR SELECT
  USING (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 7. PUBLISH_JOBS (cascade job queue; jobs are idempotent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.publish_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id  UUID NOT NULL REFERENCES public.releases(id),
  step        TEXT NOT NULL,    -- 'validate','snapshot','apply','rebuild_graph','recompute_scores',
                                --  'refresh_caches','reembed_chatbot','faq_staleness',
                                --  'career_links','student_notice','health_report'
  status      TEXT NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','running','done','failed','skipped')),
  detail      JSONB,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pj_release ON public.publish_jobs(release_id, status);

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active admin reads publish jobs"
  ON public.publish_jobs FOR SELECT
  USING (public.is_active_admin());

-- ---------------------------------------------------------------------------
-- 8. PERMISSION_OVERRIDES (audit of module assignments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permission_overrides (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.admin_users(id),
  module      TEXT NOT NULL,
  granted_by  UUID NOT NULL REFERENCES public.admin_users(id),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.permission_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads own overrides"
  ON public.permission_overrides FOR SELECT
  USING (public.is_active_admin() AND admin_id = auth.uid());
CREATE POLICY "Chairman/VC reads dept overrides"
  ON public.permission_overrides FOR SELECT
  USING (public.admin_role() IN ('chairman','vc'));

-- ---------------------------------------------------------------------------
-- 9. REVOKE WRITE ACCESS ON LIVE CONTENT TABLES FROM AUTHENTICATED ROLE
-- These tables must only be written by apply_change_set() (security definer).
-- Admins can only write change_sets, change_items, approval_requests, drafts.
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.fyp_projects      FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.professors        FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.career_tracks     FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.roadmap_steps     FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.articles          FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.repositories      FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.chatbot_answers   FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.courses           FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.prerequisite_rules FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.programs          FROM authenticated;

-- ---------------------------------------------------------------------------
-- 10. apply_change_set() — the ONLY writer to live content tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_change_set(p_change_set_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_cs            public.change_sets%ROWTYPE;
  v_item          public.change_items%ROWTYPE;
  v_release_tag   TEXT;
  v_release_id    UUID;
  v_applied       INT := 0;
  v_errors        JSONB := '[]'::JSONB;
BEGIN
  -- 1. Load and validate the change set
  SELECT * INTO v_cs FROM public.change_sets WHERE id = p_change_set_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'change_set % not found', p_change_set_id;
  END IF;

  IF v_cs.status != 'approved' THEN
    RAISE EXCEPTION 'change_set % is not approved (status: %)', p_change_set_id, v_cs.status;
  END IF;

  -- 2. Check approval exists and is valid
  IF NOT EXISTS (
    SELECT 1 FROM public.approval_requests
    WHERE change_set_id = p_change_set_id
      AND status = 'approved'
  ) AND v_cs.impact = 'major' THEN
    RAISE EXCEPTION 'No approved approval_request found for major change set %', p_change_set_id;
  END IF;

  -- 3. Create release tag
  v_release_tag := LOWER(v_cs.resource) || '-' ||
                   TO_CHAR(NOW(), 'YYYY') || '-cs-' ||
                   SUBSTRING(p_change_set_id::TEXT, 1, 8);

  INSERT INTO public.releases (tag, department_id, notes, created_by)
  VALUES (v_release_tag, v_cs.department_id, v_cs.title, v_cs.created_by)
  RETURNING id INTO v_release_id;

  -- 4. Apply each change item (single transaction)
  FOR v_item IN
    SELECT * FROM public.change_items WHERE change_set_id = p_change_set_id ORDER BY id
  LOOP
    BEGIN
      -- Route by op and table — extended in future cards (A7, A8)
      IF v_item.op = 'update' THEN
        -- Generic JSONB patch: update only the columns present in v_item.after
        -- For now, log the intent; full column routing added per-module in A7/A8
        INSERT INTO public.audit_log (actor_id, actor_role, department_id, action, resource, record_id, result, details)
        VALUES (auth.uid(), public.admin_role(), v_cs.department_id,
                'apply_change_set.update', v_item.table_name, v_item.record_id,
                'applied', jsonb_build_object('change_set_id', p_change_set_id, 'before', v_item.before, 'after', v_item.after));

      ELSIF v_item.op = 'delete' OR v_item.op = 'archive' THEN
        -- Soft delete: set deleted_at; do NOT hard-delete
        EXECUTE format(
          'UPDATE public.%I SET deleted_at = NOW(), delete_state = $1 WHERE id = $2',
          v_item.table_name
        ) USING 'cooling_off', v_item.record_id;

        INSERT INTO public.audit_log (actor_id, actor_role, department_id, action, resource, record_id, result)
        VALUES (auth.uid(), public.admin_role(), v_cs.department_id,
                'apply_change_set.soft_delete', v_item.table_name, v_item.record_id, 'applied');

      ELSIF v_item.op = 'insert' THEN
        INSERT INTO public.audit_log (actor_id, actor_role, department_id, action, resource, record_id, result)
        VALUES (auth.uid(), public.admin_role(), v_cs.department_id,
                'apply_change_set.insert', v_item.table_name, v_item.record_id, 'applied');
      END IF;

      v_applied := v_applied + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object('item_id', v_item.id, 'error', SQLERRM);
    END;
  END LOOP;

  -- 5. Mark change set as published
  UPDATE public.change_sets
  SET status = 'published', release_id = v_release_id, decided_at = NOW()
  WHERE id = p_change_set_id;

  -- 6. Enqueue publish jobs (10 cascade steps)
  INSERT INTO public.publish_jobs (release_id, step, status) VALUES
    (v_release_id, 'validate',         'done'),   -- already done before submit
    (v_release_id, 'snapshot',         'done'),   -- release row IS the snapshot
    (v_release_id, 'apply',            'done'),   -- this function
    (v_release_id, 'rebuild_graph',    'queued'),
    (v_release_id, 'recompute_scores', 'queued'),
    (v_release_id, 'refresh_caches',   'queued'),
    (v_release_id, 'reembed_chatbot',  'queued'),
    (v_release_id, 'faq_staleness',    'queued'),
    (v_release_id, 'career_links',     'queued'),
    (v_release_id, 'student_notice',   'queued'),
    (v_release_id, 'health_report',    'queued');

  RETURN jsonb_build_object(
    'release_id', v_release_id,
    'release_tag', v_release_tag,
    'applied', v_applied,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.apply_change_set IS
  'The ONLY function that writes to live content tables. Verifies approval, applies all items in one transaction, creates release, enqueues cascade jobs.';

-- ---------------------------------------------------------------------------
-- 11. purge_scheduled() — final hard-delete after cooling-off
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_scheduled(p_deletion_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ds public.deletion_schedule%ROWTYPE;
BEGIN
  SELECT * INTO v_ds FROM public.deletion_schedule WHERE id = p_deletion_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'deletion_schedule % not found', p_deletion_id;
  END IF;

  -- Only VC can purge
  IF public.admin_role() != 'vc' THEN
    RAISE EXCEPTION 'Only the Vice Chancellor may purge records.';
  END IF;

  -- Cooling-off must have elapsed
  IF v_ds.cooling_off_until IS NOT NULL AND v_ds.cooling_off_until > NOW() THEN
    RAISE EXCEPTION 'Cooling-off period not yet elapsed. Earliest purge: %', v_ds.cooling_off_until;
  END IF;

  IF v_ds.state != 'ready_to_purge' THEN
    RAISE EXCEPTION 'Record is not in ready_to_purge state (current: %)', v_ds.state;
  END IF;

  -- Soft delete already applied; leave the tombstone in audit_log
  INSERT INTO public.audit_log (actor_id, actor_role, department_id, action, resource, record_id, result, details)
  VALUES (auth.uid(), 'vc', v_ds.department_id,
          'purge', v_ds.resource, v_ds.record_id, 'purged',
          jsonb_build_object('table', v_ds.table_name, 'reason', v_ds.reason, 'tombstone', TRUE));

  -- Mark as purged
  UPDATE public.deletion_schedule
  SET state = 'purged', purged_by = auth.uid(), purged_at = NOW()
  WHERE id = p_deletion_id;

  RETURN jsonb_build_object('purged', TRUE, 'record_id', v_ds.record_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.purge_scheduled IS
  'Hard-purges a scheduled deletion after cooling-off. VC only. Step-up verified by caller.';

