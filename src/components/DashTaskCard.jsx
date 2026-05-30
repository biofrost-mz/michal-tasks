import React from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from './Icon.jsx'
import { STATUSES, STATUS_KEYS, STATUS_SHORT, PRIORITIES } from '../constants.js'
import { startOfToday, projectColor } from '../utils.js'
import { parseYMD } from '../utils.js'
import { formatDate } from '../locale.js'

export default function DashTaskCard({ task, sectionColor }) {
  const { t, projects, tags, updateTask, setTaskDetail, isMobile } = useApp();
  const project = projects.find((p) => p.id === task.projectId);
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));

  const st = STATUSES[task.status] || STATUSES.todo;
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;
  const projColor = project ? projectColor(project.id) : null;

  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter((s) => s.done).length;
  const hasSubs = subtasks.length > 0;

  return (
    <div
      className="dash-task-card"
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        cursor: "pointer",
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = sectionColor ? sectionColor + "10" : t.cardH;
        e.currentTarget.style.borderColor = sectionColor ? sectionColor + "50" : t.borderH;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.card;
        e.currentTarget.style.borderColor = t.border;
      }}
    >
      {/* Status color strip */}
      <div style={{ height: 3, background: st.color }} />

      <div style={{ padding: "10px 14px 8px" }}>
        {/* Row 1: status toggle + title + star */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idx = STATUS_KEYS.indexOf(task.status);
              updateTask(task.id, { status: STATUS_KEYS[(idx + 1) % STATUS_KEYS.length] });
            }}
            title={`Stav: ${st.label} → klikni pro posun`}
            style={{
              width: 26, height: 26, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${st.color}40`,
              background: t.input,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name={st.icon} size={13} color={st.color} strokeWidth={2} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, lineHeight: 1.35,
              textDecoration: task.status === "done" ? "line-through" : "none",
              color: task.status === "done" ? t.text3 : t.text,
            }}>
              {task.title || "Bez názvu"}
            </div>
            {task.description && (
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.description}
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { starred: !task.starred }); }}
            title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            style={{
              background: "none", border: "none", cursor: "pointer",
              opacity: task.starred ? 1 : 0.3,
              transition: "all .15s", flexShrink: 0, padding: 0, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >
            <Icon name="star" size={15} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
          </button>
        </div>

        {/* Row 2: meta pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginLeft: 30, minWidth: 0, overflow: "hidden" }}>
          {!isMobile && project && (
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
              border: `1.5px solid ${projColor}55`, background: projColor + "12", color: projColor,
              letterSpacing: ".01em", display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Icon name="folder" size={9} color={projColor} strokeWidth={2} />
              {project.name}
            </span>
          )}
          {pr && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: pr.bg, color: pr.color, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name={pr.icon} size={9} color={pr.color} strokeWidth={2.5} />
              {pr.label}
            </span>
          )}
          {!isMobile && taskTags.length > 0 && (
            <span style={{ width: 1, height: 12, background: t.border, alignSelf: "center", flexShrink: 0 }} />
          )}
          {!isMobile && taskTags.slice(0, 2).map((tg) => (
            <span key={tg.id} style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: tg.color + "18", color: tg.color }}>
              # {tg.name}
            </span>
          ))}
          {!isMobile && taskTags.length > 2 && (
            <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 7px", borderRadius: 4, background: t.input, color: t.text3 }}>
              +{taskTags.length - 2}
            </span>
          )}
          {task.dueDate && (
            <span className="mono" style={{
              fontSize: 12, fontWeight: isOverdue ? 700 : 500,
              color: isOverdue ? "#ef4444" : t.text2,
              background: isOverdue ? "#ef444412" : t.input,
              padding: "3px 8px", borderRadius: 4,
            }}>
              {formatDate(task.dueDate, { day: "numeric", month: "short" }) || task.dueDate}
            </span>
          )}
          {hasSubs && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: subDone === subtasks.length ? "#22c55e" : t.text3 }}>
              <Icon name="check-square" size={11} color={subDone === subtasks.length ? "#22c55e" : t.text3} strokeWidth={2} />
              {subDone}/{subtasks.length}
            </span>
          )}
        </div>
      </div>

      {/* Footer: quick status buttons (desktop only) */}
      {!isMobile && <div
        style={{ display: "flex", gap: 4, padding: "6px 14px 8px", borderTop: `1px solid ${t.border}`, flexWrap: "wrap" }}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
          <button
            key={k}
            onClick={() => updateTask(task.id, { status: k })}
            title={STATUSES[k].label}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", height: 26, borderRadius: 6,
              fontSize: 12, fontWeight: 600,
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: STATUSES[k].color,
              cursor: "pointer",
              transition: "background .1s, border-color .1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = STATUSES[k].color + "18";
              e.currentTarget.style.borderColor = STATUSES[k].color + "60";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = t.border;
            }}
          >
            <Icon name={STATUSES[k].icon} size={10} color="currentColor" strokeWidth={2} />
            {STATUS_SHORT[k]}
          </button>
        ))}
      </div>}
    </div>
  );
}
