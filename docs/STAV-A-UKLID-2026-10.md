# Michal Tasks – stav, analýza a úklid (říjen 2026)

## Shrnutí

| | |
|---|---|
| Účel | Osobní/týmový task manager (workspaces, projekty, úkoly, poznámky, tagy, přílohy, připomínky, AI asistent) |
| Stack | React 19 + Vite 7 SPA (bez routeru, `AppContext`), Supabase (Postgres/RLS/Auth/Storage/Edge Functions v Deno), Resend, web push, PWA |
| AI | edge funkce `ai-*` / `gemini-*`: primárně Google Gemini, záložně Anthropic Claude |
| Produkce | Vercel → `tasks.zichmichal.cz` |
| Viditelnost repa | **veřejné** |
| Historie | 426 commitů (březen–červenec 2026), poslední 6. 7. 2026 |
| Zdraví | lint ✅, 106/106 testů ✅, build ✅, CI (lint/test/build + Deno check) |

## Bezpečnostní kontrola (veřejné repo)

- Prohledána **celá historie** (426 commitů): žádný `.env`, service role klíč, Resend/Anthropic/Gemini/GitHub token.
- Jediný klíč v historii je Supabase **anon** klíč projektu `kdzztkclpfgnjjqovkns` (role `anon`) ve skriptech
  `scratch/`. Anon klíč je veřejný z principu (je i v buildu frontendu), bezpečnost stojí na RLS politikách.
- `.claude/settings.local.json` byl v repu i přes `.gitignore` – obsahoval lokální cesty z Macu (`/Users/michalzich/...`).

## Provedený úklid (větev `claude/awesome-ride-6kb6m0`)

- **Oprava AI záloh:** 5 edge funkcí volalo vyřazené modely `claude-3-5-sonnet-20241022` a
  `claude-3-5-haiku-20241022` → Claude záloha při výpadku Gemini **nefungovala** (API vrací chybu).
  Nahrazeno `claude-sonnet-5-5` (s `thinking: between_tools`, tj. bez přemýšlení jako dřív) a
  `claude-haiku-5-5` (s `thinking: disabled`); čtení odpovědi hledá textový blok místo `content[0]`.
  Funkce: `ai-daily-plan`, `ai-project-planner`, `gemini-project-chat`, `ai-task-assist`, `gemini-task-optimize`.
- **Bezpečnost závislostí:** `dompurify` ≥ 3.4.16 (moderate advisory) – produkční závislosti bez zranitelností.
- **Smazáno:** `Michal TASKS-handoff.zip` (3,2 MB – ověřeno bajtově shodné se složkou `redesign_micha_tasks/`),
  `scratch/` (ad-hoc DB skripty s natvrdo vloženým klíčem), `Webova stranka/index.backup.html`.
- **Odebráno z gitu:** `.claude/settings.local.json` (zůstává lokálně, je v `.gitignore`).
- **Přesunuto:** `auth-redesign-preview.html` a `plan-emaily-demo-web.md` z kořene do `docs/archiv/`.
- `.gitignore`: `scratch/`, `*.zip`, výjimka `!.env.example`; nový **`.env.example`** se všemi proměnnými.
- README: nasazení, testy, rozcestník dokumentace; opravena zastaralá věta „přidat smoke testy“.

## Zjištěná rizika a dluh

1. **`dist/` je stále v gitu** (3,7 MB, poslední build 2. 7., starší než kód). Komentář v `.gitignore` plánoval
   smazání „po Pages cutoveru“, ten se ale neuskutečnil – produkce je na Vercelu. Pokud Vercel builduje
   ze zdrojů (výchozí Vite preset), lze `dist/` bezpečně odebrat; pokud servíruje commitnutý `dist/`,
   produkce **nemá** opravy z 6. 7. (CSP, renderMarkdown). Viz úkol níže.
2. Gemini modely `gemini-1.5-*` a `gemini-2.0-*` ve fallback seznamech jsou u Googlu vyřazené/vyřazované –
   první volba `gemini-2.5-*` funguje, zbytek seznamu je mrtvý kód.
3. Edge funkce vrací klientovi detail chyb upstream API (`errText.slice(0,150)`) – zbytečně prozrazuje interní stav.
4. CSP je jen `Report-Only`.
5. `AppContext` a inline styly – viz „Doporučený další směr“ v README.

## Úkoly pro vlastníka

- [ ] Ve Vercelu ověřit *Build & Output Settings* (Build Command `vite build`/výchozí). Pokud ano:
      `git rm -r --cached dist && git commit -m "Odebrat dist z gitu"` a smazat komentář v `.gitignore`.
- [ ] Nasadit opravené edge funkce: `supabase functions deploy ai-daily-plan ai-project-planner gemini-project-chat ai-task-assist gemini-task-optimize`.
- [ ] Po ověření CSP v reportech přepnout `Content-Security-Policy-Report-Only` na vynucující `Content-Security-Policy`.
- [ ] Mergnout větev `claude/awesome-ride-6kb6m0` do `main` (CI spustí i Deno type-check upravených funkcí).
