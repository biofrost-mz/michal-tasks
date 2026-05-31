# Mobile UX Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Opravit kritické a major mobilní UX/accessibility problémy v projektech michal-tasks a michal-pocket/stash.

**Architecture:** Čistě CSS/JSX úpravy bez nových závislostí. Stash sidebar dostane mobile drawer přes React state. Tasks opravy jsou pouze CSS a jeden atribut v HTML.

**Tech Stack:** React (Tasks), Next.js 14 + Tailwind (Stash), custom CSS variables

---

## Soubory ke změně

### michal-tasks
- Modify: `index.html:5` — odstranit `user-scalable=no`
- Modify: `src/styles/atlas-shell.css:1093-1099` — `.icon-btn` min touch target v mobile sekci
- Modify: `src/styles/atlas-shell.css:2148-2160` — zvýšit nejmenší font-size na mobilu

### michal-pocket/stash
- Modify: `src/components/Sidebar.tsx:69` — `hidden md:flex` + drawer overlay na mobilu
- Modify: `src/app/page.tsx:79-91` — sidebar state + hamburger toggle
- Modify: `src/components/library/LibraryToolbar.tsx:35,74` — hamburger button + min-w fix
- Modify: `src/components/ItemTable.tsx:53-60` — checkbox touch target (44px label)
- Modify: `src/components/SearchBar.tsx:51` — `text-sm` → `text-base md:text-sm`
- Modify: `src/components/ui/button.tsx:26` — icon size `h-10 w-10` → `h-11 w-11`
- Modify: `src/components/Sidebar.tsx:28-33` — nav items `min-h-[44px]`

---

## Task 1: Tasks — Odstranit user-scalable=no

**Files:**
- Modify: `index.html:5`

- [ ] Změnit viewport meta tag — odstranit `maximum-scale=1.0, user-scalable=no`

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

- [ ] Ověřit: otevřít v DevTools mobile emulaci, zkusit pinch-to-zoom — musí fungovat

---

## Task 2: Tasks — Icon buttons 44px na mobilu

**Files:**
- Modify: `src/styles/atlas-shell.css` — přidat do `@media (max-width: 767px)` sekce

- [ ] Přidat do existující mobile media query (konec sekce, před `}` na řádku 2347):

```css
  /* === Icon buttons — min 44px touch target === */
  .icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
  }
```

---

## Task 3: Tasks — Font sizes na mobilu (nejmenší hodnoty)

**Files:**
- Modify: `src/styles/atlas-shell.css` — sekce `.hl-stat-l`, `.hl-stat-u`, `.hl-mob-strip`

- [ ] V mobile media query opravit nejmenší font sizes (8px → 10px):

Najít a nahradit v bloku `.hl-stat-l` (kolem řádku 2148):
```css
  .hl-stat-l {
    font-size: 10px;   /* bylo 8px */
```

Najít a nahradit v bloku `.hl-stat-u` (kolem řádku 2155):
```css
  .hl-stat-u {
    font-size: 10px;   /* bylo 8.5px */
```

---

## Task 4: Stash — SearchBar font size (iOS zoom prevention)

**Files:**
- Modify: `src/components/SearchBar.tsx:51`

- [ ] Změnit `text-sm` na `text-base md:text-sm` na Input className:

```tsx
className="h-10 rounded-xl border-[color:var(--border-soft)] bg-card/70 pl-9 pr-10 text-base md:text-sm shadow-[...]"
```

---

## Task 5: Stash — Checkbox touch target

**Files:**
- Modify: `src/components/ItemTable.tsx:53-60`

- [ ] Obalit checkbox do 44px touch area:

```tsx
<th className="px-3 py-2.5 w-10">
  <label className="flex h-11 w-11 items-center justify-center cursor-pointer -mx-0.5">
    <input
      type="checkbox"
      checked={allSelected}
      onChange={onToggleSelectAll}
      className="h-4 w-4 accent-[var(--primary)]"
      aria-label="Vybrat všechny zobrazené položky"
    />
  </label>
</th>
```

---

## Task 6: Stash — Button icon size

**Files:**
- Modify: `src/components/ui/button.tsx:26`

- [ ] Zvýšit icon size na 44px:

```ts
icon: "h-11 w-11",
```

---

## Task 7: Stash — Sidebar nav item min-height

**Files:**
- Modify: `src/components/Sidebar.tsx:28-33`

- [ ] Přidat `min-h-[44px]` do `navItemClasses`:

```tsx
function navItemClasses(active: boolean) {
  return cn(
    "group relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-all duration-200 min-h-[44px]",
    active
      ? "bg-primary/10 font-medium text-primary shadow-[inset_2px_0_0_var(--primary)]"
      : "text-muted-foreground hover:bg-[var(--surface-elevated)] hover:text-foreground"
  )
}
```

---

## Task 8: Stash — Sidebar mobile drawer + hamburger

**Files:**
- Modify: `src/components/Sidebar.tsx` — přidat `open` + `onClose` props, drawer wrapper
- Modify: `src/app/page.tsx` — přidat `sidebarOpen` state
- Modify: `src/components/library/LibraryToolbar.tsx` — hamburger button + `onOpenSidebar` prop

### 8a: Sidebar.tsx — přidat drawer support

- [ ] Přidat `open` a `onClose` do Props:

```tsx
type Props = {
  sections: LibrarySection[]
  tags: LibraryTag[]
  activeSectionId: string | null
  activeTag: string | null
  onSectionClick: (id: string | null) => void
  onTagClick: (tag: string | null) => void
  open?: boolean
  onClose?: () => void
}
```

- [ ] Změnit `<aside>` na mobilní drawer:

```tsx
return (
  <>
    {/* Backdrop */}
    {open && (
      <div
        className="fixed inset-0 z-40 bg-black/50 md:hidden"
        onClick={onClose}
      />
    )}
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col overflow-y-auto border-r border-[color:var(--border-soft)] bg-[var(--sidebar-surface)] backdrop-blur transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Close button — jen na mobilu */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[var(--surface-elevated)] md:hidden"
        aria-label="Zavřít menu"
      >
        ✕
      </button>
      {/* zbytek obsahu beze změny */}
```

### 8b: page.tsx — sidebarOpen state

- [ ] Přidat `sidebarOpen` state a předat do Sidebar a LibraryToolbar:

```tsx
const [sidebarOpen, setSidebarOpen] = useState(false)
```

Pak předat do `<Sidebar>`:
```tsx
<Sidebar
  ...
  open={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
/>
```

### 8c: LibraryToolbar — hamburger button + min-w fix

- [ ] Přidat `onOpenSidebar` prop a hamburger do headeru:

```tsx
type LibraryToolbarProps = {
  ...
  onOpenSidebar: () => void
}
```

- [ ] Do headeru přidat hamburger (jen na mobilu, před SearchBar):

```tsx
<header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-[color:var(--border-soft)] bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
  <button
    onClick={onOpenSidebar}
    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--border-soft)] bg-card/65 text-muted-foreground md:hidden"
    aria-label="Otevřít menu"
  >
    ☰
  </button>
  <div className="min-w-0 max-w-2xl flex-1 transition-[max-width] duration-200 focus-within:max-w-3xl sm:min-w-[200px]">
    ...
  </div>
```

- [ ] V `page.tsx` předat prop do `<LibraryToolbar onOpenSidebar={() => setSidebarOpen(true)} ...>`

---

## Pořadí implementace

1. Task 1 (index.html) — 1 min
2. Task 2–3 (CSS) — 5 min
3. Task 4–7 (Stash quick) — 10 min
4. Task 8 (Sidebar drawer) — 20 min
