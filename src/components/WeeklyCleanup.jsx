import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "./Toast.jsx";
import Icon from "./Icon.jsx";
import { formatDateKey } from "../locale.js";
import { startOfToday } from "../utils.js";

const STALE_DAYS = 14;

function getDaysAgo(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - ts) / 86400000);
}

function staleDaysLabel(days) {
  if (days === null) return "";
  if (days === 0) return "dnes";
  if (days === 1) return "včera";
  if (days < 7) return `${days} d`;
  if (days < 30) return `${Math.floor(days / 7)} t`;
  return `${Math.floor(days / 30)} m`;
}

export default function WeeklyCleanup({ onClose }) {
  const { tasks, updateTask, deleteTask, projects, pushUndo } = useApp();
  const toast = useToast();

  const staleCutoff = Date.now() - STALE_DAYS * 86400000;

  const staleTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (t.status === "done" || t.status === "deleted") return false;
        const lastActivity = t.updatedAt || t.createdAt || 0;
        return lastActivity < staleCutoff;
      })
      .sort((a, b) => (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0));
  }, [tasks, staleCutoff]);

  const [dismissed, setDismissed] = useState(new Set());
  const visible = staleTasks.filter((t) => !dismissed.has(t.id));

  const dismiss = (id) => setDismissed((prev) => new Set([...prev, id]));

  const handleDone = (t) => {
    updateTask(t.id, { status: "done" });
    pushUndo(`Hotovo: "${t.title?.slice(0, 30)}"`, () => updateTask(t.id, { status: t.status }));
    dismiss(t.id);
  };

  const handleSnooze = (t) => {
    const d = startOfToday();
    d.setDate(d.getDate() + 7);
    updateTask(t.id, { dueDate: formatDateKey(d) });
    dismiss(t.id);
    toast(`Odloženo o 7 dní: "${t.title?.slice(0, 30)}"`, "success");
  };

  const handleDelete = (t) => {
    deleteTask(t.id);
    dismiss(t.id);
  };

  const handleKeep = (t) => {
    updateTask(t.id, { updatedAt: Date.now() });
    dismiss(t.id);
    toast("Úkol ponechán", "success");
  };

  const allDone = visible.length === 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 20, width: "100%", maxWidth: 560,
          maxHeight: "min(80vh, 640px)", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid var(--border-soft)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
              🧹 Týdenní čistka
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
              {allDone
                ? "Vše vyřešeno — systém je čistý."
                : `${visible.length} úkolů bez aktivity déle než ${STALE_DAYS} dní. Rychle rozhodni, co s nimi.`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
            <Icon name="x" size={15} color="var(--text-2)" />
          </button>
        </div>

        {/* Task list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 16px 16px" }}>
          {allDone ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-3)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-2)" }}>Čisto!</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>Skvělá práce — žádné staré úkoly nezůstaly.</div>
            </div>
          ) : (
            visible.map((t) => {
              const proj = projects.find((p) => p.id === t.projectId);
              const daysAgo = getDaysAgo(t.updatedAt || t.createdAt);
              return (
                <div key={t.id} style={{
                  padding: "12px 4px", borderBottom: "1px solid var(--border-soft)",
                  display: "flex", flexDirection: "column", gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || "Bez názvu"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, display: "flex", gap: 8 }}>
                        {proj && <span style={{ color: "var(--accent)", fontWeight: 500 }}>{proj.name}</span>}
                        {daysAgo !== null && <span>naposledy: {staleDaysLabel(daysAgo)} zpět</span>}
                        {t.dueDate && <span style={{ color: t.dueDate < formatDateKey(startOfToday()) ? "#ef4444" : "var(--text-3)" }}>termín: {t.dueDate}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button onClick={() => handleDone(t)} style={actionBtn("#22c55e")}>✓ Hotovo</button>
                    <button onClick={() => handleSnooze(t)} style={actionBtn("#3b82f6")}>😴 +7 dní</button>
                    <button onClick={() => handleKeep(t)} style={actionBtn("var(--text-2)")}>👍 Ponechat</button>
                    <button onClick={() => handleDelete(t)} style={actionBtn("#ef4444")}>🗑 Smazat</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {!allDone && (
          <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-soft)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
            <button
              onClick={() => {
                visible.forEach((t) => handleKeep(t));
                toast("Všechny úkoly ponechány", "success");
              }}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--input)", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}
            >
              Ponechat vše
            </button>
            <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent)", color: "var(--bg)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              Hotovo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function actionBtn(color) {
  return {
    padding: "6px 12px", borderRadius: 7, border: `1px solid ${color}22`,
    background: `${color}11`, color, fontSize: 12, fontWeight: 600,
    cursor: "pointer", transition: "background .15s",
  };
}
