# Estetika Finish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Dotáhnout chybějící Estetika položky — opravit light-mode priority badge barvy, zvýšit viditelnost soft pozadí, přidat border filter chipům a theme-aware prio CSS proměnné.

**Scope:** Čistě vizuální změny — žádná nová logika, žádné nové komponenty.

---

## Problémy a řešení

### 1. Priority badge barvy — hardcoded dark-mode hex

**Problém:** `PRIORITY_META` v `AtlasTaskCard.jsx` a inline styl v `ProjectsPage.jsx` používají `#60a5fa`, `#fbbf24`, `#f87171` — barvy optimalizované pro tmavé pozadí. V light módu jsou vybledlé.

**Řešení:** Přidat CSS proměnné `--prio-low`, `--prio-med`, `--prio-high` do `:root` (dark hodnoty) a přepsat v `:root.light`. `AtlasTaskCard.jsx` a `ProjectsPage.jsx` budou používat tyto vars.

Dark:
- `--prio-low: #60a5fa`
- `--prio-med: #fbbf24`
- `--prio-high: #f87171`

Light:
- `--prio-low: #1565c0`
- `--prio-med: #b45309`
- `--prio-high: #c62828`

### 2. Soft badge pozadí — příliš průhledné v light módu

**Problém:** `--red-soft`, `--orange-soft`, `--blue-soft`, `--green-soft`, `--accent-soft` mají v `:root.light` opacitu 0.08. Na bílém podkladu jsou téměř neviditelné.

**Řešení:** Zvýšit na 0.12 v `:root.light`:
- `--red-soft: rgba(211, 47, 47, 0.12)`
- `--orange-soft: rgba(202, 138, 4, 0.12)`
- `--blue-soft: rgba(21, 101, 192, 0.12)`
- `--green-soft: rgba(46, 125, 50, 0.12)`
- `--accent-soft: rgba(197, 138, 54, 0.12)`

### 3. Filter chipy — slabý kontrast v light módu

**Problém:** `.chip` má `background: var(--surface-2)` = `#eceef4` na page bg `#f5f6fa`. Kontrast je 1.08:1 — chipy jsou téměř neviditelné.

**Řešení:** V `:root.light` přidat pravidlo `.chip { border-color: var(--border); }`. Existující `.chip` style má `border: 1px solid transparent` — stačí přepsat barvu.

### 4. `.prio` badge background — mírně slabší v light módu

**Problém:** `.prio` background je `color-mix(in srgb, var(--prio-color) 14%, transparent)`. S novými light-mode barvami funguje lépe, ale na bílém kartě stále mírně bledý.

**Řešení:** Přidat jako samostatné pravidlo mimo `:root.light { }` blok:
```css
:root.light .prio {
  background: color-mix(in srgb, var(--prio-color) 18%, transparent);
}
```

---

## Soubory ke změně

- **Modify:** `src/styles/atlas-shell.css`
  - `:root` — přidat `--prio-low`, `--prio-med`, `--prio-high`
  - `:root.light` — přepsat prio vars (dark→light barvy), zvýšit soft opacity na 0.12, přidat `.chip { border-color: var(--border); }`, přidat `.light .prio` override

- **Modify:** `src/components/atlas/AtlasTaskCard.jsx`
  - `PRIORITY_META`: nahradit hardcoded hex za `var(--prio-low)`, `var(--prio-med)`, `var(--prio-high)`

- **Modify:** `src/pages/ProjectsPage.jsx`
  - 2× inline `style={{ "--prio-color": "#f87171" }}` → `style={{ "--prio-color": "var(--prio-high)" }}`

---

## Co se NEřeší

- Shadows — aktuální hodnoty jsou záměrně jemné, uživatel je s nimi spokojený
- Nové komponenty — pouze úpravy stávajících CSS a JSX
- Dark mód — ten funguje správně, změny jsou izolované na light mód
