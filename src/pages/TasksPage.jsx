import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import {
  mapTaskForAtlas,
  ProjectPill,
  PrioChip,
  CLASS_TO_STATUS,
} from "../components/atlas/AtlasTaskCard.jsx";
import { STATUSES } from "../constants.js";
import { parseYMD, startOfToday } from "../utils.js";
import QuickAdd from "../components/QuickAdd.jsx";

const CHIP_STATUSES = ["all", "todo", "doing", "wait", "done"];
const STATUS_LABELS = {
  all: "Vše",
  todo: "To do",
  doing: "Rozpracováno",
  wait: "Čekám",
  done: "Hotovo",
};

const STATUS_CLASS_COLOR = {
  doing: "var(--blue)",
  wait:  "var(--orange)",
  done:  "var(--green)",
  todo:  "var(--gray)",
};

function statusLabel(statusClass) {
  const realKey = CLASS_TO_STATUS[statusClass] || statusClass;
  return STATUSES[realKey]?.label ?? STATUS_LABELS[statusClass] ?? "To do";
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
  const {
    tasks,
    projects,
    tags,
    addTask,
    updateTask,
    setTaskDetail,
    search,
    tasksPageFilter,
    setTasksPageFilter,
  } = useApp();

  const [view, setView] = useState("table");
  const [statusFilter, setStatusFilter] = useState(() => tasksPageFilter || "all");

  React.useEffect(() => {
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

  const activeCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const onQuickAdd = (e) => {
    if (e.key !== "Enter") return;
    const title = quickText.trim();
    if (!title) return;
    addTask({ title });
    setQuickText("");
  };

  const setStatus = (id, status) => updateTask(id, { status });
  const toggleStar = (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    updateTask(id, { starred: !current.starred });
  };

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
            {k === "all" ? <span className="chip-dot" style={{ background: "var(--text-2)" }} /> : <span className="chip-dot" style={{ background: STATUS_CLASS_COLOR[k] || "var(--gray)" }} />}
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

      {view === "table" ? (
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
            const due = t.due;
            const dueDate = parseYMD(tasks.find((x) => x.id === t.id)?.dueDate);
            const isOverdue = dueDate && t.status !== "done" && dueDate < today;

            return (
              <div key={t.id} className="ttable-row" onClick={() => setTaskDetail(t.id)}>
                <input type="checkbox" onClick={(e) => e.stopPropagation()} />
                <div className={`tt-name ${t.status === "done" ? "done" : ""}`}>{t.title}</div>
                <div>
                  <span className={`tt-st ${t.statusClass}`}>
                    <span className="d" /> {statusLabel(t.statusClass)}
                  </span>
                </div>
                <div><PrioChip priority={t.priority} /></div>
                <div><ProjectPill projectId={t.project} projectsById={projectsById} /></div>
                <div><span className={`due ${isOverdue ? "overdue" : ""}`}>{due || "—"}</span></div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tcards" style={{ marginTop: 8 }}>
          {filtered.map((t) => (
            <div key={t.id} className={`tcard ${t.statusClass} ${t.overdue ? "alert" : ""}`} onClick={() => setTaskDetail(t.id)}>
              <div className="tcard-state" onClick={(e) => { e.stopPropagation(); setStatus(t.id, t.status === "done" ? "todo" : "done"); }} title="Toggle hotovo" />
              <div className="tcard-body">
                <div className="tcard-title">{t.title}</div>
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
          ))}
        </div>
      )}
    </div>
  );
}
