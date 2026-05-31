# Mobile UX Redesign — Zentero

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Fix all mobile UX pain points across Tasks, Projects, Quick Todos, CommandPalette and TaskDrawer so the app feels native on phone.

**Approved by user 2026-05-31.**

---

## Scope of changes

### 1. Filter chips — horizontal scroll strip (all pages with `.chips`)

**Files:** `src/styles/atlas-shell.css`

On mobile (≤767px), override `.chips`:
- `overflow-x: auto; flex-wrap: nowrap; -webkit-overflow-scrolling: touch; scrollbar-width: none`
- Hide `::-webkit-scrollbar` inside `.chips`
- Add fade-out gradient on right edge via `::after` pseudo-element (pointer-events: none)
- Remove `chips-sep` spacing effect on mobile (`flex: 0` or `display: none`)
- `.chips-div` (vertical separator): hide on mobile

**Files:** `src/pages/TasksPage.jsx`
- Hide item count chip `{filtered.length} položek` on mobile (wrap in `{!isMobile && ...}`)
- Hide `ViewToggle` component on mobile (wrap in `{!isMobile && ...}`)

**Files:** `src/pages/ProjectsPage.jsx`
- "Archiv" tab: keep, already in chips

---

### 2. TaskDrawer — truly full screen on mobile

**File:** `src/components/TaskDrawer.jsx`

Change mobile inline style:
- `top: 0` (was `"6vh"`)  
- Add `paddingTop: "env(safe-area-inset-top, 44px)"` to the inner `.detail` container on mobile
- Keep drag handle + X button

---

### 3. CommandPalette — X button + taller on mobile

**File:** `src/components/CommandPalette.jsx`

- Add X close button next to the drag handle on mobile (top-right area)
- Increase `maxHeight` for results from `50vh` to `75vh` on mobile
- Ensure search input is `autoFocus`

---

### 4. Quick Todos swipe hint — sessionStorage + faster snapback

**File:** `src/pages/QuickTodosPage.jsx`

- Change `localStorage` → `sessionStorage` for `SWIPE_HINT_KEY` (shows once per session, not forever)
- Shorten snapback transition from `0.5s` to `0.25s`
- Add `navigator.vibrate?.(30)` on successful archive (`triggerArchive`)

---

### 5. MobileNav reminder items — larger tap target

**File:** `src/layout/MobileNav.jsx`

- Increase padding on reminder task items from `"6px 6px"` to `"10px 8px"`

---

## What is NOT changing

- Navigation structure (bottom tabs)
- Desktop layout
- Filter logic / data
- Any Supabase / backend code
