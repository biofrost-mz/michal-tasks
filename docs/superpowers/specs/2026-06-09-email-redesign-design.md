# Spec — Redesign informačních e-mailů (Zentero)

**Datum:** 2026-06-09
**Iniciativa:** I (Notifikace & e-maily) — první detailní spec z roadmapy.
**Status:** návrh ke schválení.

## 1. Cíl

Sjednotit a vylepšit dva informační e-maily, které appka posílá přes **Resend**:

1. **Denní souhrn** (`daily-reminders`, cron 07:00) — přehled úkolů po termínu / dnes / blíží se.
2. **Připomínka úkolu** (`task-reminders`) — připomínka 1+ úkolů s nastaveným `remind_at`.

Důvod: současný vzhled je nekonzistentní, vizuálně přeplácaný (tmavá hlavička, gradienty, stíny) a **rozbíjí se v e-mailových klientech** (Outlook ořezává gradienty/`border-radius`/`box-shadow`; layout staví na `display:grid/flex` + `@media`, které desktopový Outlook ignoruje).

## 2. Rozhodnutí (schválená)

- **Vizuál:** světlé minimalistické tělo + **modro-fialová hero** hlavička (`#2563eb → #4f46e5 → #7c3aed`), brandově laděná. Plná indigo barva (`#4f46e5`) jako fallback.
- **Robustnost (bulletproof):** tabulkový layout (`role="presentation"`), **všechny styly inline**, `max-width:600px`, jedno-sloupcové. Žádné `display:grid/flex` v layoutu. Gradienty vždy s `bgcolor` fallbackem. Media queries jen jako *vylepšení* pro mobil (mobilní klienti je umí), ne jako základ.
- **Hero obsah:** vlevo logo + „Zentero", vpravo datum; nadpis + **celkový počet úkolů v pilulce hned vedle nadpisu**; podtitulek; **rozpad podle stavu**.
  - **Desktop:** rozpad jako 3 větší buňky (velká čísla, kicker s barevnou tečkou — červená/amber/zelená, bez popisných podtextů).
  - **Mobil:** rozpad jako 1 kompaktní řádek vedle sebe, oddělený tečkami (`● 6 po termínu · ● 1 dnes · ● 2 se blíží`). Přepínáno přes `.em-desk-stats` / `.em-mob-stats` + media query.
- **Tělo:** intro řádek, sekce **Po termínu / Splatné dnes / Blíží se** (tečka + nadpis + počet v pilulce), karty úkolů s barevným levým proužkem, název = **odkaz na konkrétní úkol**, popisek, chipy (projekt · termín · priorita). Při překročení limitu „**Zobrazit další X**".
- **Akce:** na **desktopu** tlačítko „Otevřít" u každého úkolu; na **mobilu** skryté (`.em-hide`), ale název zůstává klikací odkaz. Vždy jedno velké CTA „Otevřít aplikaci/úkol" (na mobilu na celou šířku).
- **Patička:** brand, odkaz na **nastavení notifikací** + **odhlásit**.
- **Deep-link:** odkazy na úkol vedou na `${APP_URL}/?task=<id>`.

**Schválené referenční mockupy** (otevíratelné HTML, slouží jako závazná předloha):
- `email-mockups/daily-C-combined.html`
- `email-mockups/task-reminder-combined.html`

## 3. Architektura / komponenty

### 3.1 Sdílený modul `supabase/functions/_shared/email.ts`
Vyextrahovat opakující se HTML do čistých, samostatně testovatelných funkcí (dnes je HTML duplikované inline v obou funkcích):

- `escHtml(s)` — escapování.
- `emailShell({ preheader, hero, content, footer }): string` — kostra (`<!doctype>`, výška, outer table, container 600px, MSO meta).
- `hero({ dateLabel, title, countBadge?, subtitle, statsDesktop, statsMobile }): string` — modro-fialová hlavička s brand row + nadpis + pilulka počtu + rozpad (desktop buňky / mobil řádek).
- `statCellsDesktop(items)` / `statRowMobile(items)` — rozpad.
- `section({ label, color, countPill, tasksHtml }): string` — sekce se sekčním nadpisem.
- `taskCard({ accentColor, title, taskUrl, desc, chips, showOpenButton }): string` — karta úkolu (název = odkaz, chipy, tlačítko).
- `chip({ text, tone })` — `neutral | red | amber | green`.
- `ctaCard({ title, text, buttonText, url })`, `footer({ unsubscribeUrl, settingsUrl })`.

Vstupní data = už zpracované DTO (žádná business logika v render vrstvě). Každá funkce: vstup → string, bez vedlejších efektů → snadno ověřitelné.

### 3.2 `daily-reminders/index.ts`
- Ponechat dotazy a třídění (overdue/today/tomorrow z `due_date`).
- Render přes `emailShell` + helpery. **Limit položek na sekci** (např. 5) + „Zobrazit další X" odkaz.
- `countBadge` = součet zobrazitelných (overdue+today+tomorrow).
- Subject: `${subjectParts} · Zentero` (beze změny logiky).
- Aktualizovat **plain-text** alternativu, aby odpovídala.

### 3.3 `task-reminders/index.ts`
- 1 i N úkolů (list karet). Hero: „Připomínka úkolu(ů)" + řádek „Nastaveno na <datetime>".
- Render přes stejné helpery.

### 3.4 Deep-link v appce
- `App.jsx` / `AppContext`: při startu přečíst `?task=<id>` (a volitelně `?project=<id>`) z `window.location`, po načtení dat otevřít `setTaskDetail(id)` (resp. `openProject`). Po otevření param z URL odstranit (`history.replaceState`), ať se to neopakuje. Ošetřit, když úkol neexistuje (tiše ignorovat).

## 4. Datový tok

`cron → edge function → dotaz Supabase → mapování na DTO → render (sdílené helpery) → Resend API (html + text)`.
`uživatel klik na úkol v mailu → ${APP_URL}/?task=<id> → appka otevře detail úkolu`.

## 5. Robustnost & QA

- Cílové klienty: **Gmail (web+app), Apple Mail (mac+iOS), Outlook (Windows desktop + web), mobil**.
- Kontrolní body: gradient → fallback barva v Outlooku; hranaté rohy v Outlooku OK; rozpad se na mobilu skládá vedle sebe (ne pod sebe); „Otevřít" skryté na mobilu; CTA na celou šířku; preheader se zobrazuje v náhledu schránky.
- Před nasazením projet přes **Litmus / Email on Acid** (nebo aspoň ruční test do Gmail/Outlook/iOS). Mockup soubory slouží jako vizuální reference.

## 6. Mimo rozsah (teď)

- AI tip „čím začít" a streak v mailu (odloženo).
- Granularita předvoleb notifikací per-typ, digesty, frekvence (zbytek iniciativy **I** — navazuje, vlastní spec).
- Ostatní typy e-mailů (uvítací, reset hesla…).

## 7. Otevřené otázky / rizika

- **Deep-link param** vyžaduje malou úpravu v appce; bez ní odkazy vedou jen do appky (degraduje korektně).
- Limit položek na sekci — potvrdit číslo (návrh 5).
- Logo v hlavičce je teď textové „Z" v dlaždici (bez externího obrázku) — robustnější než `<img>` (žádné blokované obrázky). Pokud chceme grafické logo, přidat `<img>` s `alt` fallbackem.
