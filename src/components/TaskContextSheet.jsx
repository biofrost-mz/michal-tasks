import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "./Icon.jsx";
import SnoozeSheet from "./SnoozeSheet.jsx";

export default function TaskContextSheet({ task, onClose, onEdit }) {
  const { t, deleteTask, updateTask, projects } = useApp();
  const [view, setView] = useState("main"); // "main" | "snooze" | "move"

  if (view === "snooze") {
    return <SnoozeSheet taskId={task.id} onClose={onClose} />;
  }

  if (view === "move") {
    const otherProjects = projects.filter((p) => p.status !== "deleted" && p.id !== task.projectId);
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 249, background: "rgba(0,0,0,0.45)" }} />
        <div className="su" style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 250,
          background: t.bg2, borderRadius: "16px 16px 0 0",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.22)",
          maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: t.border, margin: "12px auto 0" }} />
          <div style={{ padding: "16px 16px 4px", borderBottom: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: "2px 4px" }}>
                <Icon name="chevron-left" size={18} color={t.text3} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: t.text2, textTransform: "uppercase", letterSpacing: "0.04em" }}>Přesunout do projektu</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "8px 16px" }}>
            {task.projectId && (
              <button onClick={() => { updateTask(task.id, { projectId: null }); onClose(); }} style={rowStyle(t)}>
                <span style={iconBox(t, "#6b7280")}><Icon name="x" size={15} color="#6b7280" strokeWidth={2} /></span>
                Bez projektu
              </button>
            )}
            {otherProjects.map((p) => (
              <button key={p.id} onClick={() => { updateTask(task.id, { projectId: p.id }); onClose(); }} style={rowStyle(t)}>
                <span style={iconBox(t, t.accent)}><Icon name="folder" size={15} color={t.accent} strokeWidth={2} /></span>
                {p.name}
              </button>
            ))}
            {otherProjects.length === 0 && !task.projectId && (
              <p style={{ fontSize: 13, color: t.text3, textAlign: "center", padding: "16px 0" }}>Žádné jiné projekty</p>
            )}
          </div>
        </div>
      </>
    );
  }

  const isDone = task.status === "done";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 249, background: "rgba(0,0,0,0.45)" }} />
      <div className="su" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 250,
        background: t.bg2, borderRadius: "16px 16px 0 0",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: t.border, margin: "12px auto 0" }} />
        <div style={{ padding: "12px 16px 4px 16px" }}>
          <div style={{ fontSize: 13, color: t.text3, marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {task.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => { onClose(); onEdit?.(); }} style={rowStyle(t)}>
              <span style={iconBox(t, t.accent)}><Icon name="edit-2" size={15} color={t.accent} strokeWidth={2} /></span>
              Upravit úkol
            </button>
            {!isDone && (
              <button onClick={() => setView("snooze")} style={rowStyle(t)}>
                <span style={iconBox(t, "#b45309")}><Icon name="clock" size={15} color="#b45309" strokeWidth={2} /></span>
                Odložit…
              </button>
            )}
            <button onClick={() => setView("move")} style={rowStyle(t)}>
              <span style={iconBox(t, "#6366f1")}><Icon name="folder" size={15} color="#6366f1" strokeWidth={2} /></span>
              Přesunout projekt…
            </button>
            <div style={{ height: 1, background: t.border, margin: "4px 0" }} />
            <button
              onClick={() => { deleteTask(task.id); navigator.vibrate?.([50, 30, 50]); onClose(); }}
              style={{ ...rowStyle(t), color: "#ef4444" }}
            >
              <span style={iconBox(t, "#ef4444")}><Icon name="trash" size={15} color="#ef4444" strokeWidth={2} /></span>
              Smazat úkol
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function rowStyle(t) {
  return {
    padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`,
    background: t.card, color: "inherit", fontSize: 14, fontWeight: 500,
    textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center",
    gap: 12, width: "100%", WebkitTapHighlightColor: "transparent",
  };
}

function iconBox(t, color) {
  return {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    background: color + "1a",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
