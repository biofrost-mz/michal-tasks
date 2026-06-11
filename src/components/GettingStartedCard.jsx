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
