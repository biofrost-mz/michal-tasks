import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import {
  mapTaskForAtlas,
  ProjectPill,
  PrioChip,
  TagPill,
  CLASS_TO_STATUS,
} from "../components/atlas/AtlasTaskCard.jsx";
import { STATUSES } from "../constants.js";
import { SectionLabel } from "../components/ui/index.js";
import { startOfToday, triggerConfettiBurst } from "../utils.js";
import QuickAdd from "../components/QuickAdd.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useTaskKeyboard } from "../hooks/useTaskKeyboard.js";
import { formatDateKey } from "../locale.js";
import SwipeTaskCard from "../components/SwipeTaskCard.jsx";
import { SkeletonCard } from "../components/Skeleton.jsx";

const CHIP_STATUSES = ["all", "active", "todo", "doing", "wait", "done"];
const STATUS_LABELS = {
  all: "Vše",
  active: "Aktivní",
  todo: "To do",
  doing: "Rozpracováno",
  wait: "Čekám",
  done: "Hotovo",
};

const DATE_FILTER_OPTIONS = [
  ["all", "Vše"],
  ["today", "Dnes"],
  ["soon", "Blížící se"],
  ["week", "Tento týden"],
  ["overdue", "Po termínu"],
  ["no-date", "Bez termínu"],
];

const PRIORITY_FILTER_OPTIONS = [
  ["all", "Vše"],
  ["high", "Vysoká"],
  ["medium", "Střední"],
  ["low", "Nízká"],
];

const SORT_OPTIONS = [
  ["default", "Výchozí pořadí"],
  ["newest", "Nejnovější úpravy"],
  ["due-asc", "Termín ↑"],
  ["priority", "Priorita ↓"],
];

function lastChangedStamp(item) {
  return item?.updatedAt ?? item?.createdAt ?? 0;
}

function mobileFilterButtonStyle(active, color = "var(--accent)") {
  return {
    padding: "8px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    border: `1.5px solid ${active ? color : "var(--border-soft)"}`,
    background: active ? (color === "var(--accent)" ? "var(--accent-soft)" : `${color}18`) : "transparent",
    color: active ? color : "var(--text-2)",
    cursor: "pointer",
    minHeight: 40,
  };
}

function statusColor(statusClass) {
  if (statusClass === "active") return "var(--accent)";
  return STATUSES[CLASS_TO_STATUS[statusClass]]?.color;
}

function statusLabel(statusClass) {
  const realKey = CLASS_TO_STATUS[statusClass] || statusClass;
  return STATUSES[realKey]?.label ?? STATUS_LABELS[statusClass] ?? "To do";
}

function InlineEditInput({ taskId, value, onChange, onCommit, onCancel, style }) {
  return (
    <input
      autoFocus
      className="detail-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onCommit(taskId); }
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => onCommit(taskId)}
      onClick={(e) => e.stopPropagation()}
      style={style}
    />
  );
}

export function ViewToggle({ view, setView, modes }) {
  const items = modes || [
    { k: "cards", label: "Karty" },
    { k: "table", label: "Tabulka" },
  ];

  return (
    <div className="row">
      {items.map((item) => (
        <button key={item.k} className={`btn ${view === item.k ? "primary" : ""}`} onClick={() => { setView(item.k); try { sessionStorage.setItem("tp:view", item.k); } catch {} }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function FilterBtn({ label, active, color, onClick }) {
  return (
    <span
      className={`chip ${active ? "active" : ""}`}
      onClick={onClick}
      style={color ? { borderColor: active ? color : undefined, color: active ? color : undefined } : undefined}
    >
      {label}
    </span>
  );
}

export function ListView() {
  return null;
}

export default function TasksPage() {
  const confirm = useConfirm();
  const {
    tasks,
    projects,
    tags,
    loaded,
    updateTask,
    deleteTask,
    addTask,
    setTaskDetail,
    search,
    dashFilter,
    setDashFilter,
    tasksPageFilter,
    setTasksPageFilter,
    isMobile,
  } = useApp();

  const [desktopCtx, setDesktopCtx] = useState(null); // { task, x, y }
  const longPressRef = useRef(null);

  const [view, setView] = useState(() => isMobile ? "cards" : (sessionStorage.getItem("tp:view") || "table"));
  const [statusFilter, setStatusFilterRaw] = useState(() => tasksPageFilter || sessionStorage.getItem("tp:status") || "active");
  const [projectFilter, setProjectFilterRaw] = useState(() => sessionStorage.getItem("tp:project") || "all");
  const [priorityFilter, setPriorityFilterRaw] = useState(() => sessionStorage.getItem("tp:priority") || "all");
  const [tagFilter, setTagFilterRaw] = useState(() => sessionStorage.getItem("tp:tag") || "all");
  const [dateFilter, setDateFilterRaw] = useState(() => sessionStorage.getItem("tp:date") || "all");
  const [sortBy, setSortByRaw] = useState(() => sessionStorage.getItem("tp:sort") || "default");

  const setStatusFilter = (v) => { setStatusFilterRaw(v); try { sessionStorage.setItem("tp:status", v); } catch {} };
  const setProjectFilter = (v) => { setProjectFilterRaw(v); try { sessionStorage.setItem("tp:project", v); } catch {} };
  const setPriorityFilter = (v) => { setPriorityFilterRaw(v); try { sessionStorage.setItem("tp:priority", v); } catch {} };
  const setTagFilter = (v) => { setTagFilterRaw(v); try { sessionStorage.setItem("tp:tag", v); } catch {} };
  const setDateFilter = (v) => { setDateFilterRaw(v); try { sessionStorage.setItem("tp:date", v); } catch {} };
  const setSortBy = (v) => { setSortByRaw(v); try { sessionStorage.setItem("tp:sort", v); } catch {} };

  useEffect(() => {
    if (tasksPageFilter && tasksPageFilter !== "all" && tasksPageFilter !== "active") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusFilter(tasksPageFilter);
      setTasksPageFilter("active");
    }
  }, [tasksPageFilter, setTasksPageFilter]);

  const today = useMemo(() => startOfToday(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const weekEndKey = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 6);
    return formatDateKey(d);
  }, [today]);
  const soonEndKey = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 2); // today + 2 days = 3 days total (today, tomorrow, day after)
    return formatDateKey(d);
  }, [today]);
  const tomorrowKey = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 1); return formatDateKey(d); }, [today]);
  const thisWeekEndKey = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 6); return formatDateKey(d); }, [today]);
  const nextWeekEndKey = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 13); return formatDateKey(d); }, [today]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsById = useMemo(() => new Map(tags.map((tg) => [tg.id, tg])), [tags]);
  const recentProjects = useMemo(
    () => [...projects]
      .filter((p) => p.status !== "deleted")
      .sort((a, b) => lastChangedStamp(b) - lastChangedStamp(a))
      .slice(0, 5),
    [projects]
  );
  const recentTags = useMemo(
    () => [...tags]
      .sort((a, b) => lastChangedStamp(b) - lastChangedStamp(a))
      .slice(0, 5),
    [tags]
  );

  const mappedTasks = useMemo(
    () => tasks.map((t) => mapTaskForAtlas(t, projectsById, tagsById, today)),
    [tasks, projectsById, tagsById, today]
  );

  useEffect(() => {
    if (!dashFilter || typeof dashFilter !== "object") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dashFilter.status) setStatusFilter(dashFilter.status);
    if (dashFilter.priority) setPriorityFilter(dashFilter.priority);
    if (dashFilter.projectId) setProjectFilter(dashFilter.projectId);
    if (dashFilter.tagId) setTagFilter(dashFilter.tagId);
    if (dashFilter.date) setDateFilter(dashFilter.date);
    if (dashFilter.sortBy) setSortBy(dashFilter.sortBy);
    setDashFilter(null);
  }, [dashFilter, setDashFilter]);

  const baseFiltered = useMemo(() => {
    let list = mappedTasks;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s) || t.tags.join(" ").toLowerCase().includes(s));
    }

    if (projectFilter !== "all") {
      if (projectFilter === "inbox") list = list.filter((t) => !t.project);
      else list = list.filter((t) => t.project === projectFilter);
    }

    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    if (tagFilter !== "all") {
      list = list.filter((t) => t.tagIds.includes(tagFilter));
    }

    if (dateFilter === "today") {
      list = list.filter((t) => t.dueDate === todayKey);
    } else if (dateFilter === "soon") {
      list = list.filter((t) => t.dueDate && t.dueDate >= todayKey && t.dueDate <= soonEndKey && t.status !== "done");
    } else if (dateFilter === "week") {
      list = list.filter((t) => t.dueDate && t.dueDate >= todayKey && t.dueDate <= weekEndKey);
    } else if (dateFilter === "overdue") {
      list = list.filter((t) => t.dueDate && t.dueDate < todayKey && t.status !== "done");
    } else if (dateFilter === "no-date") {
      list = list.filter((t) => !t.dueDate);
    }

    return list;
  }, [mappedTasks, search, projectFilter, priorityFilter, tagFilter, dateFilter, todayKey, weekEndKey, soonEndKey]);

  const filtered = useMemo(() => {
    let list = baseFiltered;

    if (statusFilter === "all" || statusFilter === "active") {
      list = list.filter((t) => t.status !== "done");
    } else if (statusFilter !== "all") {
      const realStatus = CLASS_TO_STATUS[statusFilter] || statusFilter;
      list = list.filter((t) => t.status === realStatus);
    }

    if (sortBy === "newest") {
      list = [...list].sort((a, b) => {
        const byUpdated = (b.updatedAt || 0) - (a.updatedAt || 0);
        if (byUpdated) return byUpdated;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    } else if (sortBy === "due-asc") {
      list = [...list].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    } else if (sortBy === "priority") {
      const ORDER = { high: 0, medium: 1, low: 2, null: 3 };
      list = [...list].sort((a, b) => (ORDER[a.priority] ?? 3) - (ORDER[b.priority] ?? 3));
    }

    return list;
  }, [baseFiltered, statusFilter, sortBy]);

  const activeFilterCount = [priorityFilter, tagFilter, projectFilter, dateFilter].filter((f) => f !== "all").length + (sortBy !== "default" ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;
  const resetFilters = useCallback(() => {
    setPriorityFilter("all");
    setTagFilter("all");
    setProjectFilter("all");
    setDateFilter("all");
    setSortBy("default");
  }, []);

  const doneCount = mappedTasks.filter((t) => t.status === "done").length;
  const activeCount = mappedTasks.length - doneCount;

  const weekGroups = useMemo(() => {
    const buckets = [
      { id: "overdue",   label: "Po termínu",    color: "#ef4444", items: [] },
      { id: "today",     label: "Dnes",           color: "#f59e0b", items: [] },
      { id: "tomorrow",  label: "Zítra",          color: "#3b82f6", items: [] },
      { id: "thisweek",  label: "Tento týden",    color: "var(--accent)", items: [] },
      { id: "nextweek",  label: "Příští týden",   color: "var(--text-3)", items: [] },
      { id: "later",     label: "Pozdější",       color: "var(--text-3)", items: [] },
      { id: "nodate",    label: "Bez termínu",    color: "var(--text-3)", items: [] },
    ];
    for (const t of filtered) {
      if (!t.dueDate) { buckets[6].items.push(t); continue; }
      if (t.dueDate < todayKey) { buckets[0].items.push(t); continue; }
      if (t.dueDate === todayKey) { buckets[1].items.push(t); continue; }
      if (t.dueDate === tomorrowKey) { buckets[2].items.push(t); continue; }
      if (t.dueDate <= thisWeekEndKey) { buckets[3].items.push(t); continue; }
      if (t.dueDate <= nextWeekEndKey) { buckets[4].items.push(t); continue; }
      buckets[5].items.push(t);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [filtered, todayKey, tomorrowKey, thisWeekEndKey, nextWeekEndKey]);

  const [focusedId, setFocusedId] = useState(null);

  const setStatus = useCallback((id, status, options) => updateTask(id, { status }, options), [updateTask]);
  const toggleStar = useCallback((id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    updateTask(id, { starred: !current.starred });
  }, [tasks, updateTask]);

  useTaskKeyboard({
    tasks: filtered,
    focusedId,
    setFocusedId,
    onOpen: setTaskDetail,
    onStatusChange: setStatus,
    onStar: toggleStar,
  });

  const prevTasksLenRef = useRef(tasks.length);
  const [newestTaskId, setNewestTaskId] = useState(null);

  useEffect(() => {
    if (tasks.length > prevTasksLenRef.current) {
      const newId = tasks[tasks.length - 1]?.id ?? null;
      setTimeout(() => setNewestTaskId(newId), 0);
      const timer = setTimeout(() => setNewestTaskId(null), 400);
      prevTasksLenRef.current = tasks.length;
      return () => clearTimeout(timer);
    }
    prevTasksLenRef.current = tasks.length;
  }, [tasks]);

  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditVal, setInlineEditVal] = useState("");
  const origEditRef = useRef("");

  const startInlineEdit = useCallback((t, e) => {
    e.stopPropagation();
    origEditRef.current = t.title;
    setInlineEditId(t.id);
    setInlineEditVal(t.title);
  }, []);

  const commitInlineEdit = useCallback((id) => {
    const val = inlineEditVal.trim();
    if (val && val !== origEditRef.current) updateTask(id, { title: val });
    setInlineEditId(null);
  }, [inlineEditVal, updateTask]);

  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const toggleSelect = useCallback((id, e) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(filtered.map((t) => t.id)));
  }, [filtered]);

  const clearSelected = useCallback(() => { setSelected(new Set()); setSelectMode(false); }, []);

  const bulkDone = useCallback(() => {
    selected.forEach((id) => updateTask(id, { status: "done" }));
    clearSelected();
  }, [selected, updateTask, clearSelected]);

  const bulkDelete = useCallback(() => {
    selected.forEach((id) => deleteTask(id));
    clearSelected();
  }, [selected, deleteTask, clearSelected]);

  const [bulkPrioOpen, setBulkPrioOpen] = useState(false);
  const [bulkProjOpen, setBulkProjOpen] = useState(false);

  const bulkSetPriority = useCallback((priority) => {
    selected.forEach((id) => updateTask(id, { priority }));
    setBulkPrioOpen(false);
  }, [selected, updateTask]);

  const bulkSetProject = useCallback((projectId) => {
    selected.forEach((id) => updateTask(id, { projectId: projectId || null }));
    setBulkProjOpen(false);
  }, [selected, updateTask]);

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{tasks.length} úkolů celkem · {activeCount} aktivních · {doneCount} hotových</div>
          <h1 className="ph-title">Úkoly</h1>
          <div className="ph-sub"><span>poslední úprava: dnes</span></div>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className={`btn ${selectMode ? "primary" : ""}`}
              onClick={() => { setSelectMode((v) => !v); if (selectMode) clearSelected(); }}
              style={{ fontSize: 12 }}
            >
              {selectMode ? "Zrušit výběr" : "Vybrat"}
            </button>
            <ViewToggle
              view={view}
              setView={setView}
              modes={[
                { k: "cards", label: "Karty" },
                { k: "table", label: "Tabulka" },
                { k: "week",  label: "Týden" },
              ]}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 18 }}>
        <QuickAdd />
      </div>

      <div className="chips">
        {CHIP_STATUSES.map((k) => {
          const chipElements = [
            <span key={k} className={`chip ${statusFilter === k ? "active" : ""}`} onClick={() => setStatusFilter(k)}>
              {k === "all" ? (
                <span className="chip-dot" style={{ background: "var(--text-2)" }} />
              ) : k === "active" ? (
                <span className="chip-dot" style={{ background: "var(--accent)" }} />
              ) : (
                <span className="chip-dot" style={{ background: statusColor(k) }} />
              )}
              {STATUS_LABELS[k]}
              <span className="chip-count">
                {k === "all"
                  ? baseFiltered.length
                  : k === "active"
                  ? baseFiltered.filter((t) => t.status !== "done").length
                  : baseFiltered.filter((t) => t.statusClass === k).length}
              </span>
            </span>
          ];

          if (k === "active") {
            const soonCount = mappedTasks.filter((t) => t.dueDate && t.dueDate >= todayKey && t.dueDate <= soonEndKey && t.status !== "done").length;
            chipElements.push(
              <span
                key="soon-quick"
                className={`chip ${dateFilter === "soon" ? "active" : ""}`}
                onClick={() => setDateFilter(dateFilter === "soon" ? "all" : "soon")}
                style={dateFilter === "soon" ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "var(--accent)" } : undefined}
              >
                <span className="chip-dot" style={{ background: "var(--orange)" }} />
                Blížící se
                <span className="chip-count">{soonCount}</span>
              </span>
            );
          }

          return chipElements;
        })}
        {!isMobile && (
          <>
            <span className="chips-div" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}
            >
              <option value="all">Všechny termíny</option>
              <option value="today">Dnes</option>
              <option value="soon">Blížící se termín</option>
              <option value="week">Tento týden</option>
              <option value="overdue">Po termínu</option>
              <option value="no-date">Bez termínu</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}
            >
              {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}
            >
              <option value="all">Všechny priority</option>
              <option value="high">Vysoká</option>
              <option value="medium">Střední</option>
              <option value="low">Nízká</option>
            </select>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}
            >
              <option value="all">Všechny tagy</option>
              {tags.map((tg) => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
            </select>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 999, padding: "7px 12px", fontSize: 12.5 }}
            >
              <option value="all">Všechny projekty</option>
              <option value="inbox">Inbox</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </>
        )}
        {!isMobile && <span className="chips-sep" />}
        {!isMobile && <span className="chip">{filtered.length} položek</span>}

        {/* Mobilní filtr + výběr tlačítko */}
        {isMobile && (
          <>
            <span
              className={`chip ${selectMode ? "active" : ""}`}
              onClick={() => { setSelectMode((v) => !v); if (selectMode) clearSelected(); }}
              style={{ flexShrink: 0 }}
            >
              ☑ Vybrat
            </span>
            <span
              className={`chip ${hasActiveFilters ? "active" : ""}`}
              onClick={() => setFilterDrawerOpen(true)}
              style={{ marginLeft: "auto", flexShrink: 0 }}
            >
              <span style={{ fontSize: 13 }}>⚙</span>
              Filtrovat
              {hasActiveFilters && <span className="chip-count">{activeFilterCount}</span>}
            </span>
          </>
        )}
      </div>

      {/* Mobilní filter drawer */}
      {isMobile && filterDrawerOpen && (
        <div
          onClick={() => setFilterDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", overscrollBehavior: "contain" }}
        >
          <div
            className="su"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "var(--surface)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "calc(100dvh - 64px - env(safe-area-inset-top, 0px))",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}
          >
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 20px 12px", borderBottom: "1px solid var(--border-soft)" }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Filtry</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    Resetovat
                  </button>
                )}
                <button
                  onClick={() => setFilterDrawerOpen(false)}
                  style={{ background: "var(--surface-3)", border: "none", color: "var(--text-2)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", minHeight: 0, padding: "16px 20px 18px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <SectionLabel style={{ marginBottom: 10 }}>
                  Řazení
                </SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {SORT_OPTIONS.map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setSortBy(v)}
                      style={mobileFilterButtonStyle(sortBy === v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 10 }}>
                  Termín
                </SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DATE_FILTER_OPTIONS.map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setDateFilter(v)}
                      style={mobileFilterButtonStyle(dateFilter === v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel style={{ marginBottom: 10 }}>
                  Priorita
                </SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PRIORITY_FILTER_OPTIONS.map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setPriorityFilter(v)}
                      style={mobileFilterButtonStyle(priorityFilter === v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {recentProjects.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 10 }}>
                    Naposledy upravené projekty
                  </SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {recentProjects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProjectFilter(p.id)}
                        style={mobileFilterButtonStyle(projectFilter === p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {recentTags.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 10 }}>
                    Naposledy upravené tagy
                  </SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {recentTags.map((tg) => (
                      <button
                        key={tg.id}
                        onClick={() => setTagFilter(tg.id)}
                        style={mobileFilterButtonStyle(tagFilter === tg.id, tg.color)}
                      >
                        {tg.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {projects.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 10 }}>
                    Projekt
                  </SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[{ id: "all", name: "Vše" }, { id: "inbox", name: "Inbox" }, ...projects].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setProjectFilter(p.id)}
                        style={mobileFilterButtonStyle(projectFilter === p.id)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <SectionLabel style={{ marginBottom: 10 }}>
                    Tag
                  </SectionLabel>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setTagFilter("all")}
                      style={mobileFilterButtonStyle(tagFilter === "all")}
                    >
                      Vše
                    </button>
                    {tags.map((tg) => (
                      <button
                        key={tg.id}
                        onClick={() => setTagFilter(tg.id)}
                        style={mobileFilterButtonStyle(tagFilter === tg.id, tg.color)}
                      >
                        {tg.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, padding: "12px 20px calc(12px + var(--safe-area-inset-bottom, 0px))", borderTop: "1px solid var(--border-soft)", background: "var(--surface)" }}>
              <button
                onClick={() => setFilterDrawerOpen(false)}
                style={{
                  width: "100%",
                  padding: "13px", borderRadius: 12, fontSize: 14, fontWeight: 700,
                  border: "none", background: "var(--accent)", color: "#fff",
                  cursor: "pointer",
                }}
              >
                Zobrazit {filtered.length} úkolů
              </button>
            </div>
          </div>
        </div>
      )}

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 4px" }}>
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        tasks.length === 0 ? (
          <EmptyState
            type="tasks"
            title="Zatím žádné úkoly"
            description="Vytvoř svůj první úkol pomocí pole výše nebo klávesové zkratky."
            action={() => window.dispatchEvent(new CustomEvent("focusQuickAdd"))}
            actionLabel="Vytvořit první úkol"
          />
        ) : statusFilter === "active" && activeCount === 0 ? (
          <EmptyState
            type="done"
            title="Vše hotovo!"
            description="Užij si chvíli klidu."
          />
        ) : (
          <EmptyState
            type="filter"
            title="Žádné výsledky"
            description="Žádný úkol neodpovídá zvoleným filtrům. Zkus změnit nebo resetovat filtry."
          />
        )
      ) : view === "week" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {weekGroups.length === 0 ? (
            <EmptyState type="filter" title="Žádné výsledky" description="Žádný úkol neodpovídá zvoleným filtrům." />
          ) : weekGroups.map((group) => (
            <div key={group.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: group.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {group.label}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--mono)" }}>{group.items.length}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border-soft)" }} />
              </div>
              <div className="tcards">
                {group.items.map((t) => {
                  const isSelected = selected.has(t.id);
                  return (
                    <div
                      key={t.id}
                      className={`tcard ${t.statusClass} ${t.overdue ? "alert" : ""}${isSelected ? " selected" : ""}`}
                      onClick={(e) => {
                        if (selectMode) { toggleSelect(t.id, e); return; }
                        setFocusedId(t.id); setTaskDetail(t.id);
                      }}
                      style={{
                        ...(isSelected ? { outline: "2px solid var(--accent)", outlineOffset: -1 } : {}),
                      }}
                    >
                      {selectMode && (
                        <input type="checkbox" checked={isSelected} onChange={(e) => toggleSelect(t.id, e)} onClick={(e) => e.stopPropagation()}
                          style={{ flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)", marginRight: 2 }} />
                      )}
                      <div className="tcard-state" onClick={(e) => { e.stopPropagation(); const ns = t.status === "done" ? "todo" : "done"; if (ns === "done") triggerConfettiBurst(e); setStatus(t.id, ns); }} title="Toggle hotovo" />
                      <div className="tcard-body">
                        <div className="tcard-title">{t.title}</div>
                        {t.desc ? <div className="tcard-desc">{t.desc}</div> : null}
                        <div className="tcard-meta">
                          <ProjectPill projectId={t.project} projectsById={projectsById} />
                          <PrioChip priority={t.priority} />
                          {t.due ? <span className={`due ${t.overdue ? "overdue" : ""}`}>{t.due}</span> : null}
                          {t.recurrence ? <span title="Opakující se" style={{ fontSize: 11, color: "var(--text-3)" }}>↺</span> : null}
                          {(t.tagObjects || []).map((tg) => <TagPill key={tg.id} name={tg.name} color={tg.color} />)}
                        </div>
                      </div>
                      <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
                        <div className="stepper">
                          {["todo", "doing", "wait", "done"].map((k) => (
                            <button key={k} className={t.statusClass === k ? `cur ${k}` : ""} onClick={(e) => { e.stopPropagation(); setStatus(t.id, CLASS_TO_STATUS[k]); }}>
                              {k === "todo" ? "Todo" : k === "doing" ? "Doing" : k === "wait" ? "Wait" : "Done"}
                            </button>
                          ))}
                        </div>
                        <button className={`icon-btn star ${t.starred ? "on" : ""}`} onClick={() => toggleStar(t.id)} title="Top úkol">★</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : view === "table" ? (
        <div className="ttable">
          <div className="ttable-row head">
            <div />
            <div className="head-sort">Název ↑</div>
            <div className="head-sort">Status</div>
            <div className="head-sort">Priorita</div>
            <div className="head-sort">Projekt</div>
            <div className="head-sort">Termín</div>
            <div className="head-sort">Tagy</div>
          </div>

          {filtered.map((t) => {
            const isFocused = focusedId === t.id;
            return (
              <div
                key={t.id}
                className="ttable-row"
                onClick={() => { setFocusedId(t.id); setTaskDetail(t.id); }}
                onMouseEnter={() => { if (focusedId !== t.id) setFocusedId(t.id); }}
                style={isFocused ? { outline: "1px solid var(--accent)", outlineOffset: -1, borderRadius: 8 } : undefined}
              >
                <input
                  type="checkbox"
                  checked={selected.has(t.id)}
                  onChange={(e) => toggleSelect(t.id, e)}
                  onClick={(e) => e.stopPropagation()}
                />
                {inlineEditId === t.id ? (
                  <InlineEditInput
                    taskId={t.id}
                    value={inlineEditVal}
                    onChange={setInlineEditVal}
                    onCommit={commitInlineEdit}
                    onCancel={() => setInlineEditId(null)}
                    style={{ fontWeight: 600 }}
                  />
                ) : (
                  <div
                    className={`tt-name ${t.status === "done" ? "done" : ""}`}
                    onDoubleClick={(e) => startInlineEdit(t, e)}
                    title="Dvojklik pro úpravu"
                  >{t.title}</div>
                )}
                <div>
                  <span className={`tt-st ${t.statusClass}`}>
                    <span className="d" /> {statusLabel(t.statusClass)}
                  </span>
                </div>
                <div><PrioChip priority={t.priority} /></div>
                <div><ProjectPill projectId={t.project} projectsById={projectsById} /></div>
                <div><span className={`due ${t.overdue ? "overdue" : ""}`}>{t.due || "—"}</span></div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {(t.tagObjects || []).map((tg) => <TagPill key={tg.id} name={tg.name} color={tg.color} />)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tcards" style={{ marginTop: 8 }}>
          {filtered.map((t, idx) => {
            const isFocused = focusedId === t.id;
            const isSelected = selected.has(t.id);
            const cardInner = (
              <>
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => toggleSelect(t.id, e)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ flexShrink: 0, width: 16, height: 16, cursor: "pointer", accentColor: "var(--accent)", marginRight: 2 }}
                  />
                )}
                <div className="tcard-state" onClick={(e) => {
                   e.stopPropagation();
                   const nextStatus = t.status === "done" ? "todo" : "done";
                   if (nextStatus === "done") triggerConfettiBurst(e);
                   setStatus(t.id, nextStatus);
                 }} title="Toggle hotovo" />
                <div className="tcard-body">
                  {inlineEditId === t.id ? (
                    <InlineEditInput
                      taskId={t.id}
                      value={inlineEditVal}
                      onChange={setInlineEditVal}
                      onCommit={commitInlineEdit}
                      onCancel={() => setInlineEditId(null)}
                      style={{ width: "100%", fontWeight: 600, fontSize: 14 }}
                    />
                  ) : (
                    <div
                      className="tcard-title"
                      onDoubleClick={(e) => startInlineEdit(t, e)}
                      title="Dvojklik pro úpravu"
                    >{t.title}</div>
                  )}
                  {t.desc ? <div className="tcard-desc">{t.desc}</div> : null}
                  <div className="tcard-meta">
                    <ProjectPill projectId={t.project} projectsById={projectsById} />
                    <PrioChip priority={t.priority} />
                    {t.due ? <span className={`due ${t.overdue ? "overdue" : ""}`}>{t.due}</span> : null}
                    {t.hasSubtasks > 0 ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: t.doneSubtasks === t.hasSubtasks ? "var(--green)" : "var(--text-3)" }}>≡ {t.doneSubtasks}/{t.hasSubtasks}</span> : null}
                    {t.recurrence ? <span title="Opakující se úkol" style={{ fontSize: 11, color: "var(--text-3)" }}>↺</span> : null}
                    {(t.tagObjects || []).map((tg) => <TagPill key={tg.id} name={tg.name} color={tg.color} />)}
                  </div>
                </div>
                <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
                  <div className="stepper">
                    {["todo", "doing", "wait", "done"].map((k) => (
                      <button key={k} className={t.statusClass === k ? `cur ${k}` : ""} onClick={(e) => { e.stopPropagation(); setStatus(t.id, CLASS_TO_STATUS[k]); }}>
                        {k === "todo" ? "Todo" : k === "doing" ? "Doing" : k === "wait" ? "Wait" : "Done"}
                      </button>
                    ))}
                  </div>
                  <button className={`icon-btn star ${t.starred ? "on" : ""}`} onClick={() => toggleStar(t.id)} title="Top úkol">★</button>
                </div>
              </>
            );

            if (isMobile) {
              return (
                <SwipeTaskCard
                  key={t.id}
                  task={t}
                  onStatusChange={setStatus}
                  onClick={() => { setFocusedId(t.id); setTaskDetail(t.id); }}
                  onMouseEnter={() => { if (focusedId !== t.id) setFocusedId(t.id); }}
                  focused={isFocused}
                  hintTarget={idx === 0}
                >
                  <div
                    className={`tcard ${t.statusClass} ${t.overdue ? "alert" : ""} list-item-enter${t.id === newestTaskId ? " task-slide-in" : ""}${isSelected ? " selected" : ""}`}
                    style={{ "--item-index": Math.min(idx, 7), ...(t.id === newestTaskId ? { animationDelay: "0ms" } : {}) }}
                  >
                    {cardInner}
                  </div>
                </SwipeTaskCard>
              );
            }

            return (
              <div
                key={t.id}
                className={`tcard ${t.statusClass} ${t.overdue ? "alert" : ""} list-item-enter${t.id === newestTaskId ? " task-slide-in" : ""}${isSelected ? " selected" : ""}`}
                onClick={(e) => {
                  if (longPressRef.current) return;
                  if (selectMode) { toggleSelect(t.id, e); return; }
                  setFocusedId(t.id); setTaskDetail(t.id);
                }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  const { clientX, clientY } = e;
                  longPressRef.current = setTimeout(() => {
                    longPressRef.current = "fired";
                    setDesktopCtx({ task: t, x: clientX, y: clientY });
                  }, 500);
                }}
                onMouseUp={() => { if (longPressRef.current !== "fired") clearTimeout(longPressRef.current); longPressRef.current = null; }}
                onMouseLeave={() => { if (longPressRef.current !== "fired") clearTimeout(longPressRef.current); if (longPressRef.current !== "fired") longPressRef.current = null; }}
                onMouseEnter={() => { if (focusedId !== t.id) setFocusedId(t.id); }}
                style={{
                  "--item-index": Math.min(idx, 7),
                  ...(t.id === newestTaskId ? { animationDelay: "0ms" } : {}),
                  ...(isFocused && !selectMode ? { outline: "1px solid var(--accent)", outlineOffset: -1 } : {}),
                  ...(isSelected ? { outline: "2px solid var(--accent)", outlineOffset: -1 } : {}),
                }}
              >
                {cardInner}
              </div>
            );
          })}
          {filtered.length > 0 && !isMobile && (
            <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 11.5, color: "var(--text-4)", fontFamily: "var(--mono)" }}>
              J/K navigace · Enter detail · D hotovo · S hvězda
            </div>
          )}
        </div>
      )}

      {/* Bulk action floating toolbar */}
      {(selectMode || selected.size > 0) && (
        <div style={{
          position: "fixed",
          bottom: isMobile ? "calc(var(--bottom-nav-height, 60px) + 12px)" : 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          animation: "pop .2s ease-out",
        }}>
          {/* Priority dropdown */}
          {bulkPrioOpen && (
            <div style={{
              background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
              boxShadow: "var(--shadow)", padding: "6px", display: "flex", flexDirection: "column", gap: 2, minWidth: 160,
            }}>
              {[
                { value: "high", label: "🔴 Vysoká" },
                { value: "medium", label: "🟡 Střední" },
                { value: "low", label: "🔵 Nízká" },
                { value: null, label: "— Žádná" },
              ].map(({ value, label }) => (
                <button key={String(value)} onClick={() => bulkSetPriority(value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-2)", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-h)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >{label}</button>
              ))}
            </div>
          )}
          {/* Project dropdown */}
          {bulkProjOpen && (
            <div style={{
              background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12,
              boxShadow: "var(--shadow)", padding: "6px", display: "flex", flexDirection: "column", gap: 2, minWidth: 180, maxHeight: 240, overflowY: "auto",
            }}>
              <button onClick={() => bulkSetProject(null)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-3)", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-h)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >— Bez projektu</button>
              {projects.map((p) => (
                <button key={p.id} onClick={() => bulkSetProject(p.id)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", color: "var(--text-2)", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-h)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >{p.name}</button>
              ))}
            </div>
          )}
          {/* Main pill */}
          <div style={{
            background: "var(--surface)",
            border: `1px solid ${selected.size > 0 ? "var(--accent)" : "var(--border)"}`,
            borderRadius: "var(--r-pill, 999px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            whiteSpace: "nowrap",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: selected.size > 0 ? "var(--accent)" : "var(--text-3)", paddingRight: 8, borderRight: "1px solid var(--border-soft)" }}>
              {selected.size > 0 ? `${selected.size} vybráno` : "Výběr"}
            </span>
            <button className="btn" onClick={selectAll} style={{ fontSize: 12 }}>Vše</button>
            {selected.size > 0 && (
              <>
                <button className="btn primary" onClick={bulkDone} style={{ fontSize: 12 }}>✓ Hotovo</button>
                <button
                  className={`btn ${bulkPrioOpen ? "primary" : ""}`}
                  onClick={() => { setBulkPrioOpen((v) => !v); setBulkProjOpen(false); }}
                  style={{ fontSize: 12 }}
                >Priorita ▾</button>
                <button
                  className={`btn ${bulkProjOpen ? "primary" : ""}`}
                  onClick={() => { setBulkProjOpen((v) => !v); setBulkPrioOpen(false); }}
                  style={{ fontSize: 12 }}
                >Projekt ▾</button>
                <button className="btn danger" onClick={async () => {
                  if (await confirm(`Smazat ${selected.size} úkolů?`)) bulkDelete();
                }} style={{ fontSize: 12 }}>Smazat</button>
              </>
            )}
            <button className="icon-btn" onClick={clearSelected} style={{ marginLeft: 4 }}>✕</button>
          </div>
        </div>
      )}

      {desktopCtx && createPortal(
        <>
          <div onClick={() => setDesktopCtx(null)} style={{ position: "fixed", inset: 0, zIndex: 8000 }} />
          <div
            style={{
              position: "fixed",
              left: Math.min(desktopCtx.x, window.innerWidth - 200),
              top: Math.min(desktopCtx.y, window.innerHeight - 260),
              zIndex: 8001,
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
              padding: "6px",
              minWidth: 190,
              animation: "pop .15s ease-out",
            }}
          >
            {[
              { label: "Otevřít detail", icon: "external-link", action: () => { setTaskDetail(desktopCtx.task.id); setDesktopCtx(null); } },
              { label: desktopCtx.task.status === "done" ? "Označit jako aktivní" : "Označit jako hotové", icon: "check-circle", action: () => { setStatus(desktopCtx.task.id, desktopCtx.task.status === "done" ? "todo" : "done"); setDesktopCtx(null); } },
              { label: desktopCtx.task.starred ? "Odebrat z TOP" : "Přidat do TOP", icon: "star", action: () => { updateTask(desktopCtx.task.id, { starred: !desktopCtx.task.starred }); setDesktopCtx(null); } },
              { label: "Duplikovat", icon: "copy", action: () => { const copy = addTask({ title: `Kopie: ${desktopCtx.task.title}`, status: "todo", priority: desktopCtx.task.priority, projectId: desktopCtx.task.projectId, tagIds: desktopCtx.task.tagIds || [] }); if (copy?.id) setTaskDetail(copy.id); setDesktopCtx(null); } },
              { divider: true },
              { label: "Smazat", icon: "trash-2", danger: true, action: async () => { if (await confirm("Smazat úkol?")) { deleteTask(desktopCtx.task.id); } setDesktopCtx(null); } },
            ].map((item, i) => item.divider ? (
              <div key={i} style={{ height: 1, background: "var(--border-soft)", margin: "4px 0" }} />
            ) : (
              <button
                key={i}
                onClick={item.action}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 8, border: "none",
                  background: "transparent", cursor: "pointer",
                  color: item.danger ? "#ef4444" : "var(--text)",
                  fontSize: 13, fontWeight: 500, textAlign: "left",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = item.danger ? "rgba(239,68,68,0.1)" : "var(--surface-2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
