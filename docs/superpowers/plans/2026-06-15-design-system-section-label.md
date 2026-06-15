# Design System: SectionLabel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extrahovat nejčastěji duplikovaný UI vzor (sekce-label) do `SectionLabel` komponenty a nasadit ji do 4 souborů (29 výskytů).

**Architecture:** Nová `.section-label` CSS třída v existujícím `ui.css` (používá tokeny z `tokens.css`) + minimální React wrapper `SectionLabel.jsx` v `src/components/ui/`. Komponenta se přidá do `ui/index.js` exportu a importuje v každém cílovém souboru.

**Tech Stack:** React 19, existující `tokens.css` (--text-xs, --weight-bold, --font-mono, --text-3), existující `ui.css`.

---

## Soubory

- **Modify:** `src/styles/ui.css` — přidat `.section-label` třídu za `.panel` sekci
- **Create:** `src/components/ui/SectionLabel.jsx` — React wrapper
- **Modify:** `src/components/ui/index.js` — přidat export
- **Modify:** `src/components/QuickAdd.jsx` — 7 replacements (import + náhrady)
- **Modify:** `src/pages/QuickTodosPage.jsx` — 5 replacements
- **Modify:** `src/pages/TimelinePage.jsx` — 7 replacements (normalizace fontWeight 600→700, letterSpacing 0.08em→0.06em)
- **Modify:** `src/components/AITaskAssist.jsx` — 5 replacements (normalizace fontSize 12→11)

---

### Task 1: CSS třída + React komponenta + export

**Files:**
- Modify: `src/styles/ui.css`
- Create: `src/components/ui/SectionLabel.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Přidat `.section-label` třídu do `ui.css`**

Na konec souboru `src/styles/ui.css` přidej:

```css
/* ══════════════════════════════════════════════════════════════
   SECTION LABEL
   Uppercase mono nadpis sekce — nahrazuje 59× opakovaný inline vzor.
   ══════════════════════════════════════════════════════════════ */
.section-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-mono);
}
```

- [ ] **Step 2: Vytvořit `src/components/ui/SectionLabel.jsx`**

```jsx
import React from "react";

export default function SectionLabel({ children, style, className = "" }) {
  return (
    <div className={`section-label${className ? ` ${className}` : ""}`} style={style}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Přidat export do `src/components/ui/index.js`**

Aktuální obsah:
```js
export { default as Button } from "./Button.jsx";
export { default as Input } from "./Input.jsx";
export { default as Badge } from "./Badge.jsx";
export { default as Panel } from "./Panel.jsx";
```

Nahraď za:
```js
export { default as Button } from "./Button.jsx";
export { default as Input } from "./Input.jsx";
export { default as Badge } from "./Badge.jsx";
export { default as Panel } from "./Panel.jsx";
export { default as SectionLabel } from "./SectionLabel.jsx";
```

- [ ] **Step 4: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/styles/ui.css src/components/ui/SectionLabel.jsx src/components/ui/index.js && git commit -m "feat: add SectionLabel component to design system"
```

---

### Task 2: Wire-up v `QuickAdd.jsx` (7 výskytů)

**Files:**
- Modify: `src/components/QuickAdd.jsx`

Kontext: `QuickAdd.jsx` je velká komponenta (1152 řádků) s formulářem pro přidávání úkolů. Obsahuje 7 section-label `<div>` elementů — všechny mají `fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)"`.

- [ ] **Step 1: Přidat import**

V `src/components/QuickAdd.jsx` za řádek:
```js
import { supabase } from '../supabase.js'
```

Přidej:
```js
import { SectionLabel } from "./ui/index.js";
```

- [ ] **Step 2: Nahradit 7 výskytů**

Nahraď každý z těchto 7 bloků (všechny jsou na jednom řádku):

**Náhrada 1 — řádek ~479 (AI draft section):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
  Napište, co je potřeba udělat (AI navrhne parametry)
</div>

// PO:
<SectionLabel>
  Napište, co je potřeba udělat (AI navrhne parametry)
</SectionLabel>
```

**Náhrada 2 — řádek ~587 (Popis section):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
  Popis úkolu (volitelný)
</div>

// PO:
<SectionLabel>
  Popis úkolu (volitelný)
</SectionLabel>
```

**Náhrada 3 — řádek ~630 (Status section, s marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
  Status
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Status
</SectionLabel>
```

**Náhrada 4 — řádek ~675 (Priorita section, s marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
  Priorita
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Priorita
</SectionLabel>
```

**Náhrada 5 — řádek ~745 (Projekt section):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
  Projekt
</div>

// PO:
<SectionLabel>
  Projekt
</SectionLabel>
```

**Náhrada 6 — řádek ~870 (Termín section, s marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
  Termín
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Termín
</SectionLabel>
```

**Náhrada 7 — řádek ~922 (Tagy section):**
```jsx
// PŘED:
<div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-mono)" }}>
  Tagy
</div>

// PO:
<SectionLabel>
  Tagy
</SectionLabel>
```

Pozor: Nenahrazuj řádek ~390 — ten má `color: t.accent, fontSize: 13` a je to header modalu, ne section-label.

- [ ] **Step 3: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/components/QuickAdd.jsx && git commit -m "refactor: replace inline section-label divs with SectionLabel in QuickAdd"
```

---

### Task 3: Wire-up v `QuickTodosPage.jsx` (5 výskytů)

**Files:**
- Modify: `src/pages/QuickTodosPage.jsx`

Kontext: `QuickTodosPage.jsx` používá `<label>` elementy (ne `<div>`) — bez `htmlFor` atributu, takže přechod na `<div>` (který SectionLabel renderuje) je v pořádku. Tyto labely již používají `var(--text-3)` místo `t.text3`.

- [ ] **Step 1: Přidat import**

V `src/pages/QuickTodosPage.jsx` za řádek:
```js
import { useConfirm } from '../components/Confirm.jsx'
```

Přidej:
```js
import { SectionLabel } from "../components/ui/index.js";
```

- [ ] **Step 2: Nahradit 5 výskytů `<label>` (řádky ~224, ~239, ~256, ~284, ~300)**

Všechny mají identický vzor bez marginBottom:

```jsx
// PŘED (5× identické, jen různý obsah):
<label style={{ fontSize: "11px", color: "var(--text-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
  Název
</label>

// PO:
<SectionLabel>
  Název
</SectionLabel>
```

Konkrétně: obsah labelů je `Název`, `Popis`, `Priorita`, `Termín splnění`, `Tagy`. Všechny 5 `<label>` → `<SectionLabel>`, žádný nemá marginBottom.

- [ ] **Step 3: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/pages/QuickTodosPage.jsx && git commit -m "refactor: replace inline label section headers with SectionLabel in QuickTodosPage"
```

---

### Task 4: Wire-up v `TimelinePage.jsx` (7 výskytů)

**Files:**
- Modify: `src/pages/TimelinePage.jsx`

Kontext: `TimelinePage.jsx` používá `<label>` elementy bez `htmlFor`. Vzor má `fontWeight: 600` a `letterSpacing: "0.08em"` — mírně se liší od standardu (700, 0.06em). Nahrazení je **záměrnou normalizací** — výsledek bude o drobek tučnější a s těsnějším letter-spacing (vizuálně nezřetelný rozdíl).

Dva podvzory:
- **Pattern A** (6× — s `marginBottom: 6`): `<label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>`
- **Pattern B** (1× — bez marginBottom): `<label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", fontWeight: 600 }}>` (řádek ~282, uvnitř flex-row spolu se "Zrušit" linkem)

- [ ] **Step 1: Přidat import**

V `src/pages/TimelinePage.jsx` za řádek:
```js
import EmptyState from "../components/EmptyState.jsx";
```

Přidej:
```js
import { SectionLabel } from "../components/ui/index.js";
```

- [ ] **Step 2: Nahradit Pattern A (6× — s marginBottom)**

```jsx
// PŘED (6× identické):
<label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 6, fontWeight: 600 }}>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
```

A odpovídající uzavírací tag:
```jsx
// PŘED:
</label>

// PO:
</SectionLabel>
```

Použij globální find-and-replace pro přesný řetězec — Pattern A se v souboru vyskytuje přesně 6×. Obsah tagů (Název úkolu, Datum, Čas, Opakování, apod.) se nemění.

- [ ] **Step 3: Nahradit Pattern B (1× — bez marginBottom, řádek ~282)**

```jsx
// PŘED:
<label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", fontWeight: 600 }}>
  Projekt
</label>

// PO:
<SectionLabel>
  Projekt
</SectionLabel>
```

- [ ] **Step 4: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 5: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/pages/TimelinePage.jsx && git commit -m "refactor: replace inline label section headers with SectionLabel in TimelinePage"
```

---

### Task 5: Wire-up v `AITaskAssist.jsx` (5 výskytů)

**Files:**
- Modify: `src/components/AITaskAssist.jsx`

Kontext: `AITaskAssist.jsx` je samostatná komponenta s vnitřní funkcí `ResultView({ action, result, t })`. Tato funkce dostává `t` (theme objekt) jako prop — nikoli přes `useApp()`. Vzor má `fontSize: 12` (ne 11) — nahrazení je záměrnou normalizací (12→11px).

5 výskytů je v `ResultView`, ne v hlavní komponentě. Všechny mají `color: t.text3`, `textTransform: "uppercase"`, `letterSpacing: ".06em"`, `fontWeight: 700` a `marginBottom` (různé hodnoty: 10 nebo 6).

- [ ] **Step 1: Přidat import**

V `src/components/AITaskAssist.jsx` za řádek:
```js
import { getAiErrorMessage, parseAiJsonResult } from '../utils/aiErrors.js'
```

Přidej:
```js
import { SectionLabel } from "./ui/index.js";
```

- [ ] **Step 2: Nahradit 5 výskytů v `ResultView`**

**Náhrada 1 — řádek ~343 (Návrh optimalizace, marginBottom: 10):**
```jsx
// PŘED:
<div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>
  Návrh optimalizace
</div>

// PO:
<SectionLabel style={{ marginBottom: 10 }}>
  Návrh optimalizace
</SectionLabel>
```

**Náhrada 2 — řádek ~388 (Navržené podúkoly, marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
  Navržené podúkoly
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Navržené podúkoly
</SectionLabel>
```

**Náhrada 3 — řádek ~404 (Navržené tagy, marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
  Navržené tagy
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Navržené tagy
</SectionLabel>
```

**Náhrada 4 — řádek ~421 (Navržený popis, marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
  Navržený popis
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Navržený popis
</SectionLabel>
```

**Náhrada 5 — řádek ~433 (Navržená priorita, marginBottom: 6):**
```jsx
// PŘED:
<div style={{ fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
  Navržená priorita
</div>

// PO:
<SectionLabel style={{ marginBottom: 6 }}>
  Navržená priorita
</SectionLabel>
```

Pozor: Nenahrazuj řádek ~458 — ten je `<span>` uvnitř `OptimizeRow` s `fontWeight: 600, letterSpacing: ".05em"` — jiný kontext.

- [ ] **Step 3: Ověřit lint**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks" && git add src/components/AITaskAssist.jsx && git commit -m "refactor: replace inline section-label divs with SectionLabel in AITaskAssist"
```
