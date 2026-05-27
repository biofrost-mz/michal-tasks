-- Quick Todos table
-- Spusť v Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS quick_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner uuid NOT NULL REFERENCES auth.users(id),
  text text NOT NULL DEFAULT '',
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quick_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace members can read quick_todos"
  ON quick_todos FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "workspace members can insert quick_todos"
  ON quick_todos FOR INSERT
  WITH CHECK (
    owner = auth.uid() AND
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "owner can update quick_todos"
  ON quick_todos FOR UPDATE
  USING (owner = auth.uid());

CREATE POLICY "owner can delete quick_todos"
  ON quick_todos FOR DELETE
  USING (owner = auth.uid());
