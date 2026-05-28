import React from "react";
import Icon from "../Icon.jsx";
import { parseYMD, projectColor } from "../../utils.js";

export const STATUS_TO_CLASS = { todo: "todo", doing: "doing", waiting: "wait", done: "done" };
export const CLASS_TO_STATUS = { todo: "todo", doing: "doing", wait: "waiting", done: "done" };

const STATUS_SHORT = { todo: "Todo", doing: "Doing", wait: "Wait", done: "Done" };

const PRIORITY_META = {
  low: { label: "Nízká", glyph: "↓", color: "#60a5fa" },
  medium: { label: "Střední", glyph: "—", color: "#fbbf24" },
  high: { label: "Vysoká", glyph: "↑", color: "#f87171" },
};

export function formatShortDue(dueDate) {
  if (!dueDate) return null;
  const d = parseYMD(dueDate);
  if (!d) return null;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function mapTaskForAtlas(task, projectsById, tagsById, today) {
  const due = parseYMD(task.dueDate);
  const overdue = !!due && task.status !== "done" && due < today;
  const tagNames = (task.tagIds || [])
    .map((id) => tagsById.get(id)?.name)
    .filter(Boolean);

  return {
    id: task.id,
    title: task.title || "Bez názvu",
    desc: task.description || "",
    statusClass: STATUS_TO_CLASS[task.status] || "todo",
    status: task.status,
    priority: task.priority || "medium",
    due: formatShortDue(task.dueDate),
    overdue,
    tags: tagNames,
    starred: !!task.starred,
    hasSubtasks: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
    project: task.projectId,
    projectName: task.projectId ? projectsById.get(task.projectId)?.name : null,
  };
}

export function ProjectPill({ projectId, projectsById }) {
  if (!projectId) return null;
  const p = projectsById.get(projectId);
  if (!p) return null;
  return (
    <span className="proj-pill" style={{ "--proj-color": projectColor(projectId) }}>
      <span className="pp-dot" />
      {p.name}
    </span>
  );
}

export function TagPill({ name }) {
  return <span className="tag">{name}</span>;
}

export function PrioChip({ priority }) {
  if (!priority || priority === "medium") return null;
  const m = PRIORITY_META[priority];
  if (!m) return null;
  return <span className="prio" style={{ "--prio-color": m.color }}>{m.glyph} {m.label}</span>;
}

export function Stepper({ statusClass, onChange }) {
  const keys = ["todo", "doing", "wait", "done"];
  return (
    <div className="stepper">
      {keys.map((k) => (
        <button
          key={k}
          className={statusClass === k ? `cur ${k}` : ""}
          onClick={(e) => {
            e.stopPropagation();
            onChange(CLASS_TO_STATUS[k]);
          }}
          title={STATUS_SHORT[k]}
        >
          {STATUS_SHORT[k]}
        </button>
      ))}
    </div>
  );
}

export default function AtlasTaskCard({ task, onOpen, onStatusChange, onStar, projectsById }) {
  return (
    <div className={`tcard ${task.statusClass} ${task.overdue ? "alert" : ""}`} onClick={() => onOpen(task.id)}>
      <div
        className="tcard-state"
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(task.id, task.status === "done" ? "todo" : "done");
        }}
        title="Toggle hotovo"
      />
      <div className="tcard-body">
        <div className="tcard-title">{task.title}</div>
        {task.desc ? <div className="tcard-desc">{task.desc}</div> : null}
        <div className="tcard-meta">
          <ProjectPill projectId={task.project} projectsById={projectsById} />
          <PrioChip priority={task.priority} />
          {task.due ? <span className={`due ${task.overdue ? "overdue" : ""}`}>{task.overdue ? "⚠ " : ""}{task.due}</span> : null}
          {task.tags.map((tg) => <TagPill key={tg} name={tg} />)}
          {task.hasSubtasks > 0 ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>≡ {task.hasSubtasks}</span> : null}
        </div>
      </div>
      <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
        <Stepper statusClass={task.statusClass} onChange={(s) => onStatusChange(task.id, s)} />
        <button className={`icon-btn star ${task.starred ? "on" : ""}`} onClick={() => onStar(task.id)} title="Top úkol">
          <Icon name="star" size={15} color="currentColor" strokeWidth={1.6} fill={task.starred ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}
