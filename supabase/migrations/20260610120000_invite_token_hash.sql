-- Invite token hashing
-- ---------------------
-- Dnes se invite token ukládá do workspace_invites.token jako PLAIN TEXT a
-- accept_workspace_invite() matchuje plain. Kdokoli se čtecím přístupem k tabulce
-- (únik, chybná RLS, záloha) získá použitelné pozvánky.
--
-- Tato migrace ukládá pouze SHA-256 HASH tokenu. Raw token se generuje
-- server-side, vrací se JEN JEDNOU (do odkazu) a do DB se nikdy neuloží v plain.
-- Staré odkazy zůstanou funkční díky backfillu (hash existujícího plain tokenu).

create extension if not exists pgcrypto;

alter table public.workspace_invites
  add column if not exists token_hash text;

-- Backfill: zahashuj existující plain tokeny, ať staré odkazy dál platí.
update public.workspace_invites
   set token_hash = encode(digest(token, 'sha256'), 'hex')
 where token_hash is null
   and token is not null;

create index if not exists workspace_invites_token_hash_idx
  on public.workspace_invites (token_hash);

-- Vytvoření pozvánky server-side: vygeneruje raw token, uloží jen jeho hash,
-- vrátí raw token jednou (zobrazí se pouze v odkazu). Nahrazuje klientský
-- INSERT s plain tokenem.
create or replace function public.create_workspace_invite(
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
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- Pozvánku smí vytvořit jen owner/admin daného workspace.
  if not exists (
    select 1 from workspace_members
     where workspace_id = p_workspace_id
       and user_id = uid
       and role in ('owner', 'admin')
  ) then
    raise exception 'Insufficient permissions' using errcode = '42501';
  end if;

  if p_role not in ('viewer', 'member', 'admin') then
    raise exception 'Invalid role' using errcode = '22023';
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

revoke all on function public.create_workspace_invite(uuid, text, interval) from public;
grant execute on function public.create_workspace_invite(uuid, text, interval) to authenticated;

-- Accept: raw token z odkazu se zahashuje a matchuje na token_hash.
create or replace function public.accept_workspace_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv workspace_invites%rowtype;
  uid uuid := auth.uid();
  token_h text := encode(digest(invite_token, 'sha256'), 'hex');
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select *
    into inv
    from workspace_invites
   where token_hash = token_h
     and accepted_at is null
     and revoked_at is null
     and expires_at > now()
   limit 1;

  if not found then
    raise exception 'Invite is invalid or expired' using errcode = '22023';
  end if;

  insert into workspace_members (workspace_id, user_id, role)
  values (inv.workspace_id, uid, inv.role)
  on conflict (workspace_id, user_id) do nothing;

  update workspace_invites
     set accepted_at = now()
   where id = inv.id;

  return inv.workspace_id;
end;
$$;

revoke all on function public.accept_workspace_invite(text) from public;
grant execute on function public.accept_workspace_invite(text) to authenticated;

-- FINÁLNÍ KROK (spustit AŽ po ověření, že generování i přijímání pozvánek
-- funguje a staré odkazy dojely): odstranění plaintext sloupce.
--   alter table public.workspace_invites drop column token;
