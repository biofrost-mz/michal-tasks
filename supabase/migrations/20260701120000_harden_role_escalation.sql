-- Hardening: role escalation & broken access control
-- --------------------------------------------------
-- Dosud se pravidla rolí vynucovala jen v klientu (permissionService.js).
-- Na úrovni DB mohl:
--   1) admin povýšit sebe/kohokoli na `owner` přes UPDATE workspace_members
--      (policy "members_update" neměla WITH CHECK na cílovou roli),
--   2) admin odebrat ownera / jiného admina (policy "members_delete"),
--   3) admin vytvořit `admin` pozvánku (create_workspace_invite i policy
--      "invites_insert"), ačkoli app to povoluje jen ownerovi.
--
-- Tato migrace přesouvá pravidla z klienta do RLS + RPC. Zdroj pravdy je
-- permissionService.canChangeMemberRole / canRemoveMember:
--   • na roli `owner` se nikdy nepovyšuje přes změnu role (jen předání ownershipu),
--   • admin smí nastavovat/rušit jen role member/viewer (ne admin ani owner),
--   • owner smí spravovat admin/member/viewer, ale ne řádek jiného ownera,
--   • člen smí odejít sám (self-leave), pokud není owner.

-- Helper: workspace IDs, kde je aktuální uživatel OWNER (užší než admin helper).
CREATE OR REPLACE FUNCTION public.user_owner_workspace_ids()
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(array_agg(workspace_id), '{}')
  FROM workspace_members
  WHERE user_id = auth.uid() AND role = 'owner';
$$;

-- ── workspace_members: UPDATE ──────────────────────────────────────────────
-- USING vidí PŮVODNÍ řádek (koho měním), WITH CHECK vidí NOVÝ řádek (na co).
DROP POLICY IF EXISTS "members_update" ON workspace_members;
CREATE POLICY "members_update" ON workspace_members FOR UPDATE
  USING (
    workspace_id = ANY(public.user_admin_workspace_ids())
    AND role <> 'owner'  -- řádek ownera nikdo nemění přes změnu role
    AND (
      workspace_id = ANY(public.user_owner_workspace_ids())  -- owner smí i adminy
      OR role NOT IN ('owner', 'admin')                      -- admin jen member/viewer
    )
  )
  WITH CHECK (
    workspace_id = ANY(public.user_admin_workspace_ids())
    AND role <> 'owner'  -- na ownera se nepovyšuje
    AND (
      workspace_id = ANY(public.user_owner_workspace_ids())  -- owner smí nastavit admina
      OR role NOT IN ('owner', 'admin')                      -- admin jen member/viewer
    )
  );

-- ── workspace_members: DELETE ──────────────────────────────────────────────
DROP POLICY IF EXISTS "members_delete" ON workspace_members;
CREATE POLICY "members_delete" ON workspace_members FOR DELETE
  USING (
    -- self-leave: kdokoli může odejít sám, jen owner musí nejdřív předat ownership
    (user_id = auth.uid() AND role <> 'owner')
    OR (
      workspace_id = ANY(public.user_admin_workspace_ids())
      AND role <> 'owner'
      AND (
        workspace_id = ANY(public.user_owner_workspace_ids())
        OR role NOT IN ('owner', 'admin')
      )
    )
  );

-- ── workspace_invites: INSERT ──────────────────────────────────────────────
-- Uzavírá i přímý INSERT do tabulky (mimo RPC create_workspace_invite).
DROP POLICY IF EXISTS "invites_insert" ON workspace_invites;
CREATE POLICY "invites_insert" ON workspace_invites FOR INSERT
  WITH CHECK (
    workspace_id = ANY(public.user_admin_workspace_ids())
    AND role <> 'owner'
    AND (
      workspace_id = ANY(public.user_owner_workspace_ids())  -- owner smí zvát adminy
      OR role NOT IN ('owner', 'admin')                      -- admin jen member/viewer
    )
  );

-- ── RPC create_workspace_invite: role gating dle role tvůrce ────────────────
CREATE OR REPLACE FUNCTION public.create_workspace_invite(
  p_workspace_id uuid,
  p_role text default 'member',
  p_ttl interval default interval '7 days'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text;
  uid uuid := auth.uid();
  creator_role text;
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select role into creator_role
    from workspace_members
   where workspace_id = p_workspace_id
     and user_id = uid;

  -- Pozvánku smí vytvořit jen owner/admin daného workspace.
  if creator_role is null or creator_role not in ('owner', 'admin') then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if p_role not in ('viewer', 'member', 'admin') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;

  -- Admin (ne owner) nesmí mintit admin pozvánku — jen owner může zvát adminy.
  if p_role = 'admin' and creator_role <> 'owner' then
    raise exception 'Only the workspace owner can invite admins' using errcode = '42501';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');

  insert into workspace_invites (workspace_id, role, token_hash, invited_by, expires_at)
  values (
    p_workspace_id,
    p_role,
    encode(digest(raw_token, 'sha256'), 'hex'),
    uid,
    now() + p_ttl
  );

  return raw_token;
end;
$$;

REVOKE ALL ON FUNCTION public.user_owner_workspace_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owner_workspace_ids() TO authenticated;
revoke all on function public.create_workspace_invite(uuid, text, interval) from public;
grant execute on function public.create_workspace_invite(uuid, text, interval) to authenticated;
