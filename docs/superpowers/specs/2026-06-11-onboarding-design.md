# Onboarding Design — Zentero

**Date:** 2026-06-11  
**Status:** Approved

---

## Overview

First-time user onboarding for Zentero consisting of two parts:
1. **Modal Wizard** — 3-step fullscreen overlay shown once after first login
2. **Getting Started Card** — persistent dashboard card with a checklist that disappears after completion

---

## Trigger & State

- **Detection:** `localStorage` key `mt3:onboarding_done` (value `"1"`)
- **Shown when:** key is absent or falsy, user is authenticated and app is `loaded`
- **Dismissed when:** user completes step 3 or explicitly closes the wizard
- **Getting started card state:** `localStorage` key `mt3:getting_started` — JSON object `{ addedTask: bool, triedAI: bool }`. Steps 1 and 2 (account created, notifications set) are auto-marked done after wizard completes.

No SQL migration required. If cross-device persistence is needed in future, flag can be moved to `user_profiles.onboarding_completed` boolean column.

---

## Wizard — 3 Steps

### Step 1: Workspace & Theme

- **Heading:** "Vítej v Zentero! 👋"
- **Subtitle:** "Nastavme appku za 2 minuty — začneme s tvým pracovním prostorem."
- **Fields:**
  - Text input: Workspace name (pre-filled "Osobní", editable)
  - Theme toggle: Tmavý 🌙 / Světlý ☀️ (pre-selected based on OS preference via `prefers-color-scheme`)
- **On Continue:**
  - If name changed → call `renameWorkspace(name)` from AppContext
  - Apply theme via existing `setDk()` from AppContext
- **Skip:** allowed (keeps defaults)

### Step 2: Notifications

- **Heading:** "Upozornění 🔔"
- **Subtitle:** "Chceš vědět o termínech a denním souhrnu? Kdykoli to změníš v nastavení."
- **Toggles (all on by default):**
  - Push notifikace — připomenutí úkolů v prohlížeči
  - E-mail: připomenutí úkolů — blížící se termíny e-mailem
  - E-mail: denní souhrn — každé ráno plán dne
- **On Continue:**
  - Upsert into `notification_preferences` table (same logic as WorkspaceSettingsPage)
- **Skip:** allowed (leaves defaults)

### Step 3: Done

- **Icon:** 🚀
- **Heading:** "Vše připraveno!"
- **Body:** "Workspace [name] je nastaven. Na dashboardu najdeš průvodce prvními kroky."
- **CTA:** "Vstoupit do Zentero" button
- **On click:** set `mt3:onboarding_done = "1"` in localStorage, close wizard

---

## Getting Started Card

Rendered at the **top of DashboardPage**, above other content. Visible until all 4 items are checked OR user dismisses with ✕.

### Items

| # | Text | Auto-complete trigger |
|---|------|-----------------------|
| 1 | Vytvořit účet a nastavit workspace | Auto-done after wizard step 1 |
| 2 | Přizpůsobit notifikace | Auto-done after wizard step 2 |
| 3 | Přidat první úkol | `tasks.length > 0` (watched via AppContext) |
| 4 | Vyzkoušet AI asistenta | `localStorage` key `mt3:ai_tried` set to `"1"` when user submits AI Quick Add |

### Behaviour

- Progress bar shows X/4 completed
- Each item with an action link navigates user to relevant part of the app (item 3 → focus QuickAdd input; item 4 → open AI Quick Add)
- After all 4 items done: card auto-hides with a brief "🎉 Hotovo!" flash, then removes itself
- Manual dismiss: ✕ button in top-right corner, sets `mt3:getting_started_dismissed = "1"` in localStorage

---

## Architecture

### New files

- `src/components/OnboardingWizard.jsx` — the modal overlay wizard, self-contained, reads/writes localStorage
- `src/components/GettingStartedCard.jsx` — dashboard card component, reads AppContext + localStorage

### Modified files

- `src/App.jsx` — render `<OnboardingWizard />` inside `AppProvider` after `<AuthGate>`, only when `loaded && !onboardingDone`
- `src/pages/DashboardPage.jsx` — render `<GettingStartedCard />` at top when card is not dismissed
- `src/services/aiService.js` (or QuickAdd.jsx) — set `mt3:ai_tried = "1"` on first AI submission

### Styling

- Wizard: dark glass style matching AuthGate (dark overlay `rgba(0,0,0,0.7)`, amber accent `#fbbf24`)
- Card: uses existing CSS variables (`--surface`, `--accent`, `--text`, `--border-soft`)
- Progress bar: amber gradient `linear-gradient(90deg, #fbbf24, #d97706)`

---

## Error Handling

- If `renameWorkspace` fails → show toast, don't block wizard progression
- If notification_preferences upsert fails → show toast, don't block wizard progression
- Wizard is always closeable (Escape key + ✕ button in top-right)

---

## Out of Scope

- Avatar/profile photo upload
- Workspace logo
- Invite team members during onboarding
- Cross-device sync of onboarding state (localStorage only)
