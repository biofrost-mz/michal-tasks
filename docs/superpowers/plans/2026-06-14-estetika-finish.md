# Estetika Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opravit light-mode priority badge barvy, zvýšit viditelnost soft pozadí badge, přidat border filter chipům a theme-aware prio CSS proměnné.

**Architecture:** Čistě vizuální změny ve dvou souborech. Nejdříve přidáme CSS proměnné do `atlas-shell.css` (dark + light overrides), poté aktualizujeme JSX tak, aby místo hardcoded hex barev používal tyto proměnné.

**Tech Stack:** React 19, Vite 7, inline CSS custom properties v JSX (style={{ "--var": "val" }}), CSS `color-mix()`, `:root.light` selektory.

---

## Soubory

- **Modify:** `src/styles/atlas-shell.css` — přidat `--prio-low/med/high` do `:root` a `:root.light`, bumputovat soft opacity, přidat chip border + prio bg override
- **Modify:** `src/components/atlas/AtlasTaskCard.jsx:11-15` — PRIORITY_META colors → CSS vars
- **Modify:** `src/pages/ProjectsPage.jsx:103,484` — hardcoded `#f87171` → `var(--prio-high)`

---

### Task 1: CSS proměnné a light-mode overrides v atlas-shell.css

**Files:**
- Modify: `src/styles/atlas-shell.css`

Cílem je:
1. Přidat `--prio-low`, `--prio-med`, `--prio-high` do tmavého `:root` bloku (zachovat stávající barvy)
2. Přidat light-mode overrides do `:root.light` bloku (kontrastnější barvy)
3. Zvýšit opacity u `*-soft` proměnných v `:root.light` z 0.08 na 0.12
4. Přidat standalone CSS pravidla pro light-mode chip border a prio background

- [ ] **Step 1: Přidat prio vars do `:root` bloku (tmavý mód)**

V `src/styles/atlas-shell.css` na řádku 42 je `--gray: #8b8f9c;`. Ihned ZA tento řádek přidej:

```css
  --prio-low: #60a5fa;
  --prio-med: #fbbf24;
  --prio-high: #f87171;
```

Výsledek v souboru (okolí):
```css
  --gray: #8b8f9c;
  --prio-low: #60a5fa;
  --prio-med: #fbbf24;
  --prio-high: #f87171;

  /* dynamic overlays */
```

- [ ] **Step 2: Přidat prio vars do `:root.light` bloku**

V `src/styles/atlas-shell.css` na řádku 100 je `--gray: #5c637a;`. Ihned ZA tento řádek přidej:

```css
  --prio-low: #1565c0;
  --prio-med: #b45309;
  --prio-high: #c62828;
```

Výsledek v souboru (okolí):
```css
  --gray: #5c637a;
  --prio-low: #1565c0;
  --prio-med: #b45309;
  --prio-high: #c62828;

  /* dynamic overlays */
```

- [ ] **Step 3: Zvýšit soft opacity v `:root.light` bloku**

V `:root.light` bloku nahraď VŠECHNY `*-soft` hodnoty s opacitou 0.08 na 0.12. Konkrétní řádky k editaci:

```css
  /* PŘED: */
  --red-soft: rgba(211, 47, 47, 0.08);
  --orange-soft: rgba(202, 138, 4, 0.08);
  --blue-soft: rgba(21, 101, 192, 0.08);
  --green-soft: rgba(46, 125, 50, 0.08);
  --accent-soft: rgba(197, 138, 54, 0.08);
```

```css
  /* PO: */
  --red-soft: rgba(211, 47, 47, 0.12);
  --orange-soft: rgba(202, 138, 4, 0.12);
  --blue-soft: rgba(21, 101, 192, 0.12);
  --green-soft: rgba(46, 125, 50, 0.12);
  --accent-soft: rgba(197, 138, 54, 0.12);
```

Poznámka: `--accent-soft` v `:root.light` je na řádku `--accent-soft: rgba(197, 138, 54, 0.08);` těsně pod `--accent-glow`. Edituj ten výskyt v `:root.light`, ne v `:root`.

- [ ] **Step 4: Přidat standalone light-mode pravidla po `:root.light {}` bloku**

Najdi místo těsně za uzavírací `}` bloku `:root.light` (kolem řádku 107 — je tam pak blok `:root[data-density="compact"]`). Ihned ZA `}` bloku `:root.light` přidej tyto dvě samostatná pravidla:

```css
:root.light .chip {
  border-color: var(--border);
}

:root.light .prio {
  background: color-mix(in srgb, var(--prio-color) 18%, transparent);
}
```

Výsledek (okolí):
```css
  --card-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

:root.light .chip {
  border-color: var(--border);
}

:root.light .prio {
  background: color-mix(in srgb, var(--prio-color) 18%, transparent);
}

:root[data-density="compact"] {
```

- [ ] **Step 5: Ověřit lint**

```bash
cd "Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: žádné chyby (CSS změny lint nekontroluje, ale ověříme že jsme nic nerozbili).

- [ ] **Step 6: Commit**

```bash
git add src/styles/atlas-shell.css
git commit -m "feat: theme-aware prio CSS vars, soft opacity bump, chip border in light mode"
```

---

### Task 2: JSX — nahradit hardcoded priority barvy CSS proměnnými

**Files:**
- Modify: `src/components/atlas/AtlasTaskCard.jsx:11-15`
- Modify: `src/pages/ProjectsPage.jsx:103,484`

- [ ] **Step 1: Aktualizovat PRIORITY_META v AtlasTaskCard.jsx**

V `src/components/atlas/AtlasTaskCard.jsx` najdi blok (kolem řádku 11):

```js
const PRIORITY_META = {
  low: { label: "Nízká", glyph: "↓", color: "#60a5fa" },
  medium: { label: "Střední", glyph: "—", color: "#fbbf24" },
  high: { label: "Vysoká", glyph: "↑", color: "#f87171" },
};
```

Nahraď za:

```js
const PRIORITY_META = {
  low: { label: "Nízká", glyph: "↓", color: "var(--prio-low)" },
  medium: { label: "Střední", glyph: "—", color: "var(--prio-med)" },
  high: { label: "Vysoká", glyph: "↑", color: "var(--prio-high)" },
};
```

`PrioChip` komponenta na řádku 65 používá `m.color` přes `style={{ "--prio-color": m.color }}` — to zůstane beze změny. CSS engine správně vyřeší `--prio-color: var(--prio-high)` na aktuální hodnotu z tématického `:root` nebo `:root.light`.

- [ ] **Step 2: Aktualizovat hardcoded barvy v ProjectsPage.jsx**

V `src/pages/ProjectsPage.jsx` jsou dva výskyty hardcoded `#f87171` (řádky 103 a 484):

```jsx
{/* PŘED (řádek 103): */}
{t.priority === "high" ? <span className="prio" style={{ "--prio-color": "#f87171" }}>↑ Vysoká</span> : null}

{/* PO: */}
{t.priority === "high" ? <span className="prio" style={{ "--prio-color": "var(--prio-high)" }}>↑ Vysoká</span> : null}
```

```jsx
{/* PŘED (řádek 484): */}
{activeTask.priority === "high" ? <span className="prio" style={{ "--prio-color": "#f87171" }}>↑ Vysoká</span> : null}

{/* PO: */}
{activeTask.priority === "high" ? <span className="prio" style={{ "--prio-color": "var(--prio-high)" }}>↑ Vysoká</span> : null}
```

- [ ] **Step 3: Ověřit lint**

```bash
cd "Hero projekty/michal-tasks" && npm run lint
```

Očekáváno: 0 errors, 0 warnings.

- [ ] **Step 4: Vizuální kontrola**

Spusť dev server (`npm run dev`) a přepni na **světlý mód** (Nastavení → přepínač tématu). Zkontroluj:
- TasksPage: `.prio` badge u úkolů s priority=high je tmavě červená (`#c62828`), ne světle růžová
- TasksPage: filter `.chip` pilulky mají viditelný border
- ProjectsPage → projekt detail: `.prio` badge u high priority úkolů je tmavě červená
- Tmavý mód: vše zůstalo stejné jako dříve (původní `#60a5fa`, `#f87171`)

- [ ] **Step 5: Commit**

```bash
git add src/components/atlas/AtlasTaskCard.jsx src/pages/ProjectsPage.jsx
git commit -m "feat: use theme-aware CSS vars for priority badge colors"
```
