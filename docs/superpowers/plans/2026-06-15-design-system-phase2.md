# UX/UI Sprint — Phase 2: First-login fix + SectionLabel Completion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** (1) Opravit onboarding wizard aby se zobrazoval pouze po skutečně prvním přihlášení (stav v Supabase, ne localStorage). (2) Dokončit rollout `SectionLabel` komponenty do zbývajících 3 souborů (14 výskytů).

**Architecture:**
- First-login: přidat `onboarded_at TIMESTAMPTZ` do `user_profiles`; AppContext ho přečte při každém loadu a synchronizuje localStorage; `OnboardingWizard.close()` zapíše timestamp do DB (fire-and-forget).
- SectionLabel: `src/components/ui/SectionLabel.jsx` + `ui/index.js` existují; každý cílový soubor dostane import a inline vzory se nahradí komponentou.

**Tech Stack:** React 19, Supabase (PostgreSQL), existující `tokens.css`, existující `ui/SectionLabel.jsx`.

---

## Soubory

| Soubor | Změny |
|--------|-------|
| `supabase/add_onboarded_at.sql` | **Nový** — migrace: přidání sloupce |
| `src/context/AppContext.jsx` | Po upsert user_profiles: SELECT onboarded_at a synchronizuj localStorage |
| `src/components/OnboardingWizard.jsx` | `close()` zapíše `onboarded_at` do DB + SectionLabel import + 4 replacements |
| `src/pages/TasksPage.jsx` | SectionLabel import + 4 replacements |
| `src/components/AuthGate.jsx` | SectionLabel import + 6 replacements + 1× hardcoded color fix |

---

### Task 0: First-login onboarding fix

**Files:**
- Create: `supabase/add_onboarded_at.sql`
- Modify: `src/context/AppContext.jsx`
- Modify: `src/components/OnboardingWizard.jsx`

Kontext: Wizard se aktuálně zobrazuje kdykoli chybí `mt3:onboarding_done` v `localStorage`. Při přihlášení na novém zařízení/prohlížeči se tedy zobrazí znovu. Cíl: vázat stav na Supabase účet, ne na prohlížeč.

- [ ] **Step 1: Vytvořit SQL migraci**

Vytvoř soubor `supabase/add_onboarded_at.sql`:

```sql
-- Přidá sloupec pro sledování prvního dokončení onboardingu (per účet, ne per prohlížeč)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
```

- [ ] **Step 2: Spustit migraci v Supabase dashboardu**

Otevři Supabase dashboard → SQL Editor → vložit a spustit obsah `supabase/add_onboarded_at.sql`.

Ověř: v tabulce `user_profiles` přibyl sloupec `onboarded_at` (nullable, default NULL).

- [ ] **Step 3: AppContext.jsx — číst onboarded_at a synchronizovat localStorage**

V `src/context/AppContext.jsx`, za blokem:
```js
        await supabase.from("user_profiles").upsert(
          {
            id: userId,
            email: userEmail,
            last_seen_at: new Date().toISOString(),
            ...(userDisplayName ? { display_name: userDisplayName } : {})
          },
          { onConflict: "id", ignoreDuplicates: false }
        );
        if (cancelled) return;
```

Přidej (hned za `if (cancelled) return;`):
```js
        const { data: profileRow } = await supabase
          .from("user_profiles")
          .select("onboarded_at")
          .eq("id", userId)
          .single();
        if (!cancelled && profileRow?.onboarded_at) {
          localStorage.setItem("mt3:onboarding_done", "1");
          window.dispatchEvent(new Event("mt3:onboarding_done"));
        }
        if (cancelled) return;
```

Logika: pokud má uživatel `onboarded_at` v DB (dokončil onboarding dřív na jiném zařízení), synchronizujeme to do localStorage a dispatchneme event, aby App.jsx skryl wizard dřív než se zobrazí.

- [ ] **Step 4: OnboardingWizard.jsx — zapsat onboarded_at do DB při zavření**

V `src/components/OnboardingWizard.jsx` nahraď funkci `close()`:

```js
// PŘED:
function close() {
  localStorage.setItem(LS_KEY, "1");
  window.dispatchEvent(new Event("mt3:onboarding_done"));
}

// PO:
function close() {
  localStorage.setItem(LS_KEY, "1");
  window.dispatchEvent(new Event("mt3:onboarding_done"));
  supabase
    .from("user_profiles")
    .update({ onboarded_at: new Date().toISOString() })
    .eq("id", userId)
    .then(() => {});
}
```

`userId` je již dostupný z `useApp()` (destrukturován na řádku ~87). `.then(() => {})` = fire-and-forget (selhání nevadí — nejhůř wizard znovu na příštím zařízení).

- [ ] **Step 5: Lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```
Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add supabase/add_onboarded_at.sql src/context/AppContext.jsx src/components/OnboardingWizard.jsx && git commit -m "fix: tie onboarding completion to Supabase account, not localStorage"
```

---

### Task 1: TasksPage.jsx (4 výskyty)

**Files:**
- Modify: `src/pages/TasksPage.jsx`

Kontext: Filtrační panel na pravé straně TasksPage obsahuje 4 identické section-label bloky (Termín, Priorita, Projekt, Tag). Všechny mají `marginBottom: 10`.

- [ ] **Step 1: Přidat import**

Za řádek:
```js
import { STATUSES } from "../constants.js";
```
Přidej:
```js
import { SectionLabel } from "../components/ui/index.js";
```

- [ ] **Step 2: Nahradit 4 výskyty (replace_all)**

Hledej a nahraď tento přesný řetězec (vyskytuje se přesně 4×):
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, fontFamily: "var(--font-mono)" }}>

// PO:
<SectionLabel style={{ marginBottom: 10 }}>
```
A odpovídající uzavírací tagy — nahraď `</div>` → `</SectionLabel>` (jen pro tyto 4 bloky; ověř kontextem).

Konkrétní texty v blocích (pro orientaci): `Termín`, `Priorita`, `Projekt`, `Tag`.

- [ ] **Step 3: Lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```
Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/pages/TasksPage.jsx && git commit -m "refactor: replace inline section-label divs with SectionLabel in TasksPage"
```

---

### Task 2: OnboardingWizard.jsx (4 výskyty)

**Files:**
- Modify: `src/components/OnboardingWizard.jsx`

Kontext: OnboardingWizard má dva typy section-labelů:
- **Typ A** (2×): `<div>` se step headery ("Krok 1 ze 3", "Krok 2 ze 3") → přímá náhrada
- **Typ B** (2×): `<label style={labelStyle}>` kde `labelStyle` je JS objekt definovaný na řádku ~156 → odstraň const, nahraď labely

`labelStyle` má `color: "var(--text-2, #94a3b8)"` — normalizujeme na `var(--text-3)` (vizuálně nepatrný rozdíl v dark mode). Labely nemají `htmlFor` → není sémantická ztráta přechodem na `<div>`.

- [ ] **Step 1: Přidat import**

Za řádek:
```js
import { useApp } from '../context/AppContext.jsx'
```
Přidej:
```js
import { SectionLabel } from "../components/ui/index.js";
```

- [ ] **Step 2: Odstranit `labelStyle` const (řádky ~156–161)**

Nahraď celý blok:
```js
  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: ".06em",
    color: "var(--text-2, #94a3b8)", marginBottom: 7,
  };
```
Ničím (celý blok smaž).

- [ ] **Step 3: Nahradit Typ B — `<label style={labelStyle}>` (2×)**

```jsx
// PŘED (2× identické, různý obsah):
<label style={labelStyle}>Název workspace</label>
// a:
<label style={labelStyle}>Vzhled</label>

// PO:
<SectionLabel style={{ marginBottom: 7 }}>Název workspace</SectionLabel>
// a:
<SectionLabel style={{ marginBottom: 7 }}>Vzhled</SectionLabel>
```

- [ ] **Step 4: Nahradit Typ A — step headery (2×)**

```jsx
// PŘED (2× stejný pattern, různý text):
<div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3, #64748b)", marginBottom: 6 }}>
  Krok 1 ze 3
</div>
// a:
<div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3, #64748b)", marginBottom: 6 }}>
  Krok 2 ze 3
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>Krok 1 ze 3</SectionLabel>
// a:
<SectionLabel style={{ marginBottom: 6 }}>Krok 2 ze 3</SectionLabel>
```

- [ ] **Step 5: Lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```
Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/components/OnboardingWizard.jsx && git commit -m "refactor: replace inline section-label divs with SectionLabel in OnboardingWizard"
```

---

### Task 3: AuthGate.jsx (6 výskytů + bonus)

**Files:**
- Modify: `src/components/AuthGate.jsx`

Kontext: AuthGate (přihlašovací stránka) má 6 `<label>` elementů používaných jako sekce-labely. Žádný nemá `htmlFor` → přechod na `<SectionLabel>` (<div>) je bezpečný. Barva `#9ca3af` je hardcoded — nahrazení `var(--text-3)` ji normalizuje (v dark mode bude o drobek tmavší, v light mode identická).

Bonus: řádek ~914 má `<button>` s `color: "#fbbf24"` → nahradit `var(--accent)`.

- [ ] **Step 1: Přidat import**

Za řádek:
```js
import { supabase } from '../supabase.js'
```
Přidej:
```js
import { SectionLabel } from "./ui/index.js";
```

- [ ] **Step 2: Nahradit 5 výskytů s marginBottom (replace_all)**

Hledej a nahraď (přesně 5×):
```jsx
// PŘED:
<label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", marginBottom: "8px" }}>

// PO:
<SectionLabel style={{ marginBottom: 8 }}>
```
A uzavírací `</label>` → `</SectionLabel>` (jen pro tyto 5 bloků).

Konkrétní obsah labelů (pro ověření): `Nové heslo`, `E-mailová adresa` (2×), `Heslo` možná, `Potvrzení hesla` — přesná jména závisí na kontextu; ověř vizuálně.

- [ ] **Step 3: Nahradit 1 výskyt bez marginBottom (řádek ~907)**

```jsx
// PŘED:
<label style={{ display: "block", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af" }}>
  Heslo
</label>

// PO:
<SectionLabel>
  Heslo
</SectionLabel>
```

- [ ] **Step 4: Bonus — hardcoded accent color v buttonu (řádek ~914)**

```jsx
// PŘED:
style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "11px", cursor: "pointer", padding: "0" }}

// PO:
style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "11px", cursor: "pointer", padding: "0" }}
```

- [ ] **Step 5: Lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```
Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/components/AuthGate.jsx && git commit -m "refactor: replace inline section-label divs with SectionLabel in AuthGate"
```

---

## Co se NEŘEŠÍ v tomto plánu

Tyto výskyty `fontSize: 11` v kódu nejsou section-labely a zůstanou beze změny:

| Soubor | Důvod vynechání |
|--------|-----------------|
| `src/layout/Sidebar.jsx:401` | Číslo dne v kalendáři — kontextový styl, ne sekce-label |
| `src/App.jsx:157` | Notifikační text o reloadu (`fontSize: 11.5`, jiný kontext) |
| `src/components/ProjectChatPanel.jsx:189` | Footer info — bez uppercase, jiný kontext |
| `src/components/AIDailyPlan.jsx:215,217` | Debug details/pre — jiný kontext |
| `src/pages/TagsPage.jsx:190,191` | Font-size na tlačítkách, ne section-labely |
| `src/pages/ProjectsPage.jsx:244,691` | Projektový badge s dynamickou barvou, `<span>` v inline kontextu |
| `src/components/TaskDrawer.jsx:549,692,728` | Mix kontextů — bez uppercase nebo jiný pattern |
| `src/pages/DashboardPage.jsx:51,170` | Subtask count badge a inline kontext |
| Admin komponenty | Out of scope — admin panel řeší CI/C sprint |

## Další fáze initiative D (neplánováno)

Po uzavření tohoto plánu zbývají v rámci initiative D:
- **D3 — Token migrace**: nahradit `t.xxx` (406 výskytů) za `var(--text-1)` atd. — samostatný velký sprint
- **D4 — Přístupnost**: doplnit `aria-label` na interaktivní prvky (modaly, buttony bez textu)
- **D5 — Jednotné stavy**: sjednotit loading/empty/error patterny přes `<Skeleton>` a `<EmptyState>`
