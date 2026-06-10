# Email Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`).

**Goal:** Přestavět denní souhrn a připomínku úkolu do světlého bulletproof vzhledu (modro-fialové hero) přes sdílený render modul a doplnit deep-link na úkol.

**Architecture:** Vyextrahovat HTML render do `supabase/functions/_shared/email.ts` (čisté funkce vstup→string). Obě edge functions (`daily-reminders`, `task-reminders`) ponechají business logiku a jen volají sdílené helpery. V appce přečíst `?task=<id>` z URL a otevřít detail.

**Tech Stack:** Deno edge functions (Supabase), Resend API, React 19 SPA.

**Ověřování (realita projektu):** lokálně NENÍ `deno` ani test framework. Ověření = (a) HTML musí odpovídat schváleným mockupům `email-mockups/daily-C-combined.html` a `task-reminder-combined.html`; (b) `deno check` proběhne při `supabase functions deploy`; (c) reálný test-mail přes Resend + kontrola v Gmail/Outlook/iOS. Pro appku: `npm run build` musí projít.

---

## File Structure

- Create: `supabase/functions/_shared/email.ts` — čisté render funkce (shell, hero, section, taskCard, chip, ctaCard, footer). Jediná odpovědnost: HTML stringy.
- Modify: `supabase/functions/daily-reminders/index.ts` — odstranit inline HTML helpery, volat `_shared/email.ts`.
- Modify: `supabase/functions/task-reminders/index.ts` — totéž.
- Modify: `src/App.jsx` (nebo `src/context/AppContext.jsx`) — deep-link `?task=`.

---

## Task 1: Sdílený render modul

**Files:** Create `supabase/functions/_shared/email.ts`

Veřejné API (signatury, závazné — používají je Task 2 a 3):

```ts
export function escHtml(s: string): string;

export type Chip = { text: string; tone?: "neutral" | "red" | "amber" | "green" };
export function chip(c: Chip): string;

export type StatItem = { label: string; value: number; color: string }; // color = hex tečky
export function heroBlock(opts: {
  dateLabel: string;
  title: string;
  countBadge?: string;     // text v pilulce vedle nadpisu, např. "9 úkolů"
  subtitle: string;
  stats?: StatItem[];      // 3 položky → desktop buňky + mobil řádek; prázdné → nic
  extraLine?: string;      // volný řádek pod podtitulkem (např. "Nastaveno na …")
}): string;

export type TaskRow = {
  title: string;
  url: string;             // deep-link
  desc?: string;
  chips: Chip[];
  accent: string;          // hex levého proužku
};
export function section(opts: {
  label: string; dotColor: string; countPill?: { text: string; tone: "red"|"amber"|"green" };
  tasks: TaskRow[]; moreHref?: string; moreText?: string;
}): string;

export function ctaCard(opts: { title: string; text: string; buttonText: string; url: string }): string;
export function footer(opts: { note: string; settingsUrl: string; unsubscribeText?: string; unsubscribeUrl?: string }): string;

export function emailShell(opts: { preheader: string; bodyHtml: string }): string; // celá kostra
```

Implementace = 1:1 přepis bloků ze schválených mockupů (modro-fialové hero `#2563eb→#4f46e5→#7c3aed` s `bgcolor="#4f46e5"`; tabulky; inline styly; `.em-desk-stats`/`.em-mob-stats` přepínání; `.em-hide` pro tlačítko Otevřít; `<style>` jen s media queries). `chip` tóny: neutral `#f4f5f7/#e7e7ea/#475467`, red `#fff1f0/#ffd0cc/#b42318`, amber `#fffaeb/#fedf89/#b54708`, green `#f0fdf4/#bbf7d0/#15803d`.

- [ ] **Step 1:** Vytvořit soubor s funkcemi výše, HTML zkopírovat z `email-mockups/daily-C-combined.html` (hero, section, taskCard, cta, footer) a parametrizovat. `emailShell` = `<!doctype>` + `<style>` (media queries z mockupu) + outer table + container 600.
- [ ] **Step 2:** Ověřit, že vygenerovaný řetězec pro vzorová data odpovídá mockupu (vizuálně porovnat — otevřít výstup vedle `daily-C-combined.html`).
- [ ] **Step 3:** Commit `git add supabase/functions/_shared/email.ts && git commit -m "feat(email): sdílený render modul pro e-maily"`.

## Task 2: daily-reminders přes sdílený modul

**Files:** Modify `supabase/functions/daily-reminders/index.ts`

- [ ] **Step 1:** Importovat z `../_shared/email.ts`. Odstranit lokální `metricCard`, `section`, `taskCard`, a inline HTML v `sendDailyEmail` (escHtml/formatDate/priorityColor ponechat NEBO přesunout do shared a importovat — DRY: přesunout `escHtml` do shared, zbytek nech lokálně dle potřeby).
- [ ] **Step 2:** Sestavit `bodyHtml`:
  - `heroBlock({ dateLabel, title:"Denní přehled úkolů", countBadge:`${overdue.length+dueToday.length+dueTomorrow.length} úkolů`, subtitle:"Co už hoří, co je potřeba dnes a co se blíží v dalších dnech.", stats:[{label:"Po termínu",value:overdue.length,color:"#ef4444"},{label:"Dnes",value:dueToday.length,color:"#f59e0b"},{label:"Blíží se",value:dueTomorrow.length,color:"#22c55e"}] })`
  - 3× `section(...)` s mapováním tasků na `TaskRow` (url = `${APP_URL}/?task=${t.id}`, chips: projekt(neutral) + termín(red/amber) + priorita pokud je). **Limit 5 položek/sekce**, zbytek → `moreHref=${APP_URL}`, `moreText="Zobrazit další N po termínu"`.
  - `ctaCard({title:"Chceš to rovnou odbavit?",text:"Otevři Zentero a projdi úkoly podle termínu, priority nebo projektu.",buttonText:"Otevřít aplikaci",url:APP_URL})`
  - `footer({note:"Automatický denní souhrn ze Zentero…", settingsUrl:`${APP_URL}`, unsubscribeText:"Odhlásit denní přehled", unsubscribeUrl:APP_URL})`
- [ ] **Step 3:** `html = emailShell({ preheader: subjectParts, bodyHtml })`. Subject + `text` (plain) ponechat, jen `text` doplnit, ať sedí.
- [ ] **Step 4:** Ověřit ručně, že výsledné HTML ≈ mockup. Commit `git commit -am "refactor(daily-reminders): nový bulletproof vzhled přes shared modul"`.

## Task 3: task-reminders přes sdílený modul

**Files:** Modify `supabase/functions/task-reminders/index.ts`

- [ ] **Step 1:** Import z `../_shared/email.ts`, odstranit lokální `taskCard`/`reminderHeroCard`/inline HTML.
- [ ] **Step 2:** `bodyHtml`:
  - `heroBlock({ dateLabel, title: tasks.length===1?"Připomínka úkolu":"Připomínka úkolů", subtitle:"Tuhle připomínku sis nastavil u konkrétního úkolu.", extraLine: `Nastaveno na ${formatDateTime(tasks[0]?.remind_at)}` })` (bez `stats`).
  - 1× `section({ label: tasks.length===1?"Připomínaný úkol":"Připomínané úkoly", dotColor:"#f59e0b", countPill:{text:String(tasks.length),tone:"amber"}, tasks: tasks.map → TaskRow accent `#f59e0b` })`.
  - `ctaCard({title:"Otevřít připomínaný úkol",text:"Zkontroluj detail, posuň termín, nebo úkol rovnou dokonči.",buttonText:"Otevřít úkol",url: tasks.length===1?`${APP_URL}/?task=${tasks[0].id}`:APP_URL})`
  - `footer(...)`.
- [ ] **Step 3:** `emailShell`, subject/text ponechat. Commit `git commit -am "refactor(task-reminders): nový vzhled přes shared modul"`.

## Task 4: Deep-link na úkol v appce

**Files:** Modify `src/App.jsx` (efekt po načtení) nebo `src/context/AppContext.jsx`

- [ ] **Step 1:** Najít, kde se setují data po loginu/loadu (kde je `loaded`/`tasks`). Přidat efekt:

```jsx
useEffect(() => {
  if (!loaded) return;                       // počkat na data
  const params = new URLSearchParams(window.location.search);
  const taskId = params.get("task");
  if (taskId && tasks.some(t => t.id === taskId)) {
    setTaskDetail(taskId);
    params.delete("task");
    const q = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
  }
}, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps
```

(Použít skutečné názvy z `useApp()` — `loaded`/`tasks`/`setTaskDetail`. Ověřit, že existují; pokud `loaded` chybí, navázat na první neprázdné `tasks`.)
- [ ] **Step 2:** `npm run build` → musí projít.
- [ ] **Step 3:** Commit `git commit -am "feat(app): deep-link ?task=<id> otevře detail úkolu z e-mailu"`.

## Task 5: Ověření & nasazení (manuální)

- [ ] **Step 1:** `supabase functions deploy daily-reminders task-reminders` (proběhne `deno check`).
- [ ] **Step 2:** Spustit obě funkce ručně / poslat test-mail; zkontrolovat v **Gm, Outlook, iOS Mail** + úzké okno (mobil): rozpad desktop buňky / mobil řádek vedle sebe; tlačítko Otevřít skryté na mobilu; deep-link otevře úkol.
- [ ] **Step 3:** Push větve.

---

## Self-Review

- **Pokrytí specu:** hero (logo/čas/nadpis/počet/rozpad) ✓ Task 1+2; sekce + karty + chipy + deep-link ✓ Task 1/2/3; CTA + patička ✓; připomínka úkolu ✓ Task 3; deep-link v appce ✓ Task 4; bulletproof + responzivita ✓ (HTML z mockupů). Sdílený modul ✓ Task 1.
- **Placeholdery:** API a postup konkrétní; chybějící „úplný kód každého helperu" je vědomě nahrazen odkazem na mockupy jako zdroj pravdy (1:1 přepis) — DRY vůči 250 řádkům HTML.
- **Typy:** `heroBlock/section/taskCard/chip/ctaCard/footer/emailShell` použité konzistentně v Task 2/3. `TaskRow.url`/`accent` konzistentní.
- **Riziko:** názvy z `useApp()` v Task 4 (`loaded`/`setTaskDetail`) ověřit při exekuci.
