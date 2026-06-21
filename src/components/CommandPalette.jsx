import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'

export default function CommandPalette({ onClose }) {
  const { tasks, projects, tags, notes, addNote, setPage, setTaskDetail, openProject, openNote, isMobile, setSearch, setDashFilter } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  // Filter chips: "status" | "priority" | "project" | null
  const [activeChip, setActiveChip] = useState(null);
  const [chipValue, setChipValue] = useState(null);
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

  const openTasksWithFilter = (filter = null, searchText = "") => {
    setPage("tasks");
    setDashFilter(filter);
    setSearch(searchText);
    onClose();
  };

  const quickActions = [
    { id: "new-task",        icon: "check-square", label: "Nový úkol",           group: "Akce",     action: () => { onClose(); window.dispatchEvent(new CustomEvent("focusQuickAdd")); } },
    { id: "new-note",        icon: "file-text",    label: "Nová poznámka",        group: "Akce",     action: () => { const n = addNote({}); openNote(n.id); onClose(); } },
    { id: "weekly-cleanup",  icon: "trash-2",      label: "Týdenní čistka",       group: "Akce",     action: () => { onClose(); window.dispatchEvent(new CustomEvent("openWeeklyCleanup")); } },
    { id: "go-dashboard",   icon: "home",         label: "Přejít na Přehled",      group: "Navigace", action: () => { setPage("dashboard"); onClose(); } },
    { id: "go-tasks",       icon: "check-square", label: "Přejít na Úkoly",        group: "Navigace", action: () => { setPage("tasks"); onClose(); } },
    { id: "go-quick-todos", icon: "zap",          label: "Přejít na Rychlý seznam",group: "Navigace", action: () => { setPage("quick-todos"); onClose(); } },
    { id: "go-projects",    icon: "folder",       label: "Přejít na Projekty",     group: "Navigace", action: () => { setPage("projects"); onClose(); } },
    { id: "go-timeline",    icon: "calendar",     label: "Přejít na Plán",         group: "Navigace", action: () => { setPage("timeline"); onClose(); } },
    { id: "go-notes",       icon: "file-text",    label: "Přejít na Poznámky",     group: "Navigace", action: () => { setPage("notes"); onClose(); } },
  ];

  // Build filter-aware task list
  const filteredTasks = tasks.filter((task) => {
    if (task.status === "done") return false;
    if (activeChip === "status" && chipValue && task.status !== chipValue) return false;
    if (activeChip === "priority") {
      if (chipValue === "none" && task.priority) return false;
      if (chipValue !== "none" && chipValue && task.priority !== chipValue) return false;
    }
    if (activeChip === "project") {
      if (chipValue === "inbox" && task.projectId) return false;
      if (chipValue && chipValue !== "inbox" && task.projectId !== chipValue) return false;
    }
    return true;
  });

  const taskResults = filteredTasks
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

  // Tag search results — clicking applies tag filter on TasksPage
  const tagResults = tags
    .map((tg) => {
      const score = fuzzy(tg.name, query);
      if (score < 0) return null;
      return {
        id: "tag-" + tg.id,
        icon: "tag",
        label: `Filtrovat tag: ${tg.name}`,
        meta: tg.name,
        group: "Tagy",
        score,
        tagColor: tg.color,
        action: () => {
          openTasksWithFilter({ tagId: tg.id }, "");
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Priority filter quick actions (only show when queried)
  const priorityFilters = query
    ? [
        { id: "filter-high",   icon: "alert-triangle", label: "Vysoká priorita",  group: "Filtry", action: () => openTasksWithFilter({ priority: "high" }) },
        { id: "filter-medium", icon: "minus-circle",   label: "Střední priorita", group: "Filtry", action: () => openTasksWithFilter({ priority: "medium" }) },
      ].filter((pf) => fuzzy(pf.label, query) >= 0)
    : [];

  // Date filter quick actions (only show when queried)
  const dateFilters = query
    ? [
        { id: "filter-today",   icon: "calendar",    label: "Dnes",        group: "Filtry", action: () => openTasksWithFilter({ date: "today" }) },
        { id: "filter-week",    icon: "calendar",    label: "Tento týden", group: "Filtry", action: () => openTasksWithFilter({ date: "week" }) },
        { id: "filter-overdue", icon: "alert-circle",label: "Po termínu",  group: "Filtry", action: () => openTasksWithFilter({ date: "overdue" }) },
      ].filter((df) => fuzzy(df.label, query) >= 0)
    : [];

  const items = query.trim()
    ? [...taskResults, ...projectResults, ...tagResults, ...noteResults, ...priorityFilters, ...dateFilters]
    : quickActions;

  const safeCursor = Math.min(cursor, Math.max(0, items.length - 1));

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[safeCursor]?.action?.(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const groups = [...new Set(items.map((i) => i.group))];

  // Filter chips for quick narrowing
  const statusChips = [
    { k: "todo",    label: "K udělání", color: "#8b8f9c" },
    { k: "doing",   label: "Probíhá",   color: "#f59e0b" },
    { k: "waiting", label: "Čeká",      color: "#fb923c" },
  ];
  const priorityChips = [
    { k: "high",   label: "Vysoká", color: "#ef4444" },
    { k: "medium", label: "Střední", color: "#f59e0b" },
    { k: "low",    label: "Nízká",  color: "#22c55e" },
  ];
  const projectChips = [
    { k: "inbox", label: "Inbox", color: "var(--text-3)" },
    ...projects.filter((p) => p.status === "active").slice(0, 3).map((p) => ({ k: p.id, label: p.name, color: "var(--accent)" })),
  ];

  const chipCategories = [
    { label: "Status",  chips: statusChips,   type: "status"   },
    { label: "Priorita",chips: priorityChips, type: "priority" },
    { label: "Projekt", chips: projectChips,  type: "project"  },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(6,8,14,0.55)", backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: isMobile ? "calc(env(safe-area-inset-top, 0px) + 8px)" : "15vh",
        paddingLeft: isMobile ? 8 : 0,
        paddingRight: isMobile ? 8 : 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pop"
        style={{
          width: isMobile ? "100%" : 600, maxWidth: isMobile ? "100%" : "90vw",
          background: "rgba(20,24,34,0.78)",
          backdropFilter: "blur(24px) saturate(150%)",
          WebkitBackdropFilter: "blur(24px) saturate(150%)",
          border: `1px solid rgba(255,255,255,0.06)`,
          borderRadius: isMobile ? 14 : 14,
          boxShadow: isMobile
            ? "0 12px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)"
            : "0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          overflow: "hidden",
          minHeight: isMobile ? 380 : undefined,
          maxHeight: isMobile ? "78svh" : undefined,
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingTop: 8, paddingBottom: 2, paddingRight: 10 }}>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center", padding: 4 }}>
              <Icon name="x" size={18} color="var(--text-3)" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* Search input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <Icon name="search" size={15} color="var(--text-3)" strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Hledat úkoly, projekty, tagy, poznámky…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: "var(--text)", fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", display: "flex", alignItems: "center", padding: 2 }}>
              <Icon name="x" size={13} color="var(--text-3)" strokeWidth={2} />
            </button>
          )}
          {!isMobile && <kbd style={{ fontSize: 12, color: "var(--text-3)", background: "var(--input)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>}
        </div>

        {/* Filter chips */}
        <div style={{ padding: "8px 14px 6px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {chipCategories.map(({ label, chips, type }) => (
            <div key={type} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600, marginRight: 2 }}>{label}:</span>
              {chips.map((chip) => {
                const isActive = activeChip === type && chipValue === chip.k;
                return (
                  <button
                    key={chip.k}
                    onClick={() => {
                      if (isActive) { setActiveChip(null); setChipValue(null); }
                      else { setActiveChip(type); setChipValue(chip.k); }
                    }}
                    style={{
                      padding: "3px 9px",
                      borderRadius: 20,
                      border: `1px solid ${isActive ? chip.color : "var(--border)"}`,
                      background: isActive ? chip.color + "20" : "transparent",
                      color: isActive ? chip.color : "var(--text-3)",
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      cursor: "pointer",
                      transition: "all .12s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ))}
          {(activeChip || chipValue) && (
            <button
              onClick={() => { setActiveChip(null); setChipValue(null); }}
              style={{ padding: "3px 8px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--text-3)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Icon name="x" size={10} color="var(--text-3)" strokeWidth={2} />
              Reset
            </button>
          )}
        </div>

        <div style={{ maxHeight: isMobile ? "52svh" : 340, overflowY: "auto", padding: "8px 0" }}>
          {items.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              Nic nenalezeno
            </div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div style={{ padding: "6px 16px 2px", fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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
                          padding: "8px 16px", border: "none", textAlign: "left", minHeight: 40,
                          background: isActive ? "var(--accent-soft)" : "transparent",
                          borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {item.tagColor ? (
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.tagColor, display: "block" }} />
                          ) : (
                            <Icon name={item.icon} size={14} color={isActive ? "var(--accent)" : "var(--text-2)"} strokeWidth={1.75} />
                          )}
                        </span>
                        <span style={{ flex: 1, fontSize: 13.5, color: isActive ? "var(--accent)" : "var(--text)", fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
                        {item.meta && !item.tagColor && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{item.meta}</span>}
                        {isActive && <kbd style={{ fontSize: 12, color: "var(--text-3)", background: "var(--input)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 5px" }}>↵</kbd>}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {!isMobile && (
        <div style={{ padding: "8px 16px", borderTop: "1px solid var(--border)", display: "flex", gap: 14, fontSize: 12, color: "var(--text-3)" }}>
          <span><kbd style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px" }}>↑↓</kbd> navigace</span>
          <span><kbd style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px" }}>↵</kbd> otevřít</span>
          <span><kbd style={{ background: "var(--input)", border: "1px solid var(--border)", borderRadius: 3, padding: "1px 4px" }}>Esc</kbd> zavřít</span>
        </div>
        )}
        {isMobile && <div style={{ height: "var(--safe-area-inset-bottom, 0px)" }} />}
      </div>
    </div>
  );
}
