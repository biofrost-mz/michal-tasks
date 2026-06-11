# RLS checklist

Odškrtat proti živé DB (2 testovací účty A/B, 2 workspace).

## Cross-tenant izolace
- [ ] User A `select * from tasks` nevrací řádky workspace B
- [ ] Totéž pro `projects`, `notes`, `tags`, `quick_todos`, `attachments`, `workspace_members`
- [ ] User A nemůže `update`/`delete` řádek workspace B (i když uhodne id)

## Role
- [ ] Viewer: nesmí insert/update/delete úkolů
- [ ] Member: smí CRUD úkolů/poznámek/projektů ve svém workspace
- [ ] Member: nesmí vytvořit pozvánku (`create_workspace_invite` → 42501)
- [ ] Admin/Owner: smí vytvořit pozvánku; admin pozvánku smí jen owner
- [ ] Member nesmí měnit role / odebírat členy

## Invite
- [ ] Platná pozvánka: uživatel mimo workspace ji přijme → stane se memberem se správnou rolí
- [ ] Revokovaná pozvánka (`revoked_at`) → accept selže
- [ ] Expirovaná pozvánka (`expires_at < now()`) → accept selže
- [ ] Už přijatá pozvánka (`accepted_at`) → druhý accept selže
- [ ] Po nasazení hashe: v `workspace_invites` není žádný plaintext `token`

## Storage / attachments
- [ ] User A nečte storage objekty pod prefixem workspace B
- [ ] User A nenahraje soubor do prefixu workspace B
- [ ] Smazání attachmentu odstraní i storage objekt (žádné orphany)

## Edge / RPC
- [ ] `accept_workspace_invite` je `SECURITY DEFINER` a `GRANT EXECUTE` jen `authenticated`
- [ ] `create_workspace_invite` ověřuje owner/admin membership
- [ ] AI funkce odmítnou request bez platného JWT (401)
- [ ] push-notify odmítne request bez `x-cron-secret` (po patchi)
