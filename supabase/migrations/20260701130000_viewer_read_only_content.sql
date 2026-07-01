-- Viewer = read-only na obsahu
-- ----------------------------
-- Role `viewer` dosud mohla obsah plně editovat: write policy na content
-- tabulkách používaly `user_workspace_ids()` = kdokoli z workspace. Nově je
-- zápis (INSERT/UPDATE/DELETE) povolen jen editorům (owner/admin/member).
-- SELECT zůstává všem členům včetně viewerů. Osobní push_subscriptions se
-- neřeší rolí (patří uživateli), zůstávají beze změny.

-- Helper: workspace IDs, kde smí uživatel editovat obsah (vše kromě viewera).
CREATE OR REPLACE FUNCTION public.user_editor_workspace_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(workspace_id), '{}')
  FROM workspace_members
  WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member');
$$;

REVOKE ALL ON FUNCTION public.user_editor_workspace_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_editor_workspace_ids() TO authenticated;

-- ── tasks ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "tasks_update" ON tasks;
CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "tasks_delete" ON tasks;
CREATE POLICY "tasks_delete" ON tasks FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── projects (delete zůstává admin-only) ───────────────────────────────
DROP POLICY IF EXISTS "projects_insert" ON projects;
CREATE POLICY "projects_insert" ON projects FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "projects_update" ON projects;
CREATE POLICY "projects_update" ON projects FOR UPDATE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── notes ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "notes_insert" ON notes;
CREATE POLICY "notes_insert" ON notes FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "notes_update" ON notes;
CREATE POLICY "notes_update" ON notes FOR UPDATE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "notes_delete" ON notes;
CREATE POLICY "notes_delete" ON notes FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── tags ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tags_insert" ON tags;
CREATE POLICY "tags_insert" ON tags FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "tags_update" ON tags;
CREATE POLICY "tags_update" ON tags FOR UPDATE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "tags_delete" ON tags;
CREATE POLICY "tags_delete" ON tags FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── task_tags (vazba přes vlastnictví tasku) ───────────────────────────
DROP POLICY IF EXISTS "task_tags_insert" ON task_tags;
CREATE POLICY "task_tags_insert" ON task_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.workspace_id = ANY(public.user_editor_workspace_ids())
  ));

DROP POLICY IF EXISTS "task_tags_delete" ON task_tags;
CREATE POLICY "task_tags_delete" ON task_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_id AND t.workspace_id = ANY(public.user_editor_workspace_ids())
  ));

-- ── attachments ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "attachments_insert" ON attachments;
CREATE POLICY "attachments_insert" ON attachments FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "attachments_delete" ON attachments;
CREATE POLICY "attachments_delete" ON attachments FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── quick_todos ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quick_todos_insert" ON quick_todos;
CREATE POLICY "quick_todos_insert" ON quick_todos FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND workspace_id = ANY(public.user_editor_workspace_ids())
  );

DROP POLICY IF EXISTS "quick_todos_update" ON quick_todos;
CREATE POLICY "quick_todos_update" ON quick_todos FOR UPDATE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()))
  WITH CHECK (workspace_id = ANY(public.user_editor_workspace_ids()));

DROP POLICY IF EXISTS "quick_todos_delete" ON quick_todos;
CREATE POLICY "quick_todos_delete" ON quick_todos FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));

-- ── project_chats ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "project_chats_insert" ON project_chats;
CREATE POLICY "project_chats_insert" ON project_chats FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND workspace_id = ANY(public.user_editor_workspace_ids())
  );

DROP POLICY IF EXISTS "project_chats_delete" ON project_chats;
CREATE POLICY "project_chats_delete" ON project_chats FOR DELETE
  USING (workspace_id = ANY(public.user_editor_workspace_ids()));
