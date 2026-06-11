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

function Toggle({ on, onToggle, label }) {
  return (
    <div
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
      tabIndex={0}
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

const NOTIF_ITEMS = [
  { key: "push_task_reminders",  name: "Push notifikace", desc: "Připomenutí úkolů v prohlížeči" },
  { key: "email_task_reminders", name: "E-mail: připomenutí úkolů", desc: "Blížící se termíny e-mailem" },
  { key: "email_daily_digest",   name: "E-mail: denní souhrn", desc: "Každé ráno plán dne" },
];

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
                  label={item.name}
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
