import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "./Icon.jsx";
import SnoozeSheet from "./SnoozeSheet.jsx";
import { useToast } from "./Toast.jsx";
import { formatDateKey } from "../locale.js";
import { startOfToday } from "../utils.js";

const SHEET_BACKDROP_Z = 2147483000;
const SHEET_PANEL_Z = 2147483001;

export default function TaskContextSheet({ task, onClose, onEdit }) {
  const { deleteTask, updateTask, projects } = useApp();
  const toast = useToast();
  const [view, setView] = useState("main"); // "main" | "snooze" | "move"
  const currentProjectId = task.projectId ?? task.project ?? null;

  const showUndoToast = (message, onUndo) => {
    toast(
      <>
        <span>{message}</span>
        <button className="toast-action" onClick={(e) => { e.stopPropagation(); onUndo?.(); }}>
          Zpět
        </button>
      </>,
      "success"
    );
  };

  if (view === "snooze") {
    return (
      <SnoozeSheet
        taskId={task.id}
        task={task}
        onClose={onClose}
        onSnoozed={({ previousDueDate, label }) => {
          showUndoToast(`Odloženo: ${label}`, () => {
            updateTask(task.id, { dueDate: previousDueDate ?? null }, { silent: true });
          });
        }}
      />
    );
  }

  if (view === "move") {
    const otherProjects = projects.filter((p) => p.status !== "deleted" && p.id !== currentProjectId);
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: SHEET_BACKDROP_Z, background: "rgba(0,0,0,0.45)" }} />
        <div className="su" style={{
          position: "fixed", left: 0, right: 0, bottom: 0, zIndex: SHEET_PANEL_Z,
          background: "var(--bg-2)", borderRadius: "16px 16px 0 0",
          paddingBottom: "calc(20px + var(--safe-area-inset-bottom, 0px))",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.22)",
          maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "12px auto 0" }} />
          <div style={{ padding: "16px 16px 4px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setView("main")} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "2px 4px" }}>
                <Icon name="chevron-left" size={18} color="var(--text-3)" />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Přesunout do projektu</span>
            </div>
          </div>
          <div style={{ overflowY: "auto", padding: "8px 16px" }}>
            {currentProjectId && (
              <button onClick={() => { updateTask(task.id, { projectId: null }); onClose(); }} style={rowStyle()}>
                <span style={iconBox("#6b7280")}><Icon name="x" size={15} color="#6b7280" strokeWidth={2} /></span>
                Bez projektu
              </button>
            )}
            {otherProjects.map((p) => (
              <button key={p.id} onClick={() => { updateTask(task.id, { projectId: p.id }); onClose(); }} style={rowStyle()}>
                <span style={iconBox("var(--accent)")}><Icon name="folder" size={15} color="var(--accent)" strokeWidth={2} /></span>
                {p.name}
              </button>
            ))}
            {otherProjects.length === 0 && !task.projectId && (
              <p style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", padding: "16px 0" }}>Žádné jiné projekty</p>
            )}
          </div>
        </div>
      </>
    );
  }

  const isDone = task.status === "done";
  const todayKey = formatDateKey(startOfToday());
  const isOverdue = !isDone && task.dueDate && task.dueDate < todayKey;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: SHEET_BACKDROP_Z, background: "rgba(0,0,0,0.45)" }} />
      <div className="su" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: SHEET_PANEL_Z,
        background: "var(--bg-2)", borderRadius: "16px 16px 0 0",
        paddingBottom: "calc(20px + var(--safe-area-inset-bottom, 0px))",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.22)",
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border)", margin: "12px auto 0" }} />
        <div style={{ padding: "12px 16px 4px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {task.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button onClick={() => { onClose(); onEdit?.(); }} style={rowStyle()}>
              <span style={iconBox("var(--accent)")}><Icon name="edit-2" size={15} color="var(--accent)" strokeWidth={2} /></span>
              Upravit úkol
            </button>
            {isOverdue && (
              <button onClick={() => { updateTask(task.id, { dueDate: todayKey }); navigator.vibrate?.([12, 18]); onClose(); }} style={rowStyle()}>
                <span style={iconBox("#f59e0b")}><Icon name="sunrise" size={15} color="#f59e0b" strokeWidth={2} /></span>
                Posunout na dnes
              </button>
            )}
            <button onClick={() => { updateTask(task.id, { status: isDone ? "todo" : "done" }); navigator.vibrate?.([15, 20]); onClose(); }} style={rowStyle()}>
              <span style={iconBox("#22c55e")}><Icon name="check-circle" size={15} color="#22c55e" strokeWidth={2} /></span>
              {isDone ? "Vrátit do To do" : "Označit jako hotové"}
            </button>
            <button onClick={() => { updateTask(task.id, { starred: !task.starred }); navigator.vibrate?.(10); onClose(); }} style={rowStyle()}>
              <span style={iconBox("#eab308")}><Icon name="star" size={15} color="#eab308" strokeWidth={2} fill={task.starred ? "#eab308" : "none"} /></span>
              {task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            </button>
            {!isDone && (
              <button onClick={() => setView("snooze")} style={rowStyle()}>
                <span style={iconBox("#b45309")}><Icon name="clock" size={15} color="#b45309" strokeWidth={2} /></span>
                Odložit…
              </button>
            )}
            <button onClick={() => setView("move")} style={rowStyle()}>
              <span style={iconBox("#6366f1")}><Icon name="folder" size={15} color="#6366f1" strokeWidth={2} /></span>
              {currentProjectId ? "Přesunout projekt…" : "Přiřadit projekt…"}
            </button>
            <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
            <button
              onClick={() => { deleteTask(task.id); navigator.vibrate?.([50, 30, 50]); onClose(); }}
              style={{ ...rowStyle(), color: "#ef4444" }}
            >
              <span style={iconBox("#ef4444")}><Icon name="trash" size={15} color="#ef4444" strokeWidth={2} /></span>
              Smazat úkol
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function rowStyle() {
  return {
    padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
    background: "var(--surface)", color: "inherit", fontSize: 14, fontWeight: 500,
    textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center",
    gap: 12, width: "100%", WebkitTapHighlightColor: "transparent",
  };
}

function iconBox(color) {
  return {
    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
    background: color + "1a",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
}
