# Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-step modal onboarding wizard (workspace rename, notifications, done) shown once to new users, plus a "First Steps" getting-started card on the dashboard.

**Architecture:** Two new self-contained components (`OnboardingWizard`, `GettingStartedCard`) wired into `AppShell` and `DashboardPage`. State stored in `localStorage` — no SQL migration needed. Wizard calls existing `renameWorkspace` + `setDk` from AppContext and upserts `notification_preferences` directly.

**Tech Stack:** React 19, Supabase JS client, localStorage, CSS variables (`--surface`, `--accent`, `--border-soft`, etc.)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| **Create** | `src/components/OnboardingWizard.jsx` | 3-step modal overlay — workspace/theme, notifications, done |
| **Create** | `src/components/GettingStartedCard.jsx` | Dashboard checklist card — 4 items, progress bar, dismissible |
| **Modify** | `src/App.jsx` | Import + render `<OnboardingWizard />` when `loaded && !onboardingDone` |
| **Modify** | `src/pages/DashboardPage.jsx` | Import + render `<GettingStartedCard />` at top of main column |
| **Modify** | `src/components/QuickAdd.jsx` | Set `mt3:ai_tried` flag after first successful AI draft |

---

## Task 1: GettingStartedCard component

**Files:**
- Create: `src/components/GettingStartedCard.jsx`

- [ ] **Step 1.1: Create the file**

```jsx
// src/components/GettingStartedCard.jsx
import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "./Icon.jsx";

const LS_DISMISSED = "mt3:getting_started_dismissed";
const LS_AI_TRIED  = "mt3:ai_tried";
const LS_ONBOARDING = "mt3:onboarding_done";

export default function GettingStartedCard() {
  const { tasks, setPage } = useApp();
  const [dismissed, setDismissed] = useState(
    () => Boolean(localStorage.getItem(LS_DISMISSED))
  );
  const [aiTried, setAiTried] = useState(
    () => Boolean(localStorage.getItem(LS_AI_TRIED))
  );
  const [hiding, setHiding] = useState(false);

  const onboardingDone = Boolean(localStorage.getItem(LS_ONBOARDING));

  // Listen for AI usage event dispatched by QuickAdd
  useEffect(() => {
    const handler = () => setAiTried(true);
    window.addEventListener("mt3:ai_tried", handler);
    return () => window.removeEventListener("mt3:ai_tried", handler);
  }, []);

  const items = [
    {
      id: "account",
      text: "Vytvořit účet a nastavit workspace",
      done: onboardingDone,
      action: null,
    },
    {
      id: "notif",
      text: "Přizpůsobit notifikace",
      done: onboardingDone,
      action: null,
    },
    {
      id: "task",
      text: "Přidat první úkol",
      done: tasks.length > 0,
      actionLabel: "Přidat →",
      action: () => setPage("tasks"),
    },
    {
      id: "ai",
      text: "Vyzkoušet AI asistenta",
      done: aiTried,
      actionLabel: "Vyzkoušet →",
      action: () => setPage("dashboard"),
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allDone = completedCount === items.length;
  const pct = Math.round((completedCount / items.length) * 100);

  // Auto-hide 1.2 s after all done
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => setHiding(true), 1200);
    return () => clearTimeout(t);
  }, [allDone]);

  if (dismissed || hiding) return null;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-soft)",
        borderRadius: 14,
        padding: "16px 20px",
        marginBottom: 18,
        transition: "opacity .4s",
        opacity: allDone ? 0 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
          🗺️ První kroky
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)" }}>
            {completedCount} / {items.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              localStorage.setItem(LS_DISMISSED, "1");
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "2px 4px" }}
            title="Zavřít"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--border-soft)", borderRadius: 2, marginBottom: 12 }}>
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--accent), #d97706)",
            borderRadius: 2,
            transition: "width .4s",
          }}
        />
      </div>

      {/* Items */}
      {items.map((item, i) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 0",
            borderBottom: i < items.length - 1 ? "1px solid var(--border-soft)" : "none",
          }}
        >
          {/* Checkmark */}
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: item.done ? "var(--accent)" : "transparent",
              border: `2px solid ${item.done ? "var(--accent)" : "var(--border)"}`,
              fontSize: 10,
              fontWeight: 900,
              color: "#000",
            }}
          >
            {item.done ? "✓" : ""}
          </div>

          {/* Text */}
          <span
            style={{
              fontSize: 13,
              color: item.done ? "var(--text-3)" : "var(--text-2)",
              textDecoration: item.done ? "line-through" : "none",
              flex: 1,
            }}
          >
            {item.text}
          </span>

          {/* Action link */}
          {!item.done && item.action && (
            <button
              type="button"
              onClick={item.action}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {item.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 1.2: Commit**

```bash
cd "Hero projekty/michal-tasks"
git add src/components/GettingStartedCard.jsx
git commit -m "feat: add GettingStartedCard component"
```

---

## Task 2: OnboardingWizard — skeleton + Step 1

**Files:**
- Create: `src/components/OnboardingWizard.jsx`

- [ ] **Step 2.1: Create the file with step 1 (workspace + theme)**

```jsx
// src/components/OnboardingWizard.jsx
import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "./Toast.jsx";
import Icon from "./Icon.jsx";
import { supabase } from "../supabase.js";

export const LS_KEY = "mt3:onboarding_done";

const OVERLAY = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const CARD = {
  background: "var(--surface, #141822)",
  border: "1px solid rgba(251,191,36,0.22)",
  borderRadius: 20,
  width: "100%",
  maxWidth: 480,
  boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
  overflow: "hidden",
  fontFamily: "var(--font-ui, system-ui)",
  color: "var(--text, #e2e8f0)",
};

function Progress({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "20px 28px 0", gap: 0 }}>
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && (
            <div
              style={{
                flex: 1,
                height: 2,
                background: step > n - 1 ? "var(--accent, #fbbf24)" : "rgba(255,255,255,0.08)",
              }}
            />
          )}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
              background:
                step > n
                  ? "var(--accent, #fbbf24)"
                  : step === n
                  ? "rgba(251,191,36,0.15)"
                  : "rgba(255,255,255,0.06)",
              border:
                step === n ? "2px solid var(--accent, #fbbf24)" : step > n ? "none" : "2px solid rgba(255,255,255,0.12)",
              color:
                step > n ? "#000" : step === n ? "var(--accent, #fbbf24)" : "var(--text-3, #64748b)",
            }}
          >
            {step > n ? "✓" : n}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const DEFAULT_PREFS = {
  push_task_reminders: true,
  email_task_reminders: true,
  email_daily_digest: true,
};

export default function OnboardingWizard() {
  const { userId, setDk, renameWorkspace, workspaces, activeWorkspaceId } = useApp();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [wsName, setWsName] = useState("Osobní");
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  // Pre-fill workspace name once workspaces load
  useEffect(() => {
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (active?.name) setWsName(active.name);
  }, [workspaces, activeWorkspaceId]);

  function close() {
    localStorage.setItem(LS_KEY, "1");
    window.dispatchEvent(new Event("mt3:onboarding_done"));
  }

  async function handleStep1Continue() {
    // Apply theme
    setDk(theme === "dark");
    // Rename workspace only if changed
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (wsName.trim() && wsName.trim() !== (active?.name ?? "")) {
      try {
        await renameWorkspace(wsName.trim());
      } catch {
        toast.error("Workspace se nepodařilo přejmenovat.");
      }
    }
    setStep(2);
  }

  // ── STEP 2 & 3 added in Task 3 ──
  // (placeholder render — will be replaced)
  if (step === 1) {
    return (
      <div style={OVERLAY}>
        <div style={CARD}>
          <Progress step={step} />
          <div style={{ padding: "24px 28px 28px" }}>
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-3, #64748b)",
              }}
              title="Přeskočit"
            >
              <Icon name="x" size={16} />
            </button>

            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3, #64748b)", marginBottom: 6 }}>
              Krok 1 ze 3
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 850, color: "var(--text, #f1f5f9)" }}>
              Vítej v Zentero! 👋
            </h2>
            <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "var(--text-3, #64748b)" }}>
              Nastavme appku za 2 minuty — začneme s tvým pracovním prostorem.
            </p>

            {/* Workspace name */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-2, #94a3b8)", marginBottom: 7 }}
              >
                Název workspace
              </label>
              <input
                value={wsName}
                onChange={(e) => setWsName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: "var(--surface-2, rgba(255,255,255,0.06))",
                  border: "1px solid var(--border-soft)",
                  color: "var(--text)",
                  fontSize: 14,
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* Theme picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--text-2, #94a3b8)", marginBottom: 7 }}>
                Vzhled
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { id: "dark", icon: "🌙", label: "Tmavý" },
                  { id: "light", icon: "☀️", label: "Světlý" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    style={{
                      flex: 1,
                      borderRadius: 12,
                      border: `2px solid ${theme === opt.id ? "var(--accent, #fbbf24)" : "var(--border-soft)"}`,
                      background: theme === opt.id ? "rgba(251,191,36,0.08)" : "transparent",
                      padding: "12px 0",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme === opt.id ? "var(--accent, #fbbf24)" : "var(--text-3, #94a3b8)" }}>
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={close} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3, #64748b)", fontSize: 13 }}>
                Přeskočit vše
              </button>
              <button
                type="button"
                onClick={handleStep1Continue}
                style={{
                  background: "linear-gradient(135deg, #fbbf24, #d97706)",
                  color: "#000",
                  fontWeight: 800,
                  fontSize: 14,
                  border: "none",
                  borderRadius: 10,
                  padding: "11px 22px",
                  cursor: "pointer",
                }}
              >
                Pokračovat →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null; // Steps 2 & 3 added in Task 3
}
```

> Note: The outer `<div style={OVERLAY}>` uses `position: fixed`, but the close button inside uses `position: absolute`. To make the close button position correctly, wrap the card content in a `position: relative` container. Fix this in the next task when rendering step 2.

- [ ] **Step 2.2: Commit**

```bash
git add src/components/OnboardingWizard.jsx
git commit -m "feat: OnboardingWizard step 1 (workspace + theme)"
```

---

## Task 3: OnboardingWizard — Steps 2 & 3

**Files:**
- Modify: `src/components/OnboardingWizard.jsx`

Replace the entire file with the complete version containing all 3 steps:

- [ ] **Step 3.1: Replace OnboardingWizard.jsx with full 3-step version**

```jsx
// src/components/OnboardingWizard.jsx
import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "./Toast.jsx";
import Icon from "./Icon.jsx";
import { supabase } from "../supabase.js";

export const LS_KEY = "mt3:onboarding_done";

const OVERLAY = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  background: "rgba(0,0,0,0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

function Progress({ step }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "20px 28px 0", gap: 0 }}>
      {[1, 2, 3].map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && (
            <div style={{ flex: 1, height: 2, background: step > n - 1 ? "var(--accent, #fbbf24)" : "rgba(255,255,255,0.08)" }} />
          )}
          <div
            style={{
              width: 28, height: 28, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, flexShrink: 0,
              background: step > n ? "var(--accent, #fbbf24)" : step === n ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.06)",
              border: step === n ? "2px solid var(--accent, #fbbf24)" : step > n ? "none" : "2px solid rgba(255,255,255,0.12)",
              color: step > n ? "#000" : step === n ? "var(--accent, #fbbf24)" : "var(--text-3, #64748b)",
            }}
          >
            {step > n ? "✓" : n}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0, cursor: "pointer",
        background: on ? "var(--accent, #fbbf24)" : "rgba(255,255,255,0.12)",
        position: "relative", transition: "background .2s",
      }}
    >
      <div
        style={{
          position: "absolute", top: 3,
          left: on ? 21 : 3,
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff", transition: "left .2s",
        }}
      />
    </div>
  );
}

const DEFAULT_PREFS = {
  push_task_reminders: true,
  email_task_reminders: true,
  email_daily_digest: true,
};

export default function OnboardingWizard() {
  const { userId, setDk, renameWorkspace, workspaces, activeWorkspaceId } = useApp();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [wsName, setWsName] = useState("Osobní");
  const [theme, setTheme] = useState(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (active?.name) setWsName(active.name);
  }, [workspaces, activeWorkspaceId]);

  // Escape key closes/skips wizard
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function close() {
    localStorage.setItem(LS_KEY, "1");
    window.dispatchEvent(new Event("mt3:onboarding_done"));
  }

  async function handleStep1Continue() {
    setDk(theme === "dark");
    const active = workspaces.find((w) => w.id === activeWorkspaceId);
    if (wsName.trim() && wsName.trim() !== (active?.name ?? "")) {
      try { await renameWorkspace(wsName.trim()); }
      catch { toast.error("Workspace se nepodařilo přejmenovat."); }
    }
    setStep(2);
  }

  async function handleStep2Continue() {
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;
    } catch {
      toast.error("Notifikace se nepodařilo uložit.");
    } finally {
      setSaving(false);
    }
    setStep(3);
  }

  const cardStyle = {
    background: "var(--surface, #141822)",
    border: "1px solid rgba(251,191,36,0.22)",
    borderRadius: 20,
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
    overflow: "hidden",
    fontFamily: "var(--font-ui, system-ui)",
    color: "var(--text, #e2e8f0)",
    position: "relative",
  };

  const bodyStyle = { padding: "24px 28px 28px" };

  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: ".06em",
    color: "var(--text-2, #94a3b8)", marginBottom: 7,
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "var(--surface-2, rgba(255,255,255,0.06))",
    border: "1px solid var(--border-soft)",
    color: "var(--text)", fontSize: 14, boxSizing: "border-box", outline: "none",
  };

  const btnNext = {
    background: "linear-gradient(135deg, #fbbf24, #d97706)",
    color: "#000", fontWeight: 800, fontSize: 14,
    border: "none", borderRadius: 10, padding: "11px 22px", cursor: "pointer",
  };

  const btnSkip = {
    background: "none", border: "none", cursor: "pointer",
    color: "var(--text-3, #64748b)", fontSize: 13,
  };

  const CloseBtn = () => (
    <button
      type="button"
      onClick={close}
      style={{
        position: "absolute", top: 14, right: 14,
        background: "none", border: "none", cursor: "pointer",
        color: "var(--text-3, #64748b)",
      }}
      title="Přeskočit"
    >
      <Icon name="x" size={16} />
    </button>
  );

  // ── Step 1 ──────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div style={OVERLAY}>
        <div style={cardStyle}>
          <CloseBtn />
          <Progress step={1} />
          <div style={bodyStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3, #64748b)", marginBottom: 6 }}>
              Krok 1 ze 3
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 850 }}>Vítej v Zentero! 👋</h2>
            <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "var(--text-3, #64748b)" }}>
              Nastavme appku za 2 minuty — začneme s tvým pracovním prostorem.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Název workspace</label>
              <input value={wsName} onChange={(e) => setWsName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Vzhled</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ id: "dark", icon: "🌙", label: "Tmavý" }, { id: "light", icon: "☀️", label: "Světlý" }].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    style={{
                      flex: 1, borderRadius: 12, padding: "12px 0", cursor: "pointer", textAlign: "center",
                      border: `2px solid ${theme === opt.id ? "var(--accent, #fbbf24)" : "var(--border-soft)"}`,
                      background: theme === opt.id ? "rgba(251,191,36,0.08)" : "transparent",
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: theme === opt.id ? "var(--accent, #fbbf24)" : "var(--text-3, #94a3b8)" }}>
                      {opt.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={close} style={btnSkip}>Přeskočit vše</button>
              <button type="button" onClick={handleStep1Continue} style={btnNext}>Pokračovat →</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2 ──────────────────────────────────────────────────────────────
  const NOTIF_ITEMS = [
    { key: "push_task_reminders",  name: "Push notifikace", desc: "Připomenutí úkolů v prohlížeči" },
    { key: "email_task_reminders", name: "E-mail: připomenutí úkolů", desc: "Blížící se termíny e-mailem" },
    { key: "email_daily_digest",   name: "E-mail: denní souhrn", desc: "Každé ráno plán dne" },
  ];

  if (step === 2) {
    return (
      <div style={OVERLAY}>
        <div style={cardStyle}>
          <CloseBtn />
          <Progress step={2} />
          <div style={bodyStyle}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-3, #64748b)", marginBottom: 6 }}>
              Krok 2 ze 3
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 850 }}>Upozornění 🔔</h2>
            <p style={{ margin: "0 0 18px", fontSize: 13.5, color: "var(--text-3, #64748b)" }}>
              Chceš vědět o termínech a denním souhrnu? Kdykoli to změníš v nastavení.
            </p>

            {NOTIF_ITEMS.map((item, i) => (
              <div
                key={item.key}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: i < NOTIF_ITEMS.length - 1 ? "1px solid var(--border-soft)" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-3, #64748b)", marginTop: 2 }}>{item.desc}</div>
                </div>
                <Toggle
                  on={prefs[item.key]}
                  onToggle={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key] }))}
                />
              </div>
            ))}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
              <button type="button" onClick={() => setStep(1)} style={btnSkip}>← Zpět</button>
              <button
                type="button"
                onClick={handleStep2Continue}
                disabled={saving}
                style={{ ...btnNext, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? "Ukládám…" : "Pokračovat →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3 ──────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY}>
      <div style={cardStyle}>
        <Progress step={3} />
        <div style={{ ...bodyStyle, textAlign: "center", paddingTop: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🚀</div>
          <h2 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 850 }}>Vše připraveno!</h2>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "var(--text-3, #64748b)", lineHeight: 1.6 }}>
            Workspace <strong style={{ color: "var(--accent, #fbbf24)" }}>{wsName || "Osobní"}</strong> je nastaven.
            <br />
            Na dashboardu najdeš průvodce prvními kroky.
          </p>
          <button
            type="button"
            onClick={close}
            style={{
              ...btnNext,
              width: "100%",
              padding: "14px",
              fontSize: 15,
              borderRadius: 12,
            }}
          >
            Vstoupit do Zentero
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/components/OnboardingWizard.jsx
git commit -m "feat: OnboardingWizard steps 2 (notifications) + 3 (done)"
```

---

## Task 4: Wire OnboardingWizard into App.jsx

**Files:**
- Modify: `src/App.jsx` — lines 29–30 (imports) and ~186 (AppShell function body) and ~395 (render)

- [ ] **Step 4.1: Add import after existing AdminUsersPage import (line 31)**

Find this in `src/App.jsx`:
```js
const AdminUsersPage       = lazy(() => import("./pages/AdminUsersPage.jsx"));
```

Add immediately after:
```js
import OnboardingWizard, { LS_KEY as ONBOARDING_LS_KEY } from "./components/OnboardingWizard.jsx";
```

- [ ] **Step 4.2: Add state + listener to AppShell**

In `AppShell` function (around line 186), after the existing `const [shortcutsOpen, setShortcutsOpen] = useState(false);` line, add:

```js
const [onboardingDone, setOnboardingDone] = useState(
  () => Boolean(localStorage.getItem(ONBOARDING_LS_KEY))
);

useEffect(() => {
  const handler = () => setOnboardingDone(true);
  window.addEventListener("mt3:onboarding_done", handler);
  return () => window.removeEventListener("mt3:onboarding_done", handler);
}, []);
```

- [ ] **Step 4.3: Render wizard**

In `AppShell` return, find the block that starts with:
```jsx
{isSystemAdmin && (
  <>
    <ErrorBoundary inline label="Health check">
```

Add the wizard **before** that block:
```jsx
{loaded && !onboardingDone && <OnboardingWizard />}
```

- [ ] **Step 4.4: Verify it renders**

Open the app in browser. In DevTools console run:
```js
localStorage.removeItem("mt3:onboarding_done"); location.reload();
```
You should see the wizard overlay on top of the app.

To dismiss and re-enable normal app, run in console:
```js
localStorage.setItem("mt3:onboarding_done", "1"); location.reload();
```

- [ ] **Step 4.5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire OnboardingWizard into AppShell"
```

---

## Task 5: Wire GettingStartedCard into DashboardPage

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 5.1: Add import**

At the top of `src/pages/DashboardPage.jsx`, after the last import line, add:
```js
import GettingStartedCard from "../components/GettingStartedCard.jsx";
```

- [ ] **Step 5.2: Render the card**

In `DashboardPage`'s main return, find this block (around line 750 in the main column `<div>` inside `<div className="work">`):
```jsx
{/* AI hero — desktop and mobile */}
<div className="ai-hero">
```

Add `<GettingStartedCard />` immediately before the AI hero comment:
```jsx
<GettingStartedCard />

{/* AI hero — desktop and mobile */}
<div className="ai-hero">
```

- [ ] **Step 5.3: Verify in browser**

Clear localStorage and reload. After dismissing the wizard, you should see the "První kroky" card above the AI hero section on the dashboard. The first 2 items (account setup + notifications) should appear checked since the wizard was just completed.

To test the dismissed state:
```js
localStorage.setItem("mt3:getting_started_dismissed", "1"); location.reload();
// Card should be gone
localStorage.removeItem("mt3:getting_started_dismissed"); location.reload();
// Card should be back
```

- [ ] **Step 5.4: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: render GettingStartedCard on dashboard"
```

---

## Task 6: Set mt3:ai_tried flag in QuickAdd

**Files:**
- Modify: `src/components/QuickAdd.jsx` — inside the AI draft success path (~line 141)

- [ ] **Step 6.1: Find the success path**

In `src/components/QuickAdd.jsx`, find the block that invokes `ai-task-assist` (around line 114):
```js
const { data, error } = await supabase.functions.invoke("ai-task-assist", {
  ...
  action: "draft_task",
```

After the error guard block (after the `if (error)` returns), find where the successful draft is processed. Look for the `toast("AI neposkytlo žádný návrh.", "error")` line — the code *after* that is the success path. Add the flag right after the successful check:

Find:
```js
toast("AI neposkytlo žádný návrh.", "error");
```

The next significant line after the various error checks is where the draft result is used. Add these two lines right after the successful draft is confirmed (after the null-check for draft data):

```js
// Mark "tried AI" for onboarding checklist
if (!localStorage.getItem("mt3:ai_tried")) {
  localStorage.setItem("mt3:ai_tried", "1");
  window.dispatchEvent(new Event("mt3:ai_tried"));
}
```

- [ ] **Step 6.2: Verify**

Open app, go to Dashboard, use Quick Add with the AI sparkle button. After the draft loads, open DevTools:
```js
localStorage.getItem("mt3:ai_tried") // should be "1"
```

The 4th item in GettingStartedCard should now show checked (may need to re-render — navigate away and back).

- [ ] **Step 6.3: Commit**

```bash
git add src/components/QuickAdd.jsx
git commit -m "feat: track AI assistant first use for onboarding checklist"
```

---

## Task 7: End-to-end verification

- [ ] **Step 7.1: Full onboarding flow test**

```js
// Reset all onboarding state in DevTools console
localStorage.removeItem("mt3:onboarding_done");
localStorage.removeItem("mt3:getting_started_dismissed");
localStorage.removeItem("mt3:ai_tried");
location.reload();
```

Verify:
1. Wizard appears on top of app ✓
2. Step 1: Rename workspace → click Continue → workspace name updates in sidebar ✓
3. Step 1: Toggle theme → app switches dark/light immediately ✓
4. Step 2: Toggles work, click Continue → notification_preferences row created in Supabase ✓
5. Step 3: "Vstoupit do Zentero" → wizard closes ✓
6. Dashboard shows GettingStartedCard with items 1+2 checked ✓
7. Add a task → item 3 auto-checks ✓
8. Use AI draft → item 4 auto-checks ✓
9. All 4 checked → card fades out after 1.2s ✓

- [ ] **Step 7.2: Skip flow test**

```js
localStorage.removeItem("mt3:onboarding_done"); location.reload();
```

Click "Přeskočit vše" → wizard closes, localStorage key set, GettingStartedCard shows on dashboard with items 1+2 unchecked.

- [ ] **Step 7.3: Returning user test**

Reload page normally (no localStorage clear). Wizard should NOT appear. GettingStartedCard should NOT appear (since `mt3:getting_started_dismissed` was set if you dismissed it, or the card is still shown if all items aren't done yet).

- [ ] **Step 7.4: Final commit**

```bash
git add -A
git status  # verify only expected files changed
git commit -m "feat: onboarding wizard + getting started dashboard card

3-step modal wizard (workspace/theme, notifications, done) shown once
to new users via localStorage flag. Getting started card on dashboard
tracks 4 first-run tasks and auto-dismisses when all complete.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
