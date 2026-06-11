-- RLS test scénáře — izolace nájemců (multi-tenant)
-- --------------------------------------------------
-- Spustit v Supabase SQL editoru jako service role pro setup, pak simulovat
-- jednotlivé uživatele přes set_config('request.jwt.claims', ...) + role authenticated.
--
-- Vzor simulace uživatele v rámci jedné transakce:
--   set local role authenticated;
--   select set_config('request.jwt.claims', json_build_object('sub', '<USER_UUID>')::text, true);
-- Tím se auth.uid() = <USER_UUID> a RLS politiky se vyhodnocují jako pro toho uživatele.
--
-- Naplň níže reálná UUID dvou testovacích uživatelů a dvou workspace.

\set user_a '00000000-0000-0000-0000-00000000000a'
\set user_b '00000000-0000-0000-0000-00000000000b'
\set ws_a   '00000000-0000-0000-0000-0000000000a0'
\set ws_b   '00000000-0000-0000-0000-0000000000b0'

-- ── Scénář 1: cross-tenant read ──────────────────────────────────────────────
-- User A NESMÍ vidět úkoly workspace B.
begin;
  set local role authenticated;
  select set_config('request.jwt.claims', json_build_object('sub', :'user_a')::text, true);

  -- OČEKÁVÁNÍ: 0 řádků (žádný únik z ws_b)
  select 'FAIL: A vidí úkoly ws_b' as result, count(*) as leaked
    from tasks where workspace_id = :'ws_b'
   having count(*) > 0;

  -- OČEKÁVÁNÍ: A vidí jen své workspace
  select 'INFO: A vidí workspace' as result, array_agg(distinct workspace_id) as visible
    from tasks;
rollback;

-- ── Scénář 2: role práva (viewer vs member vs owner/admin) ────────────────────
-- Viewer NESMÍ insertovat úkol do svého workspace.
begin;
  set local role authenticated;
  select set_config('request.jwt.claims', json_build_object('sub', :'user_b')::text, true);
  -- nastav user_b jako VIEWER ws_b předem (setup), pak:
  -- OČEKÁVÁNÍ: insert selže na RLS (policy violation)
  savepoint s1;
  insert into tasks (workspace_id, title, status) values (:'ws_b', 'viewer test', 'todo');
  -- pokud se sem dostaneš bez chyby → FAIL
  rollback to savepoint s1;
rollback;

-- ── Scénář 3: invite ─────────────────────────────────────────────────────────
-- Owner/admin smí vytvořit pozvánku; viewer ne.
begin;
  set local role authenticated;
  select set_config('request.jwt.claims', json_build_object('sub', :'user_a')::text, true);
  -- A = owner ws_a → OČEKÁVÁNÍ: vrátí raw token
  select 'INFO: owner create_invite' as result,
         length(public.create_workspace_invite(:'ws_a', 'member')) > 0 as ok;
rollback;

begin;
  set local role authenticated;
  select set_config('request.jwt.claims', json_build_object('sub', :'user_b')::text, true);
  -- B = viewer ws_a (není member/admin) → OČEKÁVÁNÍ: exception 42501
  savepoint s2;
  select public.create_workspace_invite(:'ws_a', 'member');
  rollback to savepoint s2;
rollback;

-- ── Scénář 4: attachments / private bucket ───────────────────────────────────
-- Ověřit v Storage policy: objekty pod prefixem workspace B nesmí číst user A.
-- (storage.objects RLS — test přes storage API, ne čistým SQL.)
--   select * from storage.objects where bucket_id = 'attachments' and name like :'ws_b' || '/%';
-- OČEKÁVÁNÍ jako user A: 0 řádků.
