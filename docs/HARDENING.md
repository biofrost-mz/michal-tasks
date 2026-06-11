# Hardening & deployment — akční balík

Stav k 2026-06-10. Co je **hotové v kódu** (ověřeno eslintem / node), a co je **připravené k aplikaci** u tebe (DB migrace, edge deploy, ruční test) — tyhle věci nejde spustit z mého prostředí, ale jsou ready.

---

## 1. Hash invite tokenů — HOTOVO v kódu, nasadit migraci

**Problém:** `workspace_invites.token` se ukládal jako plain text; `accept_workspace_invite` matchoval plain. Kdokoli se čtecím přístupem k tabulce (únik, chybná RLS, záloha) měl použitelné pozvánky.

**Řešení (hotové):**
- `supabase/migrations/20260610120000_invite_token_hash.sql` — přidá `token_hash`, backfillne existující tokeny (staré odkazy dál platí), přidá RPC `create_workspace_invite` (generuje token server-side, ukládá jen SHA-256 hash) a přepíše `accept_workspace_invite` na match přes hash.
- `src/context/AppContext.jsx` → `generateInviteLink` volá novou RPC, s fallbackem na starý insert, dokud migrace není nasazená.

**Aplikovat:**
1. `supabase db push` (nebo spustit ten SQL soubor v SQL editoru).
2. Ověřit: vytvořit pozvánku, přijmout ji druhým účtem, ověřit starý (před-migrační) odkaz.
3. Až vše sedí, spustit poslední (zakomentovaný) krok v migraci: `alter table public.workspace_invites drop column token;`

---

## 2. push-notify — slabá autorizace (NÁLEZ, patch ready)

**Problém:** `supabase/functions/push-notify/index.ts` běží na **service role** (čte úkoly napříč VŠEMI workspace) a jediná autorizace je:

```ts
if (!authHeader.includes(SUPABASE_SERVICE_ROLE_KEY) && !authHeader.includes("Bearer")) { ... }
```

Tedy **jakýkoli `Bearer` token** (i běžný anon/uživatelský JWT) projde. Libovolný přihlášený uživatel může funkci spustit a rozeslat push napříč instancí.

**Patch (mirror cron funkcí — vyžaduje `x-cron-secret`):** nahraď úvod `Deno.serve` blokem:

```ts
Deno.serve(async (req) => {
  // Service-role cron funkce — povol jen volání se správným CRON_SECRET.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response("Forbidden", { status: 403 });
  }
  // ... zbytek beze změny
```

**Pozor — operační závislost:** ať se po deployi pushe nezastaví, musí volající (pg_cron / scheduler) posílat hlavičku `x-cron-secret: <CRON_SECRET>`, stejně jako u `daily-reminders` / `task-reminders`. Nasadit **až** s úpravou cron jobu.

---

## 3. AI payloady — chybí limity vstupu (NÁLEZ, patch ready)

AI funkce (`ai-task-assist`, `ai-project-planner`, `gemini-*`) mají auth + rate-limit, ale **necapují délku vstupu** → přihlášený uživatel může poslat obří payload a hnát náklady/latence Anthropic/Gemini API.

**Patch:** sdílený validátor `supabase/functions/_shared/validate.ts`:

```ts
export const MAX_BODY_BYTES = 32 * 1024;     // 32 KB tělo
export const MAX_TEXT = 4000;                // volný text / popis
export const MAX_TITLE = 300;
export const MAX_TAGS = 50;

export function clampText(s: unknown, max: number): string {
  return typeof s === "string" ? s.slice(0, max) : "";
}

export async function readJsonLimited(req: Request): Promise<any> {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new Response(JSON.stringify({ error: "Payload too large" }),
      { status: 413, headers: { "Content-Type": "application/json" } });
  }
  return JSON.parse(raw);
}
```

V každé AI funkci po auth nahraď `body = await req.json()` za `body = await readJsonLimited(req)` a před stavbou promptu osekej pole:

```ts
task.title = clampText(task?.title, MAX_TITLE);
task.description = clampText(task?.description, MAX_TEXT);
availableTags = Array.isArray(availableTags) ? availableTags.slice(0, MAX_TAGS).map(t => clampText(t, 40)) : [];
```

---

## 4. Cron secret logging (drobnost)

`daily-reminders` / `task-reminders` při selhání logují `runtimeCronSecretSuffix` (poslední 4 znaky) a délku secretu. Minor info-leak do logů. Doporučení: logovat jen `ok: false` + IP, ne metadata secretu.

---

## 5. RLS test scénáře (#7) — spustit proti DB

Soubor `supabase/tests/rls_scenarios.sql` (níže) ověří izolaci nájemců. Spustit v SQL editoru s dvěma testovacími uživateli, nebo přes `supabase test db`. Kritické scénáře:

1. **Cross-tenant read:** user A `select * from tasks` nesmí vrátit řádky workspace B.
2. **Role práva:** viewer nesmí insert/update/delete; member smí CRUD úkolů; jen owner/admin smí vytvořit pozvánku (přes `create_workspace_invite`).
3. **Invite accept:** user mimo workspace přijme platnou pozvánku → stane se memberem; revokovaná/expirovaná pozvánka selže.
4. **Attachments / private bucket:** user A nesmí číst storage objekty workspace B.

Checklist k odškrtání je v `supabase/tests/RLS_CHECKLIST.md`.

---

## 6. PWA update — ruční test (#4 Priorita 2)

Postup ověření (preview/prod):

1. Otevři appku, nech ji načíst (SW se zaregistruje).
2. Deployni novou verzi (jiný hash assetů).
3. Vrať se na starou otevřenou záložku → do ~minuty se má objevit **update banner**; klik → reload → běží nová verze.
4. Tvrdý test stale shellu: v DevTools → Application → Service Workers zatrhni „Update on reload", reload; ověř, že `index.html` neukazuje na neexistující (smazané) chunky (žádná 404 na `/assets/*.js`).
5. Offline: zapni offline, reload — app shell se má načíst z cache, ne bílá stránka.

Pozn.: `vite.config.js` už precachuje `index.html` + hashované assety (`injectManifest`), takže stará shell nemá viset na smazaných chuncích — tenhle test to potvrdí.

---

## 7. dist / deployment (#5 Priorita 2)

**Teď:** `dist/` je verzovaný v gitu a web servíruje commitnutý build → každý deploy = ruční `npm run build` + commit dist + push. Křehké (snadno se zapomene rebuildnout → stará verze / stale shell).

**Doporučení (dlouhodobě):** build dělat v CI a `dist/` z gitu vyřadit. `.github/workflows/ci.yml` už dělá lint/test/build, jen nedeployuje. Připravený deploy workflow je v `docs/deploy-pages.yml.example` — buildí a publikuje artefakt (GitHub Pages). Po zapnutí:

1. `git rm -r --cached dist && echo "dist/" >> .gitignore`
2. Zkopíruj `docs/deploy-pages.yml.example` do `.github/workflows/deploy.yml`, uprav `APP base`/secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
3. V repo Settings → Pages nastav source = GitHub Actions.

Tím push do `main` = build + deploy, bez ručního commitu dist a bez rizika stale shellu.

---

## 8. Zbývající split AppContextu (#4) — rozpracováno

Vyštěpeno a eslint-čisté: `useQuickTodoMutations`, `useTagMutations` (v `src/context/mutations/`). Vzor je ověřený a opakovatelný.

Zbývá stejným vzorem (parametrizované hooky, stav zůstává v AppContextu):
- `useNoteMutations` — addNote, updateNote, deleteNote, restoreNote, hardDeleteNote
- `useProjectMutations` — addProject, updateProject, deleteProject, restoreProject, hardDeleteProject
- `useTaskMutations` — addTask, updateTask, deleteTask, restoreTask, hardDeleteTask
- `useRealtimeSync` — realtime useEffect (tasks/projects/notes subscription)
- `useWorkspaceBootstrap` — dbFetchAll + auth + initial load (nejkomplexnější, dělat poslední, izolovaně)

Každý krok: vytvořit hook, nahradit blok v AppContextu voláním, `npx eslint` (chytá rules-of-hooks i exhaustive-deps), pak `npm test`.
