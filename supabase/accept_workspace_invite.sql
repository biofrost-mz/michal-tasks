-- Secure invite acceptance for workspace links.
-- Run after workspace_invites/workspace_members exist.

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
