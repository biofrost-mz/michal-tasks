# Dashboard UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve dashboard UX/UI — mobile hl-stats 2×3 grid, 6th "Dokončeno dnes" stat, icon-based overdue indicator, hide AI section on mobile, entrance animations with stagger, CSS-based hover effects, `useCountUp` counter animation, and fix broken Headline navigation.

**Architecture:** Three-part change: (1) new `useCountUp` hook for counter animation; (2) CSS additions to `atlas-shell.css` for keyframes, hover transitions, mobile grid, and desktop 6-column layout; (3) `DashboardPage.jsx` logic and JSX updates to wire everything together. No new components, no routing or context changes.

**Tech Stack:** React 18, CSS custom properties (`--i` for stagger, `--accent-soft`, `--accent-glow`), `requestAnimationFrame`, `prefers-reduced-motion` media query.

---

### Task 1: Create `useCountUp` hook

**Files:**
- Create: `src/hooks/useCountUp.js`

- [ ] **Step 1: Create the hook file**

```js
import { useState, useEffect, useRef } from "react";

export function useCountUp(target, duration = 600, enabled = true) {
  const [value, setValue] = useState(enabled ? 0 : target);
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    const startTime = performance.now();

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
}
```

- [ ] **Step 2: Verify file exists**

Run: `ls src/hooks/useCountUp.js`
Expected: file listed with no error

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useCountUp.js
git commit -m "feat: add useCountUp animation hook with easeOutCubic and reduced-motion support"
```

---

### Task 2: CSS — Keyframes, desktop hover effects, and visual polish

**Files:**
- Modify: `src/styles/atlas-shell.css`

All edits target desktop rules (before the `@media (max-width: 768px)` block).

- [ ] **Step 1: Add `fadeSlideUp` and `chipPop` keyframes**

After line 594 (`@keyframes pulseLive { ... }`), insert:

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes chipPop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.06); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 2: Add `.hl-live-dot-red` variant**

After the `@keyframes pulseLive` line (594), add beside the new keyframes:

```css
.hl-live-dot-red {
  display: inline-block;
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--red);
  box-shadow: 0 0 6px color-mix(in srgb, var(--red) 60%, transparent);
  animation: pulseLive 1.8s infinite;
  flex-shrink: 0;
}
```

- [ ] **Step 3: Add entrance animation to `.headline`**

Find `.headline` at line 502. Add `animation` property to the rule:

Old:
```css
.headline {
  padding: 28px 32px;
  background: linear-gradient(135deg, var(--surface) 0%, var(--bg-2) 60%, var(--surface) 100%);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 24px;
}
```

New:
```css
.headline {
  padding: 28px 32px;
  background: linear-gradient(135deg, var(--surface) 0%, var(--bg-2) 60%, var(--surface) 100%);
  border: 1px solid var(--border-soft);
  border-radius: var(--r-lg);
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 24px;
  animation: fadeSlideUp 0.3s cubic-bezier(.4,0,.2,1) both;
}
```

- [ ] **Step 4: Upgrade `.hl-stats` to 6 columns**

Find line 612–618:
```css
.hl-stats {
  display: grid; grid-template-columns: repeat(5, 1fr);
```

Change `repeat(5, 1fr)` to `repeat(6, 1fr)`.

- [ ] **Step 5: Add CSS hover + stagger animation to `.hl-stat`**

Find existing `.hl-stat` rule at line 619:
```css
.hl-stat { padding: 0 18px; border-right: 1px solid var(--border-soft); min-width: 0; }
```

Replace with:
```css
.hl-stat {
  padding: 0 18px;
  border-right: 1px solid var(--border-soft);
  min-width: 0;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1),
              box-shadow 0.2s cubic-bezier(.4,0,.2,1);
  animation: fadeSlideUp 0.3s cubic-bezier(.4,0,.2,1) both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
.hl-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--accent) 18%, transparent);
}
```

Keep existing `.hl-stat:first-child` and `.hl-stat:last-child` rules unchanged.

- [ ] **Step 6: Add `.work > *` entrance animation**

Find the `.work` rule block (around line 657). After the closing `}` of `.work`, add:

```css
.work > * {
  animation: fadeSlideUp 0.3s cubic-bezier(.4,0,.2,1) both;
  animation-delay: 150ms;
}
```

- [ ] **Step 7: Upgrade `.tcard` hover with transition and transform**

Find `.tcard` at line 875. Add `transition` to the rule:

Old ending of `.tcard {}`:
```css
.tcard {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r);
  padding: 14px 18px 14px 0;
  display: grid;
  grid-template-columns: 52px 1fr auto;
  align-items: start;
  gap: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
```

Add `transition` before the closing `}`:
```css
  transition: transform 0.18s cubic-bezier(.4,0,.2,1),
              border-color 0.18s,
              box-shadow 0.18s;
```

Find `.tcard:hover` at line 893:
```css
.tcard:hover { background: var(--surface-2); border-color: var(--border); }
```

Replace with:
```css
.tcard:hover {
  background: var(--surface-2);
  border-color: var(--border);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
}
```

Find `.tcard-state:hover` at line 927:
```css
.tcard-state:hover { transform: scale(1.1); }
```

Replace with:
```css
.tcard-state:hover { transform: scale(1.15); }
```

- [ ] **Step 8: Upgrade `.quickadd:focus-within` with box-shadow**

Find line 780:
```css
.quickadd:focus-within { border-color: var(--accent); background: var(--surface-2); border-style: solid; }
```

Replace with:
```css
.quickadd:focus-within {
  border-color: var(--accent);
  background: var(--surface-2);
  border-style: solid;
  box-shadow: 0 0 0 3px var(--accent-soft);
}
```

- [ ] **Step 9: Add `chipPop` animation to `.chip.active`**

Find `.chip.active` at line 819. Add `animation` property:

Old:
```css
.chip.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
}
```

New (add animation line):
```css
.chip.active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 30%, transparent);
  animation: chipPop 0.25s cubic-bezier(.4,0,.2,1);
}
```

- [ ] **Step 10: Add shine sweep to `.btn.primary`**

Find `.btn.primary` at line 1754:
```css
.btn.primary { background: var(--accent); color: var(--bg); border-color: var(--accent-2); font-weight: 500; box-shadow: 0 0 12px var(--accent-glow); }
```

Replace with:
```css
.btn.primary {
  background: var(--accent);
  color: var(--bg);
  border-color: var(--accent-2);
  font-weight: 500;
  box-shadow: 0 0 12px var(--accent-glow);
  position: relative;
  overflow: hidden;
}
.btn.primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%);
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(.4,0,.2,1);
}
.btn.primary:hover::after {
  transform: translateX(100%);
}
```

- [ ] **Step 11: Upgrade `.aisug-card` hover and add `.aisug-num-top`**

Find `.aisug-card` at line 733. Add `transition`:

Old:
```css
.aisug-card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r);
  padding: 14px 18px;
  cursor: pointer;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 14px;
  align-items: center;
}
```

New:
```css
.aisug-card {
  background: var(--surface);
  border: 1px solid var(--border-soft);
  border-radius: var(--r);
  padding: 14px 18px;
  cursor: pointer;
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 14px;
  align-items: center;
  transition: transform 0.2s cubic-bezier(.4,0,.2,1),
              box-shadow 0.2s,
              border-color 0.2s;
}
```

Find `.aisug-card:hover` at line 744:
```css
.aisug-card:hover { background: var(--surface-2); border-color: var(--border); }
```

Replace with:
```css
.aisug-card:hover {
  background: var(--surface-2);
  border-color: var(--border);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
}
```

After `.aisug-num` rule (line 753), add:
```css
.aisug-num-top {
  box-shadow: 0 0 12px var(--accent-glow);
}
```

- [ ] **Step 12: Verify build has no errors**

Run: `npm run build 2>&1 | tail -8`
Expected: build completes with no errors

- [ ] **Step 13: Commit**

```bash
git add src/styles/atlas-shell.css
git commit -m "style: entrance animations, CSS hover effects, tcard/quickadd/chip/btn polish"
```

---

### Task 3: CSS — Mobile overrides and `prefers-reduced-motion`

**Files:**
- Modify: `src/styles/atlas-shell.css` (changes inside `@media (max-width: 768px)` block)

- [ ] **Step 1: Reduce `.hl-num` font size to 36px**

Find in mobile block at line 1865:
```css
  .hl-num {
    font-size: 42px;
    line-height: 1;
  }
```

Replace `42px` with `36px`:
```css
  .hl-num {
    font-size: 36px;
    line-height: 1;
  }
```

- [ ] **Step 2: Add pill styling to `.hl-mob-strip span`**

Find in mobile block at line 1892:
```css
  .hl-mob-strip span { white-space: nowrap; }
```

Replace with:
```css
  .hl-mob-strip span {
    white-space: nowrap;
    background: var(--bg-2);
    border-radius: var(--r-pill);
    padding: 2px 8px;
  }
```

- [ ] **Step 3: Replace `.hl-stats` flex overflow with 2×3 grid**

Find in mobile block (lines 1894–1927) the `.hl-stats` and `.hl-stat` overrides:

```css
  .hl-stats {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 0;
    padding-top: 10px;
    scrollbar-width: none;
  }
  .hl-stats::-webkit-scrollbar { display: none; }
  .hl-stat {
    flex: 0 0 auto;
    min-width: 90px;
    padding: 0 14px 0 0;
    border-right: 1px dashed var(--border-soft);
    border-bottom: none;
  }
  .hl-stat:last-child {
    border-right: none;
    padding-right: 0;
  }
  .hl-stat:nth-child(even) {
    padding-left: 0;
  }
  .hl-stat-v {
    font-size: 26px;
    margin-top: 2px;
  }
  .hl-stat-l {
    font-size: 9px;
  }
  .hl-stat-u {
    font-size: 9.5px;
    margin-top: 1px;
  }
```

Replace entirely with:
```css
  .hl-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    padding-top: 10px;
    overflow-x: unset;
  }
  .hl-stats::-webkit-scrollbar { display: none; }
  .hl-stat {
    flex: unset;
    min-width: 0;
    padding: 10px 8px;
    border-right: 1px dashed var(--border-soft);
    border-bottom: 1px dashed var(--border-soft);
    animation: none;
  }
  .hl-stat:first-child { padding-left: 8px; }
  .hl-stat:last-child { padding-right: 8px; border-right: none; }
  .hl-stat:nth-child(3n) { border-right: none; }
  .hl-stat:nth-child(n+4) { border-bottom: none; }
  .hl-stat-v {
    font-size: 26px;
    margin-top: 2px;
  }
  .hl-stat-l {
    font-size: 9px;
  }
  .hl-stat-u {
    font-size: 9.5px;
    margin-top: 1px;
  }
```

- [ ] **Step 4: Hide `.aisug` on mobile**

In mobile block, after the existing `.aisug-card` overrides (around line 1963), add:
```css
  .aisug {
    display: none;
  }
```

- [ ] **Step 5: Upgrade `button.ai-hero` to pill/compact style**

In mobile block, after `.ai-hero` overrides (after line 1952), add:
```css
  button.ai-hero {
    grid-template-columns: 32px 1fr 20px;
    border-radius: var(--r-pill);
    padding: 10px 16px;
    gap: 12px;
    border-top: none;
    border: 1px solid var(--border-soft);
    text-align: left;
    justify-items: start;
  }
```

- [ ] **Step 6: Add `prefers-reduced-motion` block at end of file**

After all existing rules, at the very end of the file:
```css
@media (prefers-reduced-motion: reduce) {
  .headline,
  .hl-stat,
  .work > * {
    animation: none !important;
  }
}
```

- [ ] **Step 7: Verify build has no errors**

Run: `npm run build 2>&1 | tail -8`
Expected: build completes with no errors

- [ ] **Step 8: Commit**

```bash
git add src/styles/atlas-shell.css
git commit -m "style: mobile hl-stats 2x3 grid, ai-hero pill, hide aisug on mobile, prefers-reduced-motion"
```

---

### Task 4: DashboardPage — Logic, navigation fix, overdue icon, AI hiding

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Fix `Headline` navigation + add `doneTodayCount` prop**

Find line 136 (function signature) through the first lines of the body. The `Headline` component references `navigateToTasks` and `setPage` which are not in scope — this is a pre-existing bug. Fix by adding `useApp` call inside `Headline` and defining `navigateToTasks` locally.

Old signature and body start:
```jsx
function Headline({ overdueCount, activeCount, totalCount, doneWeek, doneWeekAvg, addedToday, activeProjectsCount, doneProjectsCount, totalProjectsCount, streak }) {
  const now = new Date();
```

New:
```jsx
function Headline({ overdueCount, activeCount, totalCount, doneWeek, doneWeekAvg, addedToday, activeProjectsCount, doneProjectsCount, totalProjectsCount, streak, doneTodayCount }) {
  const { setPage, setTasksPageFilter } = useApp();
  const navigateToTasks = (statusFilter) => {
    setTasksPageFilter(statusFilter);
    setPage("tasks");
  };

  const now = new Date();
```

- [ ] **Step 2: Replace overdue text with icon-based indicator**

Find (line ~278):
```jsx
          <div className="hl-stat-u" style={{ color: "var(--red)" }}>{overdueCount > 0 ? "⚠ vyřeš dnes" : "✓ vše ok"}</div>
```

Replace with:
```jsx
          <div className="hl-stat-u" style={{ display: "flex", alignItems: "center", gap: 4, color: overdueCount > 0 ? "var(--red)" : "var(--green)" }}>
            {overdueCount > 0 ? (
              <>
                <span className="hl-live-dot-red" />
                <Icon name="alert-triangle" size={11} color="var(--red)" strokeWidth={2} />
                <span>vyřeš dnes</span>
              </>
            ) : (
              <>
                <Icon name="check-circle" size={11} color="var(--green)" strokeWidth={2} />
                <span>vše ok</span>
              </>
            )}
          </div>
```

- [ ] **Step 3: Add 6th stat tile ("Dnes hotovo") inside `.hl-stats`**

Find the last `.hl-stat` div — the "Projekty" stat (lines 306–310):
```jsx
        <div className="hl-stat" onClick={() => setPage("projects")} style={{ cursor: "pointer" }} title="Přejít na projekty">
          <div className="hl-stat-l">Projekty</div>
          <div className="hl-stat-v" style={{ color: "var(--blue)" }}>{activeProjectsCount}</div>
          <div className="hl-stat-u">z {totalProjectsCount} · {doneProjectsCount} hotový</div>
        </div>
      </div>
    </div>
  );
}
```

Insert the 6th tile before the closing `</div>` of `.hl-stats`:
```jsx
        <div className="hl-stat" onClick={() => setPage("projects")} style={{ cursor: "pointer" }} title="Přejít na projekty">
          <div className="hl-stat-l">Projekty</div>
          <div className="hl-stat-v" style={{ color: "var(--blue)" }}>{activeProjectsCount}</div>
          <div className="hl-stat-u">z {totalProjectsCount} · {doneProjectsCount} hotový</div>
        </div>
        <div className="hl-stat" title="Úkoly dokončené dnes">
          <div className="hl-stat-l">Dnes hotovo</div>
          <div className="hl-stat-v" style={{ color: "var(--green)" }}>{doneTodayCount}</div>
          <div className="hl-stat-u">dnes{doneTodayCount > 0 ? " ↑" : ""}</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add `doneTodayCount` computation in `DashboardPage`**

Find line 499 (after `const addedToday`):
```js
  const addedToday = tasks.filter((t) => t.createdAt && t.createdAt >= todayStart).length;
```

Add immediately after:
```js
  const doneTodayCount = tasks.filter((t) => t.status === "done" && t.updatedAt >= todayStart).length;
```

- [ ] **Step 5: Pass `doneTodayCount` to `<Headline>`**

Find the `<Headline ... />` call (lines 740–751):
```jsx
      <Headline
        overdueCount={overdue.length}
        activeCount={activeTasks.length}
        totalCount={tasks.length}
        doneWeek={doneWeek}
        doneWeekAvg={doneWeekAvg}
        addedToday={addedToday}
        activeProjectsCount={activeProjects.length}
        doneProjectsCount={doneProjects.length}
        totalProjectsCount={projects.length}
        streak={streak}
      />
```

Replace with:
```jsx
      <Headline
        overdueCount={overdue.length}
        activeCount={activeTasks.length}
        totalCount={tasks.length}
        doneWeek={doneWeek}
        doneWeekAvg={doneWeekAvg}
        addedToday={addedToday}
        activeProjectsCount={activeProjects.length}
        doneProjectsCount={doneProjects.length}
        totalProjectsCount={projects.length}
        streak={streak}
        doneTodayCount={doneTodayCount}
      />
```

- [ ] **Step 6: Hide `AIDailyPlan` on mobile**

Find (line ~796):
```jsx
              {showDailyPlan && (
                <div className="fi" style={{ marginBottom: 18 }}>
                  <AIDailyPlan />
                </div>
              )}
```

Replace with:
```jsx
              {!isMobile && showDailyPlan && (
                <div className="fi" style={{ marginBottom: 18 }}>
                  <AIDailyPlan />
                </div>
              )}
```

- [ ] **Step 7: Add `.aisug-num-top` class to first suggestion**

Find (line ~804):
```jsx
                    <span className="aisug-num">{String(i + 1).padStart(2, "0")}</span>
```

Replace with:
```jsx
                    <span className={`aisug-num${i === 0 ? " aisug-num-top" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
```

- [ ] **Step 8: Verify build has no errors**

Run: `npm run build 2>&1 | tail -8`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: add doneTodayCount stat, overdue icon indicator, fix Headline navigation, hide AI plan on mobile"
```

---

### Task 5: DashboardPage — Counter animation, stagger, hover cleanup

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Import `useCountUp`**

Find line 1 (imports block). Add after the last import:
```js
import { useCountUp } from "../hooks/useCountUp.js";
```

- [ ] **Step 2: Add 6 `useCountUp` calls in `Headline`**

Find in `Headline` body — after the `navigateToTasks` definition and before `const now = new Date()`. Add the 6 hook calls there. These must be called unconditionally (hooks rules):

```js
  const activeCountAnim = useCountUp(activeCount);
  const overdueCountAnim = useCountUp(overdueCount);
  const doneWeekAnim = useCountUp(doneWeek);
  const streakCurrentAnim = useCountUp(streak.current);
  const activeProjectsCountAnim = useCountUp(activeProjectsCount);
  const doneTodayCountAnim = useCountUp(doneTodayCount);

  const now = new Date();
```

- [ ] **Step 3: Replace stat values in JSX with animated values**

In the 6 `.hl-stat-v` elements, replace the raw prop value with the animated one:

| Find | Replace |
|------|---------|
| `{activeCount}` (inside hl-stat-v) | `{activeCountAnim}` |
| `{overdueCount}` (inside hl-stat-v, has `style={{ color: "var(--red)" }}`) | `{overdueCountAnim}` |
| `{doneWeek}` (inside hl-stat-v) | `{doneWeekAnim}` |
| `{streak.current}` (inside hl-stat-v) | `{streakCurrentAnim}` |
| `{activeProjectsCount}` (inside hl-stat-v) | `{activeProjectsCountAnim}` |
| `{doneTodayCount}` (inside hl-stat-v only) | `{doneTodayCountAnim}` |

**Important:** `overdueCount` in the `.hl-stat-u` div (the icon condition check) stays as raw `overdueCount`. Only the big number value in `.hl-stat-v` gets the animated version.

- [ ] **Step 4: Add `--i` stagger and remove inline hover handlers**

Each `.hl-stat` div needs `style={{ "--i": N }}` (N = 0–5) and inline hover handlers must be removed.

**Aktivní** stat (first, line ~238). Replace:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Zobrazit úkoly"
        >
```
With:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{ "--i": 0 }}
          title="Zobrazit úkoly"
        >
```

**Po termínu** stat (second, line ~259). Replace:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Zobrazit úkoly po termínu"
        >
```
With:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{ "--i": 1 }}
          title="Zobrazit úkoly po termínu"
        >
```

**Hotovo·týden** stat (third, line ~280). Replace:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("done")}
          style={{
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.2s"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
          title="Zobrazit dokončené úkoly"
        >
```
With:
```jsx
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("done")}
          style={{ "--i": 2 }}
          title="Zobrazit dokončené úkoly"
        >
```

**Streak** stat (fourth, line ~301). Replace:
```jsx
        <div className="hl-stat">
```
With:
```jsx
        <div className="hl-stat" style={{ "--i": 3 }}>
```

**Projekty** stat (fifth, line ~306). Replace:
```jsx
        <div className="hl-stat" onClick={() => setPage("projects")} style={{ cursor: "pointer" }} title="Přejít na projekty">
```
With:
```jsx
        <div className="hl-stat" onClick={() => setPage("projects")} style={{ "--i": 4 }} title="Přejít na projekty">
```

**Dnes hotovo** stat (sixth, added in Task 4). Change from:
```jsx
        <div className="hl-stat" title="Úkoly dokončené dnes">
```
To:
```jsx
        <div className="hl-stat" style={{ "--i": 5 }} title="Úkoly dokončené dnes">
```

- [ ] **Step 5: Verify build has no errors**

Run: `npm run build 2>&1 | tail -8`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: useCountUp counter animations and stagger in dashboard stats, remove inline hover JS"
```

---

## Summary of changed files

| File | Changes |
|------|---------|
| `src/hooks/useCountUp.js` | New hook — easeOutCubic counter animation, respects prefers-reduced-motion |
| `src/styles/atlas-shell.css` | New keyframes, entrance animations, CSS hover effects, mobile 2×3 grid, ai-hero pill, reduced-motion block |
| `src/pages/DashboardPage.jsx` | doneTodayCount stat, overdue icon, Headline navigation fix, useCountUp integration, stagger --i, inline hover removal |
