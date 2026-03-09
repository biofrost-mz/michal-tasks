import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

export default function CommandPalette({ onClose }) {
  const { t, tasks, projects, notes, addNote, setPage, setTaskDetail, openProject, openNote, isMobile } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fuzzy match: returns score >= 0 or -1 for no match
  function fuzzy(str, q) {
    if (!q) return 1;
    const s = str.toLowerCase();
    const qq = q.toLowerCase();
    let si = 0, qi = 0, score = 0;
    while (si < s.length && qi < qq.length) {
      if (s[si] === qq[qi]) { score++; qi++; }
      si++;
    }
    return qi === qq.length ? score : -1;
  }

  const quickActions = [
    { id: "new-task",      icon: "check-square", label: "Nový úkol",           group: "Akce",     action: () => { onClose(); window.dispatchEvent(new CustomEvent("focusQuickAdd")); } },
    { id: "new-note",      icon: "file-text",    label: "Nová poznámka",        group: "Akce",     action: () => { const n = addNote({}); openNote(n.id); onClose(); } },
    { id: "go-dashboard",  icon: "home",         label: "Přejít na Přehled",    group: "Navigace", action: () => { setPage("dashboard"); onClose(); } },
    { id: "go-tasks",      icon: "check-square", label: "Přejít na Úkoly",      group: "Navigace", action: () => { setPage("tasks"); onClose(); } },
    { id: "go-timeline",   icon: "calendar",     label: "Přejít na Plán",       group: "Navigace", action: () => { setPage("timeline"); onClose(); } },
    { id: "go-notes",      icon: "file-text",    label: "Přejít na Poznámky",   group: "Navigace", action: () => { setPage("notes"); onClose(); } },
  ];

  const taskResults = tasks
    .filter((task) => task.status !== "done")
    .map((task) => {
      const score = fuzzy(task.title, query);
      if (score < 0) return null;
      const proj = projects.find((p) => p.id === task.projectId);
      return {
        id: "task-" + task.id,
        icon: "check-square",
        label: task.title,
        meta: proj?.name,
        group: "Úkoly",
        score,
        action: () => { setTaskDetail(task.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const projectResults = projects
    .filter((p) => p.status === "active")
    .map((p) => {
      const score = fuzzy(p.name, query);
      if (score < 0) return null;
      return {
        id: "proj-" + p.id,
        icon: "folder",
        label: p.name,
        group: "Projekty",
        score,
        action: () => { openProject(p.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const noteResults = notes
    .map((n) => {
      const score = fuzzy((n.title || "Poznámka bez názvu") + " " + (n.content || ""), query);
      if (score < 0) return null;
      return {
        id: "note-" + n.id,
        icon: "file-text",
        label: n.title || "Poznámka bez názvu",
        group: "Poznámky",
        score,
        action: () => { openNote(n.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const items = query.trim()
    ? [...taskResults, ...projectResults, ...noteResults]
    : quickActions;

  const safeCursor = Math.min(cursor, Math.max(0, items.length - 1));

  useEffect(() => { setCursor(0); }, [query]);

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[safeCursor]?.action?.(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "flex-start",
        justifyContent: "center",
        paddingTop: isMobile ? 0 : "15vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isMobile ? "su" : "pop"}
        style={{
          width: isMobile ? "100%" : 580, maxWidth: isMobile ? "100%" : "90vw",
          background: t.bg2,
          border: `1px solid ${t.border}`,
          borderRadius: isMobile ? "16px 16px 0 0" : 14,
          boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,0.4)" : "0 24px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
          <Icon name="search" size={15} color={t.text3} strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Hledat úkoly, projekty, poznámky…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: t.text, fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer" }}>✕</button>
          )}
          <kbd style={{ fontSize: 10, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>
        </div>

        <div style={{ maxHeight: isMobile ? "55vh" : 380, overflowY: "auto", padding: "8px 0" }}>
          {items.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: t.text3, fontSize: 13 }}>
              Nic nenalezeno
            </div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {group}
                </div>
                {items
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const globalIdx = items.indexOf(item);
                    const isActive = globalIdx === safeCursor;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setCursor(globalIdx)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 16px", border: "none", textAlign: "left",
                          background: isActive ? t.accentBg : "transparent",
                          borderLeft: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name={item.icon} size={14} color={isActive ? t.accent : t.text2} strokeWidth={1.75} />
                        </span>
                        <span style={{ flex: 1, fontSize: 13.5, color: isActive ? t.accent : t.text, fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
                        {item.meta && <span style={{ fontSize: 11, color: t.text3 }}>{item.meta}</span>}
                        {isActive && <kbd style={{ fontSize: 10, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "1px 5px" }}>↵</kbd>}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {!isMobile && (
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 14, fontSize: 11, color: t.text3 }}>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>↑↓</kbd> navigace</span>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>↵</kbd> otevřít</span>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>Esc</kbd> zavřít</span>
        </div>
        )}
        {isMobile && <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />}
      </div>
    </div>
  );
}
