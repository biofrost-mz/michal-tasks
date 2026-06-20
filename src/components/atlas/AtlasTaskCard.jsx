import React, { useState, useRef, useCallback } from "react";
import Icon from "../Icon.jsx";
import { parseYMD, projectColor, triggerConfettiBurst } from "../../utils.js";
import { useApp } from "../../context/AppContext.jsx";

export const STATUS_TO_CLASS = { todo: "todo", doing: "doing", waiting: "wait", done: "done" };
export const CLASS_TO_STATUS = { todo: "todo", doing: "doing", wait: "waiting", done: "done" };

const STATUS_SHORT = { todo: "Todo", doing: "Doing", wait: "Wait", done: "Done" };

const PRIORITY_META = {
  low: { label: "Nízká", glyph: "↓", color: "var(--prio-low)" },
  medium: { label: "Střední", glyph: "—", color: "var(--prio-med)" },
  high: { label: "Vysoká", glyph: "↑", color: "var(--prio-high)" },
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
    priority: task.priority ?? null,
    createdAt: task.createdAt ?? null,
    updatedAt: task.updatedAt ?? task.createdAt ?? null,
    due: formatShortDue(task.dueDate),
    dueDate: task.dueDate ?? null,
    overdue,
    tags: tagNames,
    tagIds: task.tagIds || [],
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
  if (!priority) return null;
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

const SWIPE_THRESHOLD = 56;
const SWIPE_MAX = 160;

export default function AtlasTaskCard({ task, onOpen, onStatusChange, onStar, projectsById }) {
  const { isMobile } = useApp();
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [exiting, setExiting] = useState(false);
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const swipeAxisRef = useRef(null);
  const offsetXRef = useRef(0);
  const pointerIdRef = useRef(null);
  const hasSwipedRef = useRef(false);

  const onPointerDown = useCallback((e) => {
    if (exiting) return;
    if (e.button !== undefined && e.button !== 0) return;
    if (e.target.closest?.("button, input, textarea, select, a")) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    pointerIdRef.current = e.pointerId;
    offsetXRef.current = 0;
    swipeAxisRef.current = null;
    hasSwipedRef.current = false;
    setSwiping(false);
  }, [exiting]);

  const onPointerMove = useCallback((e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    if (startXRef.current == null) return;

    const diff = e.clientX - startXRef.current;
    const diffY = e.clientY - startYRef.current;
    const absX = Math.abs(diff);
    const absY = Math.abs(diffY);

    if (swipeAxisRef.current == null) {
      if (absX < 3 && absY < 3) return;
      if (absY > absX * 4.0 || diff > 0) {
        swipeAxisRef.current = "ignored";
        setSwiping(false);
        return;
      }
      swipeAxisRef.current = "x";
      setSwiping(true);
      hasSwipedRef.current = true;
      try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch {}
    }

    if (swipeAxisRef.current !== "x") return;
    e.preventDefault();

    const clamped = Math.max(-SWIPE_MAX, Math.min(0, diff));
    offsetXRef.current = clamped;
    setOffsetX(clamped);
  }, []);

  const onPointerEnd = useCallback((e) => {
    if (pointerIdRef.current == null || pointerIdRef.current !== e.pointerId) return;
    setSwiping(false);
    const finalX = offsetXRef.current;

    if (swipeAxisRef.current === "x" && finalX <= -SWIPE_THRESHOLD) {
      setExiting(true);
      if (navigator.vibrate) navigator.vibrate(10);
      setTimeout(() => onStatusChange(task.id, "done"), 260);
    } else {
      setOffsetX(0);
      offsetXRef.current = 0;
    }

    startXRef.current = null;
    startYRef.current = null;
    swipeAxisRef.current = null;
    pointerIdRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  }, [task.id, onStatusChange]);

  const onPointerCancel = useCallback((e) => {
    setSwiping(false);
    setOffsetX(0);
    offsetXRef.current = 0;
    startXRef.current = null;
    startYRef.current = null;
    swipeAxisRef.current = null;
    pointerIdRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch {}
  }, []);

  const bgOpacity = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  const card = (
    <div
      className={`tcard ${task.statusClass} ${task.overdue ? "alert" : ""}`}
      onClick={() => {
        if (hasSwipedRef.current) return;
        onOpen(task.id);
      }}
      onPointerDown={isMobile ? onPointerDown : undefined}
      onPointerMove={isMobile ? onPointerMove : undefined}
      onPointerUp={isMobile ? onPointerEnd : undefined}
      onPointerCancel={isMobile ? onPointerCancel : undefined}
      onLostPointerCapture={isMobile ? onPointerEnd : undefined}
      style={isMobile ? {
        touchAction: "pan-y",
        transform: exiting ? "translateX(-110%)" : `translateX(${offsetX}px)`,
        opacity: exiting ? 0 : 1,
        transition: swiping ? "none" : "transform .5s cubic-bezier(.4,0,.2,1), opacity .22s",
        willChange: "transform",
      } : undefined}
    >
      <div
        className="tcard-state"
        onClick={(e) => {
          e.stopPropagation();
          const nextStatus = task.status === "done" ? "todo" : "done";
          if (nextStatus === "done") triggerConfettiBurst(e);
          onStatusChange(task.id, nextStatus);
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

  if (!isMobile) return card;

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: "var(--r, 14px)" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `rgba(34,197,94,${bgOpacity * 0.85})`,
        display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 20,
        transition: swiping ? "none" : "background .2s",
        borderRadius: "inherit",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <Icon name="check" size={20} color="var(--bg)" strokeWidth={2.5} />
          <span style={{ fontSize: 12, color: "var(--bg)", fontWeight: 700 }}>Hotovo</span>
        </div>
      </div>
      {card}
    </div>
  );
}
