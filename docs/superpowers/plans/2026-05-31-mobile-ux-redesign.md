# Mobile UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all mobile UX pain points — chips to single scrollable row, TaskDrawer full-screen, CommandPalette X button, Quick Todos snappier animation, larger tap targets.

**Architecture:** Pure UI changes across 5 files. No data model changes, no Supabase calls. Each task is self-contained and independently deployable.

**Tech Stack:** React 18, Vite 7, inline styles + CSS classes in `atlas-shell.css`. `isMobile` from `useApp()` context (already available in all modified components). Build: `npx vite build`.

---

## Files Modified

| File | What changes |
|---|---|
| `src/styles/atlas-shell.css` | `.chips` mobile override → scroll strip, fade edge |
| `src/components/TaskDrawer.jsx` | `top: "6vh"` → `top: 0` + safe-area padding |
| `src/components/CommandPalette.jsx` | X close button on mobile, `50vh` → `75vh`, hide `Esc` kbd |
| `src/pages/QuickTodosPage.jsx` | `localStorage` → `sessionStorage`, snapback `.5s` → `.25s`, vibrate |
| `src/pages/TasksPage.jsx` | Hide `ViewToggle` + item count chip on mobile |
| `src/layout/MobileNav.jsx` | Reminder items padding `6px` → `10px 8px` |

---

## Task 1: Chips → horizontal scroll strip on mobile

**Files:**
- Modify: `src/styles/atlas-shell.css` (around line 1987 — mobile `.chips` override)

**Context:** `.chips` has `flex-wrap: wrap` at line 841. The mobile override at line 1987 doesn't fix this so status chips wrap to 2–3 rows. We need `flex-wrap: nowrap; overflow-x: auto` with a right-side fade.

- [ ] **Step 1: Replace the mobile `.chips` override**

Find this block (around line 1987):
```css
  .chips {
    border-radius: var(--r) !important;
    padding: 10px 12px !important;
    gap: 8px 6px !important;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-left: -14px;
    margin-right: -14px;
    padding-left: 14px !important;
    padding-right: 14px !important;
    border-bottom: 1px solid var(--border-soft);
  }
```

Replace with:
```css
  .chips {
    border-radius: 0 !important;
    padding: 0 !important;
    gap: 0 !important;
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    margin-left: -14px;
    margin-right: -14px;
    border-bottom: 1px solid var(--border-soft);
    border: none !important;
    /* scroll strip */
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    padding: 8px 14px 8px !important;
    gap: 6px !important;
  }
  .chips::-webkit-scrollbar { display: none; }
  /* hide separators — they break single-row layout */
  .chips .chips-sep,
  .chips .chips-div { display: none !important; }
  /* item count chip — hidden on mobile */
  .chips .chip-count-only { display: none !important; }
```

- [ ] **Step 2: Build and verify no CSS errors**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks"
npx vite build 2>&1 | grep -E "error|✓|built"
```
Expected: `✓ built in ...` with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles/atlas-shell.css
git commit -m "style(mobile): chips → single-row horizontal scroll strip"
```

---

## Task 2: TasksPage — hide ViewToggle and item count on mobile

**Files:**
- Modify: `src/pages/TasksPage.jsx`

**Context:** `ViewToggle` at line 246 and item count chip `{filtered.length} položek` at line 301 are visible on mobile. `isMobile` is already destructured from `useApp()` at line 103.

- [ ] **Step 1: Hide ViewToggle on mobile**

Find (around line 245–247):
```jsx
        <ViewToggle view={view} setView={setView} />
      </div>
```

Replace with:
```jsx
        {!isMobile && <ViewToggle view={view} setView={setView} />}
      </div>
```

- [ ] **Step 2: Hide item count chip on mobile**

Find (around line 300–302):
```jsx
        <span className="chips-sep" />
        <span className="chip">{filtered.length} položek</span>
```

Replace with:
```jsx
        {!isMobile && <span className="chips-sep" />}
        {!isMobile && <span className="chip">{filtered.length} položek</span>}
```

- [ ] **Step 3: Build**

```bash
npx vite build 2>&1 | grep -E "error|✓|built"
```
Expected: `✓ built in ...`

- [ ] **Step 4: Commit**

```bash
git add src/pages/TasksPage.jsx
git commit -m "feat(mobile): hide ViewToggle and item count on tasks page"
```

---

## Task 3: TaskDrawer — full screen on mobile

**Files:**
- Modify: `src/components/TaskDrawer.jsx`

**Context:** The mobile drawer style is inline at line 380–391. `top: "6vh"` leaves a 6% gap at the top. We want true full-screen with safe-area padding for the iOS notch.

- [ ] **Step 1: Change `top` and add safe-area padding**

Find (around line 380–391):
```jsx
        style={isMobile ? {
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform .3s cubic-bezier(.4,0,.2,1)",
          borderRadius: "16px 16px 0 0",
          top: "6vh",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          maxWidth: "100%",
        } : undefined}
```

Replace with:
```jsx
        style={isMobile ? {
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform .3s cubic-bezier(.4,0,.2,1)",
          borderRadius: 0,
          top: 0,
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          maxWidth: "100%",
          paddingTop: "env(safe-area-inset-top, 0px)",
        } : undefined}
```

- [ ] **Step 2: Build**

```bash
npx vite build 2>&1 | grep -E "error|✓|built"
```

- [ ] **Step 3: Commit**

```bash
git add src/components/TaskDrawer.jsx
git commit -m "feat(mobile): TaskDrawer full screen with safe-area inset"
```

---

## Task 4: CommandPalette — X button + taller results + hide Esc kbd

**Files:**
- Modify: `src/components/CommandPalette.jsx`

**Context:** On mobile the palette opens as a bottom sheet. There's no X button — only a drag handle. The `Esc` kbd hint is desktop-only. Results are capped at `50vh`. The `onClose` prop closes the palette.

- [ ] **Step 1: Add X button next to the drag handle and hide Esc kbd on mobile**

Find (around line 217–239):
```jsx
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
          <Icon name="search" size={15} color={t.text3} strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Hledat úkoly, projekty, tagy, poznámky…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: t.text, fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}>
              <Icon name="x" size={13} color={t.text3} strokeWidth={2} />
            </button>
          )}
          <kbd style={{ fontSize: 12, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>
        </div>
```

Replace with:
```jsx
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, paddingBottom: 2, paddingLeft: 16, paddingRight: 12 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, marginLeft: "auto", marginRight: "auto" }} />
            <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", display: "flex", alignItems: "center", padding: 4, position: "absolute", right: 12, top: 8 }}>
              <Icon name="x" size={18} color={t.text2} strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
          <Icon name="search" size={15} color={t.text3} strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Hledat úkoly, projekty, tagy, poznámky…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: t.text, fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}>
              <Icon name="x" size={13} color={t.text3} strokeWidth={2} />
            </button>
          )}
          {!isMobile && <kbd style={{ fontSize: 12, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>}
        </div>
```

- [ ] **Step 2: Increase results maxHeight on mobile from `50vh` to `75vh`**

Find (around line 286):
```jsx
        <div style={{ maxHeight: isMobile ? "50vh" : 340, overflowY: "auto", padding: "8px 0" }}>
```

Replace with:
```jsx
        <div style={{ maxHeight: isMobile ? "75vh" : 340, overflowY: "auto", padding: "8px 0" }}>
```

- [ ] **Step 3: Build**

```bash
npx vite build 2>&1 | grep -E "error|✓|built"
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CommandPalette.jsx
git commit -m "feat(mobile): CommandPalette X button, taller results, hide Esc hint"
```

---

## Task 5: Quick Todos — sessionStorage hint + faster snapback + vibrate

**Files:**
- Modify: `src/pages/QuickTodosPage.jsx`

**Context:** `SWIPE_HINT_KEY = "qt:swipe-hint-shown"` is checked in `localStorage` — once set it never shows again. Snapback transition is `.5s`. We want `sessionStorage` (resets each browser session) and `.25s` snapback. We also add `navigator.vibrate(30)` on successful archive.

- [ ] **Step 1: Switch localStorage → sessionStorage for swipe hint**

Find (around line 357):
```jsx
const SWIPE_HINT_KEY = "qt:swipe-hint-shown";
```
No change to this line.

Find inside the `useEffect` that shows the hint (around line 397–403):
```jsx
  useEffect(() => {
    if (!isMobile) return;
    if (localStorage.getItem(SWIPE_HINT_KEY)) return;
    if (active.length === 0) return;
    const t1 = setTimeout(() => setShowSwipeHint(true), 800);
    return () => clearTimeout(t1);
  }, [isMobile, active.length]);
```

Replace with:
```jsx
  useEffect(() => {
    if (!isMobile) return;
    if (sessionStorage.getItem(SWIPE_HINT_KEY)) return;
    if (active.length === 0) return;
    const t1 = setTimeout(() => setShowSwipeHint(true), 800);
    return () => clearTimeout(t1);
  }, [isMobile, active.length]);
```

- [ ] **Step 2: Switch localStorage → sessionStorage when marking hint as shown**

Find (around line 408–410):
```jsx
    const t3 = setTimeout(() => { setShowSwipeHint(false); localStorage.setItem(SWIPE_HINT_KEY, "1"); }, 1600);
```

Replace with:
```jsx
    const t3 = setTimeout(() => { setShowSwipeHint(false); sessionStorage.setItem(SWIPE_HINT_KEY, "1"); }, 1600);
```

- [ ] **Step 3: Add vibration on archive and speed up snapback**

Find `triggerArchive` (around line 35–38):
```jsx
  const triggerArchive = useCallback(() => {
    setExiting(true);
    setTimeout(() => onArchive(todo.id), 260);
  }, [onArchive, todo.id]);
```

Replace with:
```jsx
  const triggerArchive = useCallback(() => {
    navigator.vibrate?.(30);
    setExiting(true);
    setTimeout(() => onArchive(todo.id), 260);
  }, [onArchive, todo.id]);
```

Find the card transform style (around line 265–268):
```jsx
        style={isMobile ? {
          transform: exiting ? "translateX(-110%)" : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          transition: swiping ? "none" : "transform .5s cubic-bezier(.4,0,.2,1), opacity .22s",
          willChange: "transform",
        } : undefined}
```

Replace with:
```jsx
        style={isMobile ? {
          transform: exiting ? "translateX(-110%)" : `translateX(${offsetX + hintOffset}px)`,
          opacity: exiting ? 0 : 1,
          transition: swiping ? "none" : "transform .25s cubic-bezier(.4,0,.2,1), opacity .18s",
          willChange: "transform",
        } : undefined}
```

- [ ] **Step 4: Build**

```bash
npx vite build 2>&1 | grep -E "error|✓|built"
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/QuickTodosPage.jsx
git commit -m "feat(mobile): swipe hint sessionStorage, faster snapback, vibrate on archive"
```

---

## Task 6: MobileNav — larger tap targets on reminder items

**Files:**
- Modify: `src/layout/MobileNav.jsx`

**Context:** Reminder task buttons in the "Více" drawer have `padding: "6px 6px"` (around line 159) — too small for reliable tapping on mobile. iOS HIG recommends minimum 44px height.

- [ ] **Step 1: Increase padding**

Find (around line 157–161):
```jsx
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "6px 6px", borderRadius: 7, border: "none", background: "transparent",
                          cursor: "pointer", textAlign: "left",
                        }}
```

Replace with:
```jsx
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "10px 8px", borderRadius: 7, border: "none", background: "transparent",
                          cursor: "pointer", textAlign: "left",
                          minHeight: 44,
                        }}
```

- [ ] **Step 2: Build**

```bash
npx vite build 2>&1 | grep -E "error|✓|built"
```

- [ ] **Step 3: Commit**

```bash
git add src/layout/MobileNav.jsx
git commit -m "style(mobile): reminder items min-height 44px, larger tap target"
```

---

## Task 7: Final build + push

- [ ] **Step 1: Final clean build**

```bash
cd "/Users/michalzich/Desktop/Hero projekty/michal-tasks"
npx vite build 2>&1 | tail -10
```
Expected: no errors, `precache N entries`.

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review Checklist

- [x] Spec §1 chips scroll strip → Task 1 ✓
- [x] Spec §2 TaskDrawer full screen → Task 3 ✓
- [x] Spec §3 CommandPalette X button + height → Task 4 ✓
- [x] Spec §4 Quick Todos sessionStorage + snapback + vibrate → Task 5 ✓
- [x] Spec §5 MobileNav tap targets → Task 6 ✓
- [x] ViewToggle + item count hidden on mobile → Task 2 ✓
- [x] No TBD or placeholders found
- [x] `isMobile` used consistently — already in scope in all files
- [x] `onClose` prop name in CommandPalette confirmed from line 5
