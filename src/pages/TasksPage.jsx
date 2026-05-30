import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import {
  mapTaskForAtlas,
  ProjectPill,
  PrioChip,
  CLASS_TO_STATUS,
} from "../components/atlas/AtlasTaskCard.jsx";
import { STATUSES } from "../constants.js";
import { startOfToday } from "../utils.js";
import QuickAdd from "../components/QuickAdd.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { useTaskKeyboard } from "../hooks/useTaskKeyboard.js";

const CHIP_STATUSES = ["all", "todo", "doing", "wait", "done"];
const STATUS_LABELS = {
  all: "Vše",
  todo: "To do",
  doing: "Rozpracováno",
  wait: "Čekám",
  done: "Hotovo",
};


function statusColor(statusClass) {
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
        <button key={item.k} className={`btn ${view === item.k ? "primary" : ""}`} onClick={() => setView(item.k)}>
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
    addTask,
    updateTask,
    deleteTask,
    setTaskDetail,
    search,
    tasksPageFilter,
    setTasksPageFilter,
  } = useApp();

  const [view, setView] = useState("table");
  const [statusFilter, setStatusFilter] = useState(() => tasksPageFilter || "all");

  useEffect(() => {
    if (tasksPageFilter && tasksPageFilter !== "all") {
      setStatusFilter(tasksPageFilter);
      setTasksPageFilter("all");
    }
  }, [tasksPageFilter, setTasksPageFilter]);
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [quickText, setQuickText] = useState("");

  const today = startOfToday();
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsById = useMemo(() => new Map(tags.map((tg) => [tg.id, tg])), [tags]);

  const mappedTasks = useMemo(
    () => tasks.map((t) => mapTaskForAtlas(t, projectsById, tagsById, today)),
    [tasks, projectsById, tagsById, today]
  );

  const filtered = useMemo(() => {
    let list = mappedTasks;

    if (search) {
      const s = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(s) || t.desc.toLowerCase().includes(s) || t.tags.join(" ").toLowerCase().includes(s));
    }

    if (statusFilter !== "all") {
      const realStatus = CLASS_TO_STATUS[statusFilter] || statusFilter;
      list = list.filter((t) => t.status === realStatus);
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

    return list;
  }, [mappedTasks, search, statusFilter, projectFilter, priorityFilter, tagFilter, tasks]);

  const doneCount = mappedTasks.filter((t) => t.status === "done").length;
  const activeCount = mappedTasks.length - doneCount;

  const onQuickAdd = (e) => {
    if (e.key !== "Enter") return;
    const title = quickText.trim();
    if (!title) return;
    addTask({ title });
    setQuickText("");
  };

  const [focusedId, setFocusedId] = useState(null);

  const setStatus = useCallback((id, status) => updateTask(id, { status }), [updateTask]);
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

  const clearSelected = useCallback(() => setSelected(new Set()), []);

  const bulkDone = useCallback(() => {
    selected.forEach((id) => updateTask(id, { status: "done" }));
    clearSelected();
  }, [selected, updateTask, clearSelected]);

  const bulkDelete = useCallback(() => {
    selected.forEach((id) => deleteTask(id));
    clearSelected();
  }, [selected, deleteTask, clearSelected]);

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{tasks.length} úkolů celkem · {activeCount} aktivních · {doneCount} hotových</div>
          <h1 className="ph-title">Úkoly</h1>
          <div className="ph-sub"><span>poslední úprava: dnes</span></div>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div style={{ marginBottom: 18 }}>
        <QuickAdd />
      </div>

      <div className="chips">
        {CHIP_STATUSES.map((k) => (
          <span key={k} className={`chip ${statusFilter === k ? "active" : ""}`} onClick={() => setStatusFilter(k)}>
            {k === "all" ? <span className="chip-dot" style={{ background: "var(--text-2)" }} /> : <span className="chip-dot" style={{ background: statusColor(k) }} />}
            {STATUS_LABELS[k]}
            <span className="chip-count">{k === "all" ? filtered.length : filtered.filter((t) => t.statusClass === k).length}</span>
          </span>
        ))}
        <span className="chips-div" />
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
        <span className="chips-sep" />
        <span className="chip">{filtered.length} položek</span>
      </div>

      {filtered.length === 0 ? (
        tasks.length === 0 ? (
          <EmptyState
            type="tasks"
            title="Zatím žádné úkoly"
            description="Přidej svůj první úkol pomocí pole výše nebo klávesové zkratky."
          />
        ) : (
          <EmptyState
            type="filter"
            title="Žádné výsledky"
            description="Žádný úkol neodpovídá zvoleným filtrům. Zkus změnit nebo resetovat filtry."
          />
        )
      ) : view === "table" ? (
        <div className="ttable">
          <div className="ttable-row head">
            <div />
            <div className="head-sort">Název ↑</div>
            <div className="head-sort">Status</div>
            <div className="head-sort">Priorita</div>
            <div className="head-sort">Projekt</div>
            <div className="head-sort">Termín</div>
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tcards" style={{ marginTop: 8 }}>
          {filtered.map((t) => {
            const isFocused = focusedId === t.id;
            return (
            <div
              key={t.id}
              className={`tcard ${t.statusClass} ${t.overdue ? "alert" : ""}`}
              onClick={() => { setFocusedId(t.id); setTaskDetail(t.id); }}
              onMouseEnter={() => { if (focusedId !== t.id) setFocusedId(t.id); }}
              style={isFocused ? { outline: "1px solid var(--accent)", outlineOffset: -1 } : undefined}
            >
              <div className="tcard-state" onClick={(e) => { e.stopPropagation(); setStatus(t.id, t.status === "done" ? "todo" : "done"); }} title="Toggle hotovo" />
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
          );})}
          {filtered.length > 0 && (
            <div style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 11.5, color: "var(--text-4)", fontFamily: "var(--mono)" }}>
              J/K navigace · Enter detail · D hotovo · S hvězda
            </div>
          )}
        </div>
      )}

      {/* Bulk action floating toolbar */}
      {selected.size > 0 && (
        <div style={{
          position: "fixed",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 300,
          background: "var(--surface)",
          border: "1px solid var(--accent)",
          borderRadius: "var(--r-pill, 999px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 16px",
          animation: "pop .2s ease-out",
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)", paddingRight: 8, borderRight: "1px solid var(--border-soft)" }}>
            {selected.size} vybráno
          </span>
          <button className="btn" onClick={selectAll} style={{ fontSize: 12 }}>Vše</button>
          <button className="btn primary" onClick={bulkDone} style={{ fontSize: 12 }}>✓ Hotovo</button>
          <button className="btn danger" onClick={async () => {
            if (await confirm(`Smazat ${selected.size} úkolů?`)) bulkDelete();
          }} style={{ fontSize: 12 }}>Smazat</button>
          <button className="icon-btn" onClick={clearSelected} style={{ marginLeft: 4 }}>✕</button>
        </div>
      )}
    </div>
  );
}
