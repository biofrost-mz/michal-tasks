# Token Migration (`t.xxx` → CSS proměnné) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Odstranit `t` theme objekt z 16 souborů — nahradit všechny `t.xxx` inline CSS hodnotami CSS proměnných dle mapping tabulky v specs.

**Architecture:** Přímá nahrada tokenu tokenem, soubor po souboru. Pomocné funkce přijímající `t` jako parametr se refaktorují interně. `t` se odstraní z `useApp()` destructuringu po každém souboru.

**Tech Stack:** React, CSS variables (atlas-shell.css + tokens.css), ESLint

**Mapping (quick ref):**
- `t.bg` → `var(--bg)` | `t.bg2` → `var(--bg-2)` | `t.card` → `var(--surface)` | `t.cardH` → `var(--surface-h)`
- `t.input` → `var(--input)` | `t.text` → `var(--text)` | `t.text2` → `var(--text-2)` | `t.text3` → `var(--text-3)`
- `t.accent` → `var(--accent)` | `t.accentBg` → `var(--accent-soft)` | `t.accentGlow` → `var(--accent-glow)`
- `t.border` → `var(--border)` | `t.borderH` → `var(--border-h)` | `t.shadow` → `var(--shadow-sm)`
- `t.kanban` → `var(--kanban)` | `t.toast` → `var(--toast-bg)`
- Template literals: `` `1px solid ${t.border}` `` → `"1px solid var(--border)"`
- Dynamic styles: `e.currentTarget.style.color = t.text3` → `e.currentTarget.style.color = "var(--text-3)"`

---

### Task 1: Skeleton.jsx (2 usages)

**Files:** Modify `src/components/Skeleton.jsx`

- [ ] Nahradit `t.border` → `"1px solid var(--border)"`, `t.card` → `"var(--surface)"`
- [ ] Odstranit `t` z destructuringu (řádek 21: `const { t } = useApp()`)
- [ ] `npm run lint` — 0 chyb

### Task 2: Confirm.jsx (5 usages)

**Files:** Modify `src/components/Confirm.jsx`

- [ ] `t.bg2` → `"var(--bg-2)"`, `t.border` (×2) → `"var(--border)"`, `t.text` → `"var(--text)"`, `t.text2` → `"var(--text-2)"`
- [ ] Template literal `` `1px solid ${t.border}` `` (×2) → `"1px solid var(--border)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 3: SnoozeSheet.jsx (6 usages)

**Files:** Modify `src/components/SnoozeSheet.jsx`

- [ ] `t.bg2` (×2) → `"var(--bg-2)"`, `t.border` (×2) → `"var(--border)"`, `t.card` → `"var(--surface)"`, `t.text` → `"var(--text)"`, `t.text2` → `"var(--text-2)"`
- [ ] Template literals opravit na string CSS vars
- [ ] Odstranit `t` z destructuringu, ponechat `updateTask`
- [ ] Lint

### Task 4: NotesMiniList.jsx (6 usages)

**Files:** Modify `src/components/NotesMiniList.jsx`

- [ ] `t.text3` (statické) → `"var(--text-3)"`, `t.accent` → `"var(--accent)"`
- [ ] Dynamické: `e.currentTarget.style.color = t.text3` → `e.currentTarget.style.color = "var(--text-3)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 5: AttachmentsMiniList.jsx (10 usages)

**Files:** Modify `src/components/AttachmentsMiniList.jsx`

- [ ] `t.text2` → `"var(--text-2)"`, `t.text3` (×4) → `"var(--text-3)"`, `t.text` (×2) → `"var(--text)"`
- [ ] Podmíněné: `dragOver ? "var(--accent)" : t.text2` → `dragOver ? "var(--accent)" : "var(--text-2)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 6: QuickTodosPage.jsx (12 usages)

**Files:** Modify `src/pages/QuickTodosPage.jsx`

- [ ] `t.text3` (×8) → `"var(--text-3)"`, `t.bg2` → `"var(--bg-2)"`, `t.card` (×2) → `"var(--surface)"`, `t.border` → `"var(--border)"`
- [ ] Skeleton kód (řádek 729-731): `"--sk-base": t.bg2 || "..."` → `"--sk-base": "var(--bg-2)"`, `"--sk-hl": t.card || "..."` → `"--sk-hl": "var(--surface)"`, template literal border
- [ ] Odstranit `t` z destructuringu (ponechat `isMobile, quickTodos, ...`)
- [ ] Lint

### Task 7: TaskContextSheet.jsx (17 usages)

**Files:** Modify `src/components/TaskContextSheet.jsx`

- [ ] Refaktorovat `rowStyle(t)` → `rowStyle()`: uvnitř nahradit `t.border` → `"var(--border)"`, `t.card` → `"var(--surface)"`; opravit všechna volání `rowStyle(t)` → `rowStyle()`
- [ ] Refaktorovat `iconBox(t, color)` → `iconBox(color)`: `t` uvnitř nepoužito; opravit všechna volání `iconBox(t, ...)` → `iconBox(...)`
- [ ] Přímé t.xxx: `t.bg2` (×2) → `"var(--bg-2)"`, `t.border` (×3) → `"var(--border)"`, `t.text3` (×4) → `"var(--text-3)"`, `t.text2` → `"var(--text-2)"`, `t.text` → `"var(--text)"`, `t.accent` (×2) → `"var(--accent)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 8: AIDailyPlan.jsx (19 usages)

**Files:** Modify `src/components/AIDailyPlan.jsx`

- [ ] `PlanSkeleton({ t })` → `PlanSkeleton()`: uvnitř nahradit `t.border` → `"var(--border)"`, `t.borderH` → `"var(--border-h)"`; template literal → string
- [ ] Volání `<PlanSkeleton t={t} />` → `<PlanSkeleton />`
- [ ] Přímé: `t.border` (×3) → `"var(--border)"`, `t.card` → `"var(--surface)"`, `t.text` (×2) → `"var(--text)"`, `t.text3` (×5) → `"var(--text-3)"`, `t.text2` → `"var(--text-2)"`, `t.input` (×2) → `"var(--input)"`
- [ ] Podmíněné výrazy: `activeTasks.length > 0 ? ... : t.input` → `"var(--input)"`, `t.text3` v podmínkách → `"var(--text-3)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 9: NotificationBell.jsx (21 usages)

**Files:** Modify `src/components/NotificationBell.jsx`

- [ ] `ReminderSection({ ..., theme, ... })` → odstranit `theme` prop; nahradit `theme.text3` → `"var(--text-3)"`, `theme.input` → `"var(--input)"`, `theme.card` → `"var(--surface)"`, `theme.border` → `"var(--border)"`, `theme.text` → `"var(--text)"`
- [ ] Všechna volání `<ReminderSection ... theme={t} />` → odstranit `theme={t}`
- [ ] Přímé v default variantě: `t.bg2` → `"var(--bg-2)"`, `t.border` (×4) → `"var(--border)"`, `t.shadow` → `"var(--shadow-sm)"`, `t.text` → `"var(--text)"`, `t.text2` (×3) → `"var(--text-2)"`, `t.text3` (×4) → `"var(--text-3)"`, `t.accent` (×2) → `"var(--accent)"`, `t.accentBg` → `"var(--accent-soft)"`, `t.input` (×2) → `"var(--input)"`
- [ ] Podmíněné: `open ? t.accentBg : ...` → `open ? "var(--accent-soft)" : ...`
- [ ] Odstranit `t` z destructuringu (ponechat `tasks, projects, setTaskDetail`)
- [ ] Lint

### Task 10: ProjectChatPanel.jsx (25 usages)

**Files:** Modify `src/components/ProjectChatPanel.jsx`

- [ ] `t.bg` → `"var(--bg)"`, `t.bg2` (×2) → `"var(--bg-2)"`, `t.border` (×5) → `"var(--border)"`, `t.text` (×4) → `"var(--text)"`, `t.text2` (×2) → `"var(--text-2)"`, `t.text3` (×3) → `"var(--text-3)"`, `t.input` (×4) → `"var(--input)"`, `t.accent` (×3) → `"var(--accent)"`
- [ ] Template literals opravit
- [ ] Podmíněné: `m.role === "user" ? t.accent : t.input` → `m.role === "user" ? "var(--accent)" : "var(--input)"`, `input.trim() && !loading ? t.accent : t.border` → `"var(--accent)"` / `"var(--border)"`
- [ ] Odstranit `t` z destructuringu (ale pozor: `tasks` má místně `t` jako param v `.map((t) =>` — to NENahrazovat)
- [ ] Lint

### Task 11: AITaskAssist.jsx (26 usages)

**Files:** Modify `src/components/AITaskAssist.jsx`

- [ ] `AiNotice({ notice, t })` → `AiNotice({ notice })`: nahradit `t.text2` → `"var(--text-2)"`
- [ ] `ResultView({ action, result, t })` → `ResultView({ action, result })`: nahradit `t.text` (×4) → `"var(--text)"`, `t.text2` (×2) → `"var(--text-2)"`, `t.text3` (×3) → `"var(--text-3)"`, `t.accent` (×4) → `"var(--accent)"`, `t.accentBg` → `"var(--accent-soft)"`, `t.border` → `"var(--border)"`
- [ ] `OptimizeRow({ icon, label, children, t })` → `OptimizeRow({ icon, label, children })`: nahradit `t.border` → `"var(--border)"`, `t.text3` (×2) → `"var(--text-3)"`
- [ ] Volání `<AiNotice notice={notice} t={t} />` → `<AiNotice notice={notice} />`, `<ResultView ... t={t} />` → bez `t`, `<OptimizeRow ... t={t}>` → bez `t`
- [ ] Přímé v AITaskAssist: `t.text2` (×2) → `"var(--text-2)"`, `t.text3` → `"var(--text-3)"`
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 12: CommandPalette.jsx (39 usages)

**Files:** Modify `src/components/CommandPalette.jsx`

- [ ] `t.text3` (×12) → `"var(--text-3)"`, `t.border` (×10) → `"var(--border)"`, `t.text` (×3) → `"var(--text)"`, `t.text2` (×2) → `"var(--text-2)"`, `t.input` (×5) → `"var(--input)"`, `t.accent` (×3) → `"var(--accent)"`, `t.accentBg` (×2) → `"var(--accent-soft)"`
- [ ] projectChips: `color: t.text3` → `"var(--text-3)"`, `color: t.accent` → `"var(--accent)"`
- [ ] Template literals opravit
- [ ] Podmíněné výrazy (isActive): `isActive ? t.accentBg : "transparent"` → `isActive ? "var(--accent-soft)" : "transparent"`, `isActive ? t.accent : t.text2` → `isActive ? "var(--accent)" : "var(--text-2)"` atd.
- [ ] Odstranit `t` z destructuringu
- [ ] Lint

### Task 13: MobileNav.jsx (65 usages)

**Files:** Modify `src/layout/MobileNav.jsx`

- [ ] Systematicky nahradit všechny `t.xxx`: `t.bg2` (×4), `t.border` (×10), `t.text` (×5), `t.text2` (×8), `t.text3` (×8), `t.input` (×4), `t.accent` (×7), `t.accentBg` (×2), `t.card` (×5), `t.shadow` (×1)
- [ ] Podmíněné (ternary) výrazy — zachovat logiku, jen nahradit token
- [ ] Odstranit `t` z destructuringu (ponechat `dk, page, setPage, tasks, ...`)
- [ ] Lint

### Task 14: QuickAdd.jsx (99 usages)

**Files:** Modify `src/components/QuickAdd.jsx`

- [ ] Systematicky nahradit všechny `t.xxx`: `t.card` (×2), `t.border` (×15), `t.text` (×5), `t.text2` (×8), `t.text3` (×3), `t.input` (×8), `t.accent` (×8), `t.accentBg` (×4), `t.accentGlow` (×2) → `"var(--accent-glow)"`, `t.bg2` (×4)
- [ ] `t.red` (×1, řádek 912) → `"#ef4444"` (t.red není v theme.js — bug fix)
- [ ] `t.shadow` (řádek 298) → `"var(--shadow-sm)"`
- [ ] Podmíněné výrazy s `dk` ponechat (dk je bool, ne theme token)
- [ ] Odstranit `t` z destructuringu (ponechat `dk, addTask, projects, ...`)
- [ ] Lint

### Task 15: Sidebar.jsx (102 usages)

**Files:** Modify `src/layout/Sidebar.jsx`

- [ ] Systematicky nahradit všechny `t.xxx` dle mapping
- [ ] Pozor na `WorkspaceSwitcher` a `CalendarMini` subfunkce — mají vlastní `{ t }` z `useApp()` nebo přijímají jako prop
- [ ] Odstranit `t` z každého destructuringu kde je použit
- [ ] Lint

### Task 16: NotesPage.jsx (157 usages)

**Files:** Modify `src/pages/NotesPage.jsx`

- [ ] Systematicky nahradit všechny `t.xxx` dle mapping
- [ ] Subfunkce a subkomponenty uvnitř souboru: zkontrolovat kde je `t` destructurováno nebo přijímáno jako prop
- [ ] Lint

---

## Post-migration checks

- [ ] `grep -rn "const.*\bt\b.*useApp\|{ t }" src/ --include="*.jsx"` — výsledek prázdný
- [ ] `grep -rn "\bt={t}\b" src/ --include="*.jsx"` — výsledek prázdný
- [ ] Zvážit smazání `src/theme.js`
