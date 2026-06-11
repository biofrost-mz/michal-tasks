# Admin sekce „Systém & Administrace" — analýza a návrhy

## Co tam dnes je (taby)

`overview` (přehled & statistiky), `diagnostics` (latence DB, PWA/SW, cache reload, localStorage), `ai` (AI konzole), `logs` (produkční + lokální chyby, bug report), `users` (členové workspace), `storage`, `trash` (koš).

Stav: **slušně pokryté.** Diagnostika, logy, koš i bug report jsou hotové a funkční.

## Plovoucí status tlačítka — HOTOVO

`SystemHealthPanel` a `RemoteErrorLogsPanel` byly už dřív postavené jako plovoucí pilule se **svítící tečkou** (zelená/oranžová/červená, `box-shadow` glow) — collapsed = tečka + label, klik = rozbalí panel. Jediná vada: renderovaly se **jen na admin stránce**.

Změna (`src/App.jsx`): obě pilule teď mountuju **globálně pro system admina na všech stránkách**, takže stav vidíš na první pohled odkudkoli. Mountují se jednou v perzistentním shellu → silent check běží jednou na startu a pilule nemizí při přepínání stránek. AI konzole zůstává jen na admin stránce.

- Health pilule (vpravo nahoře): agreguje DB latenci, PWA/SW, lokální a produkční chyby → overall zelená/oranžová/červená.
- Produkční chyby (vpravo dole): tečka podle nejhorší severity za 24 h (zelená = 0 chyb).

**Volitelný polish (neudělal jsem, ať nepřidávám netestovaný interval):** periodický silent refresh tečky (např. každých 5 min) přes `setInterval` v obou panelech — teď se kontroluje jen jednou na startu session. Doporučená 1řádková změna do `useEffect` obou panelů.

## Správa uživatelů — co chybí a jak doplnit

`users` tab dnes = **read-only seznam členů workspace** (UserRow). Text „Bezpečná náhrada původního globálního adresáře. Plný globální adresář doplníme po přidání admin API/RPC." sedí — je to bezpečné minimum.

### Návrh 1 — akce nad členy (rychlé, bezpečné, bez nové infry)
V `users` tabu přidat ke každému členovi:
- dropdown **role** (viewer/member/admin) → `updateMemberRole(userId, role)` (už je v contextu),
- tlačítko **odebrat** → `removeMember(userId)` (už v contextu),
- guard: jen owner smí měnit role/odebírat; admin pozvánky jen owner.

Tyhle funkce už existují a jsou battle-tested (používá je `WorkspaceSettingsPage`). Stačí je zapojit do `UserRow`. Doporučuju doplnit `confirm()` u odebrání.

### Návrh 2 — správa pozvánek v adminu
`fetchWorkspaceInvites` + `revokeInvite` jsou v contextu, ale UI je nejspíš jen ve Workspace Settings. Přidat do `users` (nebo nový pod-tab) seznam aktivních pozvánek s tlačítkem revokovat a stavem (čeká / přijatá / expirovaná). Po nasazení hash migrace ukazovat jen odkaz při vytvoření, ne uložený token.

### Návrh 3 — plný globální adresář (vyžaduje admin API/RPC)
To, co bylo původně a co je teď „bezpečně nahrazeno". Bezpečná cesta:
- Edge funkce `admin-list-users` (service role), chráněná `is_system_admin(auth.uid())` — NE pouhým JWT.
- Vrací stránkovaný seznam z `auth.users` + `user_profiles` (email, displayName, poslední přihlášení, počet workspace).
- V adminu nový pod-tab „Globální adresář" jen pro `isSystemAdmin`.
- Akce (deaktivace, reset hesla) přes další service-role RPC s `is_system_admin` guardem a audit logem.

### Návrh 4 — správa system adminů
Tabulka `app_admins` už existuje (z migrace `…auth_invites_admin_rls.sql`). Chybí UI: grant/revoke system admina (jen pro stávajícího system admina), opět přes RPC s guardem.

### Návrh 5 — audit log
Pro role changes, invites, permanentní mazání: tabulka `admin_audit_log` (actor, action, target, timestamp) + zápis v příslušných RPC. Důležité u multi-tenant s admin právy.

## Priorita
1. Návrh 1 (akce nad členy) — největší hodnota za nejmíň práce, žádná nová infra.
2. Návrh 2 (pozvánky) — navazuje na hash migraci.
3. Návrhy 3–5 — vyžadují edge/RPC + audit; dělat až po bezpečnostním balíku.
