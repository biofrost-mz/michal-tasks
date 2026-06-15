import React from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "./Icon.jsx";
import { startOfToday } from "../utils.js";
import { formatDateKey } from "../locale.js";

const OPTIONS = [
  { label: "Zítra", icon: "sunrise", days: 1 },
  { label: "+3 dny", icon: "calendar", days: 3 },
  { label: "Příští týden", icon: "calendar", days: 7 },
];

export default function SnoozeSheet({ taskId, onClose }) {
  const { updateTask } = useApp();

  const snooze = (days) => {
    const d = new Date(startOfToday().getTime() + days * 86400000);
    updateTask(taskId, { dueDate: formatDateKey(d) });
    navigator.vibrate?.([15, 20]);
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 249,
          background: "rgba(0,0,0,0.45)",
        }}
      />
      <div
        className="su"
        style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 250,
          background: "var(--bg-2)",
          borderRadius: "16px 16px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.22)",
        }}
      >
        <div style={{
          width: 40, height: 4, borderRadius: 2, background: "var(--border)",
          margin: "12px auto 0",
        }} />
        <div style={{ padding: "16px 16px 4px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
            Odložit úkol
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {OPTIONS.map(({ label, icon, days }) => (
              <button
                key={days}
                onClick={() => snooze(days)}
                style={{
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 15,
                  fontWeight: 500,
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <span style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "#92400e22",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon name={icon} size={17} color="#b45309" strokeWidth={2} />
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
