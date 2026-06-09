-- Project chat — historie AI chatu k projektu, sdílená per workspace.
-- Dřív byla jen v localStorage prohlížeče (nesynchronizovala se mezi zařízeními
-- ani členy workspace). Spusť v Supabase SQL Editoru.

CREATE TABLE IF NOT EXISTS project_chats (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id)   ON DELETE CASCADE,
  owner        uuid NOT NULL REFERENCES auth.users(id),
  role         text NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_chats_project_idx
  ON project_chats (project_id, created_at);

ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;

-- Číst může kterýkoli člen workspace (sdílená historie).
DROP POLICY IF EXISTS "workspace members can read project_chats" ON project_chats;
CREATE POLICY "workspace members can read project_chats"
  ON project_chats FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

-- Vkládat smí člen workspace pod svým vlastním ownerem.
DROP POLICY IF EXISTS "workspace members can insert project_chats" ON project_chats;
CREATE POLICY "workspace members can insert project_chats"
  ON project_chats FOR INSERT
  WITH CHECK (
    owner = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Smazat historii smí kterýkoli člen workspace (tlačítko „Vymazat chat“).
DROP POLICY IF EXISTS "workspace members can delete project_chats" ON project_chats;
CREATE POLICY "workspace members can delete project_chats"
  ON project_chats FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));
