-- ══════════════════════════════════════════════════════════════════════
--  RLS POLICIES — Michal Tasks
--  Run this in Supabase SQL Editor (or include in migration pipeline).
--  Principle: each user can only see/modify rows in their own workspaces.
-- ══════════════════════════════════════════════════════════════════════

-- Helper: returns workspace IDs where the current user is a member.
CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(workspace_id), '{}')
  FROM workspace_members
  WHERE user_id = auth.uid();
$$;

-- Helper: returns workspace IDs where the current user is owner or admin.
CREATE OR REPLACE FUNCTION public.user_admin_workspace_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(workspace_id), '{}')
  FROM workspace_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin');
$$;

-- ── workspaces ─────────────────────────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (id = ANY(public.user_admin_workspace_ids()));

-- ── workspace_members ──────────────────────────────────────────────────
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select" ON workspace_members;
CREATE POLICY "members_select" ON workspace_members FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- Only admins/owners may add or change members.
DROP POLICY IF EXISTS "members_insert" ON workspace_members;
CREATE POLICY "members_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_admin_workspace_ids()));

DROP POLICY IF EXISTS "members_update" ON workspace_members;
CREATE POLICY "members_update" ON workspace_members FOR UPDATE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()));

DROP POLICY IF EXISTS "members_delete" ON workspace_members;
CREATE POLICY "members_delete" ON workspace_members FOR DELETE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()));

-- ── workspace_invites ──────────────────────────────────────────────────
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_select" ON workspace_invites;
CREATE POLICY "invites_select" ON workspace_invites FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "invites_insert" ON workspace_invites;
CREATE POLICY "invites_insert" ON workspace_invites FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_admin_workspace_ids()));

DROP POLICY IF EXISTS "invites_delete" ON workspace_invites;
CREATE POLICY "invites_delete" ON workspace_invites FOR DELETE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()));

-- ── tasks ──────────────────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── projects ───────────────────────────────────────────────────────────
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "projects_select" ON projects;
CREATE POLICY "projects_select" ON projects FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "projects_delete" ON projects;
CREATE POLICY "projects_delete" ON projects FOR DELETE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()));

-- ── notes ──────────────────────────────────────────────────────────────
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select" ON notes;
CREATE POLICY "notes_select" ON notes FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── tags ───────────────────────────────────────────────────────────────
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_select" ON tags;
CREATE POLICY "tags_select" ON tags FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tags_update" ON tags;
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "tags_delete" ON tags;
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── task_tags ──────────────────────────────────────────────────────────
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_tags_select" ON task_tags;
CREATE POLICY "task_tags_select" ON task_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.workspace_id = ANY(public.user_workspace_ids())
  ));

DROP POLICY IF EXISTS "task_tags_insert" ON task_tags;
CREATE POLICY "task_tags_insert" ON task_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.workspace_id = ANY(public.user_workspace_ids())
  ));

DROP POLICY IF EXISTS "task_tags_delete" ON task_tags;
CREATE POLICY "task_tags_delete" ON task_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.workspace_id = ANY(public.user_workspace_ids())
  ));

-- ── attachments ────────────────────────────────────────────────────────
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attachments_select" ON attachments;
CREATE POLICY "attachments_select" ON attachments FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "attachments_insert" ON attachments;
CREATE POLICY "attachments_insert" ON attachments FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "attachments_delete" ON attachments;
CREATE POLICY "attachments_delete" ON attachments FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── user_profiles ──────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_workspace_member" ON user_profiles;
CREATE POLICY "profiles_select_self_or_workspace_member" ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM workspace_members viewer
      JOIN workspace_members subject
        ON subject.workspace_id = viewer.workspace_id
      WHERE viewer.user_id = auth.uid()
        AND subject.user_id = user_profiles.id
    )
  );

DROP POLICY IF EXISTS "profiles_insert_self" ON user_profiles;
CREATE POLICY "profiles_insert_self" ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_self" ON user_profiles;
CREATE POLICY "profiles_update_self" ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── quick_todos ────────────────────────────────────────────────────────
ALTER TABLE quick_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace members can read quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "workspace members can insert quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "owner can update quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "owner can delete quick_todos" ON quick_todos;

DROP POLICY IF EXISTS "quick_todos_select" ON quick_todos;
CREATE POLICY "quick_todos_select" ON quick_todos FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "quick_todos_insert" ON quick_todos;
CREATE POLICY "quick_todos_insert" ON quick_todos FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND workspace_id = ANY(public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "quick_todos_update" ON quick_todos;
CREATE POLICY "quick_todos_update" ON quick_todos FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()))
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "quick_todos_delete" ON quick_todos;
CREATE POLICY "quick_todos_delete" ON quick_todos FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── project_chats ──────────────────────────────────────────────────────
ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace members can read project_chats" ON project_chats;
DROP POLICY IF EXISTS "workspace members can insert project_chats" ON project_chats;
DROP POLICY IF EXISTS "workspace members can delete project_chats" ON project_chats;

DROP POLICY IF EXISTS "project_chats_select" ON project_chats;
CREATE POLICY "project_chats_select" ON project_chats FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()));

DROP POLICY IF EXISTS "project_chats_insert" ON project_chats;
CREATE POLICY "project_chats_insert" ON project_chats FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND workspace_id = ANY(public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "project_chats_delete" ON project_chats;
CREATE POLICY "project_chats_delete" ON project_chats FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()));

-- ── push_subscriptions ─────────────────────────────────────────────────
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_user_policy" ON push_subscriptions;

DROP POLICY IF EXISTS "push_subscriptions_select_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_self" ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_insert_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_self" ON push_subscriptions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id = ANY(public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "push_subscriptions_update_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_self" ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id = ANY(public.user_workspace_ids())
  );

DROP POLICY IF EXISTS "push_subscriptions_delete_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_self" ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ── Storage bucket: attachments ─────────────────────────────────────────
-- Make sure the bucket is PRIVATE (not public) in Supabase dashboard.
-- These policies control signed URL generation via service role;
-- direct anon access is blocked at bucket level.

-- ══════════════════════════════════════════════════════════════════════
--  ACTIONS AFTER RUNNING THIS FILE:
--  1. Verify the "attachments" storage bucket is set to PRIVATE.
--  2. Add CRON_SECRET to Supabase Secrets (Project → Edge Functions → Secrets).
--  3. Update your scheduler (cron job / pg_cron) to pass the header:
--       x-cron-secret: <your-secret>
-- ══════════════════════════════════════════════════════════════════════
