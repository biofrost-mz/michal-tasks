# Michal Tasks — Analýza aplikace (květen 2026)

## Co je to?

Michal Tasks je osobní all-in-one task management SPA postavená na Reactu + Supabase. Primárně pro jednoho uživatele, ale s plnou podporou multi-workspace a teamových pozvánek. Aplikace je nasazena na `tasks.zichmichal.cz`.

---

## Stack

| Vrstva | Technologie | Verze |
|---|---|---|
| Frontend | React | 19.2 |
| Build | Vite | 7.3 |
| Backend/DB | Supabase (PostgreSQL) | 2.98 |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Edge Functions | Deno (Supabase) | — |
| DnD | @dnd-kit | core 6.3, sortable 10.0 |
| E-mail | Resend API | — |
| Fonty | Outfit, Figtree, JetBrains Mono | Google Fonts |

**Žádný router, žádná UI knihovna, žádný state management mimo React Context.**  
Všechny styly jsou inline (theme objekt předávaný přes context).

---

## Databázový model

```
workspaces            workspaces_members     workspace_invites
user_profiles         
projects              tasks                  task_tags
tags                  notes                  attachments
```

**tasks** jsou nejbohatší entita: title, description, status, priority, due_date, position, starred, phases (JSON pole), recurrence, completed_at, remind_at, assignee_user_id, project_id.

---

## Stránky a funkce

### Dashboard (Přehled)
- Přivítací header s dnešním datem
- QuickAdd — rychlé přidání úkolu
- Statistické karty: aktivní úkoly, hotovo, projekty, TOP úkoly
- Sekce úkolů: ⭐ TOP, 🔴 Po termínu, 🟣 Dnes, 🔵 Rozpracováno, 🟡 Čekám, ⬜ To do
- Pravý panel: aktivní projekty s progress barem + nedávné poznámky

### Úkoly (Tasks)
- Tabulkový view + karta view (přepínač)
- Filtr podle statusu + projektu
- Inline toggle statusu, hvězdičkování
- Seřazení v tabulce (titulek, status, priorita, termín, projekt, vytvořeno)

### Projekty (Projects)
- Grid karet projektů s barevným kódováním, progress barem
- Drag-and-drop řazení projektů
- ProjectDetailPage: Kanban board (4 sloupce = statusy) + list view + notes
- Stavy projektu: Nápad / Aktivní / Hotový / Archiv

### Plán (Timeline)
- 28denní Gantt-like pohled
- Řádky per projekt, úkoly jako chipy
- Algoritmus automatického lane-stackování (bez překryvu)
- Navigace: ← Zpět / Dnes / Vpřed →
- QuickAdd přímo do řádku projektu
- Mobilní fallback: jednoduchý seznam řazený podle termínu

### Poznámky (Notes)
- Master-detail layout (list + editor)
- Markdown editor s toolbarem (Bold, Italic, H2/H3, link, list, kód, HR, obrázek)
- Markdown preview (renderMarkdown → dangerouslySetInnerHTML)
- Pinned poznámky
- Vazba na projekt nebo úkol
- Šablony: Prázdná, Meeting notes, Decision log, Retrospektiva, Brief, LinkedIn post, Článek
- Počet slov + odhad doby čtení
- Auto-save s debouncingem (600ms)
- Filtry: Vše / Připnuto / Projekt / Úkol / Volné

### Tagy (Tags)
- CRUD + volba barvy
- Tagy jsou workspace-globální, přiřazují se k úkolům

### Task Drawer (detail úkolu)
- Slide-in panel (desktop: vpravo; mobile: z dolní hrany)
- Editovatelné: titulek, status, priorita, projekt, termín, tagy, popis
- Fáze/log průběhu (timestampovaný záznam)
- Opakování (daily/weekly/monthly) — po dokončení auto-vytvoří nový úkol
- Připomínka e-mailem (datetime-local)
- Přiřazení (assignee — member z workspace)
- Přílohy (upload do Supabase Storage)
- Linked poznámky

### Command Palette (⌘K)
- Fuzzy search přes úkoly, projekty, poznámky
- Quick actions: nový úkol, nová poznámka, navigace na stránky

### Workspace Settings
- Přejmenování workspace
- Správa členů a rolí (owner/admin/member)
- Generování invite odkazů (s rolí a expirací)
- Odvolání pozvánek
- Opuštění workspace

### User Profile
- Zobrazení e-mailu, display name

### Auth
- Supabase email/password
- Auto-vytvoření "Osobní" workspace při prvním přihlášení
- Seed data pro nové workspace (testovací projekt + tagy + úkol)
- Invite tokeny v URL (`?invite=<token>`)

### Edge Functions (Supabase / Deno)
1. **task-reminders** — hodinová kontrola `remind_at`, posílá e-mail přes Resend, poté vynuluje `remind_at`
2. **daily-reminders** — (existuje, konkrétní obsah neověřen)

### Realtime
- Supabase Realtime channel sleduje tabulku `tasks` per workspace
- INSERT / UPDATE / DELETE se projeví okamžitě bez reload
- Poznámky, projekty, tagy realtime nemají

---

## Silné stránky

- **Vizuálně čistý design** — konsistentní dark/light theme, hezká typografie (Outfit + Figtree)
- **Rich task detail** — fáze, recurrence, reminder, assignee, přílohy, linked notes — to je víc než většina jednoduchých todo appů
- **Timeline view** — unikátní a funkční; Gantt pro jednoho je fajn věc
- **Notes se šablonami** — 7 šablon pokrývají reálné use cases (meeting notes, decision log, LI post...)
- **Command palette** — power user UX, dobré fuzzy hledání
- **Mobile responsive** — dedikovaný MobileNav, mobilní fallbacky na timeline, notes, drawer
- **Workspace + invite systém** — solídně implementovaný, role-based, token expiry
- **Email reminders** — end-to-end funkční přes Edge Functions + Resend
- **Realtime sync** — tasks se okamžitě aktualizují i přes jiné záložky/zařízení
- **Seed data** — nový uživatel dostane ukázkový projekt, tagy a úkol; pěkné onboarding UX
- **React 19 + Vite 7** — velmi aktuální stack

---

## Slabé stránky a teoretické problémy

### Architektura

**1. Žádný router — URL je vždy stejná**
Celá navigace je `page` state v AppContext. Nelze sdílet odkaz na konkrétní stránku, přehled nebo úkol. Tlačítka Zpět/Vpřed v browseru nefungují. Refresh přistane vždy na dashboardu.

**2. AppContext je 1100 řádků monolit**
Veškerý state, veškeré CRUD operace, workspace logika, auth — vše v jednom souboru. Přidání nové funkce tenhle soubor dál nafukuje. Jakákoliv změna re-renderuje celý strom.

**3. Inline styly všude**
Každý komponent nese stovky řádků inline style objektů. Těžko se udržuje konzistence, nelze použít `:hover` CSS pseudo-selectory nativně (hackují se přes `onMouseEnter/Leave`), témování je prováděno předáváním `t` objektu do každého subkomponentu.

**4. Žádné error boundaries**
Pokud jakýkoliv komponent hodí uncaught error, celá app se sesype na prázdnou obrazovku bez zprávy.

### Datová integrita a race conditions

**5. Optimistic updates bez rollbacku**
`addTask`, `updateTask`, `deleteTask` okamžitě mění lokální state a pak async zapisují do Supabase. Pokud Supabase vrátí chybu, lokální stav je nekonzistentní a uživatel o tom neví (jen `console.error`). Rollback není implementován.

**6. Realtime jen pro tasks**
Projekty, poznámky, tagy nemají realtime listener. Pokud máš app otevřenou ve dvou záložkách a přidáš projekt v jedné, druhá záložka ho neuvidí bez refreshe.

**7. `remind_at` se resetuje po odeslání e-mailu — navždy**
Pokud Edge Function selže v půlce (odešle e-mail ale crash před vynulováním), nebo selže `update`, úkol zůstane s `remind_at` v minulosti a při každém dalším hodinovém triggeru se bude snažit znovu poslat e-mail.

**8. Seed race condition**
`dbSeedIfEmpty` dělá tři oddělené `count` dotazy → insert. Pokud by se funkce zavolala souběžně (nepravděpodobné pro jednoho uživatele, ale teoreticky možné při rychlém reload), mohlo by dojít k duplicitním seedům.

### Bezpečnost

**9. XSS riziko v Notes preview**
`renderMarkdown(content)` se renderuje přes `dangerouslySetInnerHTML`. Záleží na implementaci `renderMarkdown` v `utils.js` — pokud nesanitizuje HTML tagy, uložení `<script>` do poznámky může spustit libovolný JS. Stojí za audit.

**10. Invite token je UUID bez tajemství**
Token je `uuid4().replace(/-/g, "")` — 32 hexadecimálních znaků. Technicky jde o 128 bitů entropie, což je OK, ale je dobré mít na Supabase RLS, aby nikdo nemohl listovat tokeny.

### UX mezery

**11. Žádné bulk operace**
Nelze označit více úkolů najednou pro hromadnou změnu statusu, přiřazení, přesunutí do projektu nebo smazání.

**12. Žádné podúkoly (subtasks)**
Fáze/log průběhu jsou timestampované záznamy, ne checkboxy nebo podúkoly. Pro složitější práci chybí rozpad na menší kroky.

**13. Timeline je fixní na 28 dní**
Nejde zoom (den/týden/měsíc), nejde drag-resize chipů přímo v timeline.

**14. Email odesílatel je `onboarding@resend.dev`**
Bezplatná Resend doména — e-maily pravděpodobně končí ve spamu nebo mají nízký sender reputation. Pro produkci potřebuješ vlastní doménu v Resend.

**15. Žádný export dat**
Nelze exportovat úkoly/poznámky do CSV/JSON/Markdown. Vendor lock na Supabase.

**16. Globální search je jen přes Command Palette**
⌘K hledá jen aktivní úkoly (ne dokončené), aktivní projekty a poznámky. TopBar search filtruje jen aktuální stránku — na dashboardu filtruje úkoly, ale ne poznámky nebo projekty.

---

## Co by bylo fajn přidat / zlepšit

### Krátkodobě (quick wins)

| Co | Proč |
|---|---|
| React Router (nebo TanStack Router) | URL navigace, deep links, history |
| Error boundary kolem AppShell | Graceful crash s reload tlačítkem |
| Rollback při Supabase error | Konzistentní UI, toast s chybou |
| Sanitizace v renderMarkdown | Bezpečnost |
| Custom doména pro Resend | E-maily neskončí ve spamu |
| Realtime pro notes + projects | Konzistence při více záložkách |

### Střednědobě (features)

| Co | Proč |
|---|---|
| Subtasks / checklist v úkolu | Nejčastější chybějící feature v task appech |
| Bulk operace (multi-select) | Produktivita při správě většího počtu úkolů |
| Drag-and-drop v Timeline (resize chipu = změna termínu) | Přímá interakce místo otevírání draweru |
| Filtr na dashboardu (projekt, tag, priorita) | Dashboard teď není filtrovatelný |
| Activity log na projektu/úkolu | "Kdo co kdy udělal" — i pro jednoho uživatele |
| Klávesové zkratky | Mimo ⌘K a N nic není |
| PWA manifest + service worker | Install do doku, základní offline |

### Dlouhodobě (směr)

| Směr | Popis |
|---|---|
| AI asistent | Denní plan z dnešních úkolů, auto-tagging, prioritizace, "co mám dělat teď?" |
| Kalendářní view | Úkoly + jejich termíny v klasickém týdenním kalendáři |
| Integrace | GitHub Issues (→ task), Google Calendar (→ due dates), Slack notifications |
| Pokročilý notes editor | CodeMirror nebo TipTap místo plain textarea — headings, tables, embeds |
| Refactor kontextu | Rozdělit AppContext na TasksContext, ProjectsContext, NotesContext, WorkspaceContext |
| Data export | JSON / CSV / Markdown export celého workspace |

---

## Souhrnné hodnocení

| Oblast | Hodnocení |
|---|---|
| UI/UX design | ⭐⭐⭐⭐⭐ Výborné |
| Funkčnost | ⭐⭐⭐⭐ Solid MVP, bohatý feature set |
| Technická architektura | ⭐⭐⭐ Funguje, ale monolitická — potřebuje refactor |
| Robustnost / error handling | ⭐⭐ Slabé — optimistic bez rollbacku |
| Mobilní podpora | ⭐⭐⭐⭐ Dobré, ne perfektní |
| Scalability | ⭐⭐⭐ Supabase free tier vydrží pro personal use roky |
| Bezpečnost | ⭐⭐⭐ XSS v notes stojí za ověření |

**TL;DR:** Michal Tasks je vizuálně povedená a funkčně bohatá personal task app. Největší technický dluh je monolitický AppContext bez routeru a absence error recovery. Nejcennější funkce jsou Timeline, Command Palette, email reminders a notes se šablonami. Dalším logickým krokem je router + subtasks + AI daily planning.
