-- Auth hardening: secure invite acceptance, global admin role, and expanded RLS.

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

-- Global application admins. Workspace roles remain workspace-scoped.
CREATE TABLE IF NOT EXISTS public.app_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_system_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_admins
    WHERE user_id = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_system_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT public.is_system_admin(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.current_user_is_system_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_system_admin() TO authenticated;

DROP POLICY IF EXISTS "app_admins_select_self_admin" ON public.app_admins;
CREATE POLICY "app_admins_select_self_admin" ON public.app_admins FOR SELECT
  USING (user_id = auth.uid() OR public.is_system_admin());

-- Secure invite acceptance RPC.
CREATE OR REPLACE FUNCTION public.accept_workspace_invite(invite_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv workspace_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT *
    INTO inv
    FROM workspace_invites
   WHERE token = invite_token
     AND accepted_at IS NULL
     AND revoked_at IS NULL
     AND expires_at > now()
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite is invalid or expired' USING ERRCODE = '22023';
  END IF;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (inv.workspace_id, uid, inv.role)
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  UPDATE workspace_invites
     SET accepted_at = now()
   WHERE id = inv.id;

  RETURN inv.workspace_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_workspace_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_workspace_invite(text) TO authenticated;

-- workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
CREATE POLICY "workspaces_select" ON workspaces FOR SELECT
  USING (id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
CREATE POLICY "workspaces_update" ON workspaces FOR UPDATE
  USING (id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

-- workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select" ON workspace_members;
CREATE POLICY "members_select" ON workspace_members FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "members_insert" ON workspace_members;
CREATE POLICY "members_insert" ON workspace_members FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "members_update" ON workspace_members;
CREATE POLICY "members_update" ON workspace_members FOR UPDATE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "members_delete" ON workspace_members;
CREATE POLICY "members_delete" ON workspace_members FOR DELETE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

-- workspace_invites
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invites_select" ON workspace_invites;
CREATE POLICY "invites_select" ON workspace_invites FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "invites_insert" ON workspace_invites;
CREATE POLICY "invites_insert" ON workspace_invites FOR INSERT
  WITH CHECK (workspace_id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "invites_delete" ON workspace_invites;
CREATE POLICY "invites_delete" ON workspace_invites FOR DELETE
  USING (workspace_id = ANY(public.user_admin_workspace_ids()) OR public.is_system_admin());

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_workspace_member" ON user_profiles;
CREATE POLICY "profiles_select_self_or_workspace_member" ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.is_system_admin()
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
  WITH CHECK (id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS "profiles_update_self" ON user_profiles;
CREATE POLICY "profiles_update_self" ON user_profiles FOR UPDATE
  USING (id = auth.uid() OR public.is_system_admin())
  WITH CHECK (id = auth.uid() OR public.is_system_admin());

-- quick_todos
ALTER TABLE quick_todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace members can read quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "workspace members can insert quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "owner can update quick_todos" ON quick_todos;
DROP POLICY IF EXISTS "owner can delete quick_todos" ON quick_todos;

DROP POLICY IF EXISTS "quick_todos_select" ON quick_todos;
CREATE POLICY "quick_todos_select" ON quick_todos FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "quick_todos_insert" ON quick_todos;
CREATE POLICY "quick_todos_insert" ON quick_todos FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS "quick_todos_update" ON quick_todos;
CREATE POLICY "quick_todos_update" ON quick_todos FOR UPDATE
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin())
  WITH CHECK (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "quick_todos_delete" ON quick_todos;
CREATE POLICY "quick_todos_delete" ON quick_todos FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

-- project_chats
ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace members can read project_chats" ON project_chats;
DROP POLICY IF EXISTS "workspace members can insert project_chats" ON project_chats;
DROP POLICY IF EXISTS "workspace members can delete project_chats" ON project_chats;

DROP POLICY IF EXISTS "project_chats_select" ON project_chats;
CREATE POLICY "project_chats_select" ON project_chats FOR SELECT
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

DROP POLICY IF EXISTS "project_chats_insert" ON project_chats;
CREATE POLICY "project_chats_insert" ON project_chats FOR INSERT
  WITH CHECK (
    owner = auth.uid()
    AND (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS "project_chats_delete" ON project_chats;
CREATE POLICY "project_chats_delete" ON project_chats FOR DELETE
  USING (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin());

-- push_subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_sub_user_policy" ON push_subscriptions;

DROP POLICY IF EXISTS "push_subscriptions_select_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_self" ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_system_admin());

DROP POLICY IF EXISTS "push_subscriptions_insert_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_self" ON push_subscriptions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS "push_subscriptions_update_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_self" ON push_subscriptions FOR UPDATE
  USING (user_id = auth.uid() OR public.is_system_admin())
  WITH CHECK (
    user_id = auth.uid()
    AND (workspace_id = ANY(public.user_workspace_ids()) OR public.is_system_admin())
  );

DROP POLICY IF EXISTS "push_subscriptions_delete_self" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_self" ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid() OR public.is_system_admin());
