import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { parseYMD, projectColor, startOfToday } from "../utils.js";
import { formatDate, formatDateKey } from "../locale.js";

const DAYS = 28;

function assignLanes(tasks, startDate) {
  const indexed = tasks
    .map((task) => {
      const d = parseYMD(task.dueDate);
      if (!d) return null;
      const idx = Math.floor((d - startDate) / 86400000);
      return { task, idx, span: 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.idx - b.idx);

  const laneEnds = [];
  return indexed.map((it) => {
    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= it.idx) lane += 1;
    laneEnds[lane] = it.idx + it.span - 1;
    return { ...it, lane };
  });
}

function QuickAddPopover({ project, defaultDate, onAdd, onClose }) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDate);
  const [priority, setPriority] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({ title: clean, dueDate: dueDate || null, priority: priority || null });
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, width: 270, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 10, boxShadow: "0 8px 24px rgba(0,0,0,.35)" }}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Název úkolu…" className="detail-input" autoFocus />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          <input type="date" value={dueDate || ""} onChange={(e) => setDueDate(e.target.value)} className="detail-input" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="detail-input">
            <option value="">Priorita</option>
            <option value="low">Nízká</option>
            <option value="medium">Střední</option>
            <option value="high">Vysoká</option>
          </select>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Zrušit</button>
          <button type="submit" className="btn primary">Přidat</button>
        </div>
      </form>
    </div>
  );
}

export default function TimelinePage() {
  const {
    tasks,
    projects,
    addTask,
    setTaskDetail,
    isMobile,
    timelineOffsetDays: offsetDays,
    setTimelineOffsetDays: setOffsetDays,
  } = useApp();

  const [addingFor, setAddingFor] = useState(null);

  const today = startOfToday();
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today, offsetDays]);

  const days = useMemo(() => {
    return Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [startDate]);

  const todayKey = formatDateKey(today);

  const activeProjects = projects.filter((p) => p.status === "active");
  const scheduled = tasks.filter((t) => t.dueDate && t.status !== "done");
  const overdueCount = scheduled.filter((t) => t.dueDate < todayKey).length;

  const rows = useMemo(() => {
    const pRows = activeProjects.map((p) => ({
      id: p.id,
      name: p.name,
      color: projectColor(p.id),
      tasks: scheduled.filter((t) => t.projectId === p.id),
      projectId: p.id,
    }));

    const inbox = scheduled.filter((t) => !t.projectId);
    if (inbox.length) {
      pRows.push({ id: "_inbox", name: "Bez projektu", color: "#8b95a5", tasks: inbox, projectId: null });
    }

    return pRows;
  }, [activeProjects, scheduled]);

  const laneData = useMemo(() => {
    const m = new Map();
    rows.forEach((r) => m.set(r.id, assignLanes(r.tasks, startDate)));
    return m;
  }, [rows, startDate]);

  const handleAdd = (projectId, payload) => {
    addTask({
      title: payload.title,
      dueDate: payload.dueDate,
      priority: payload.priority,
      projectId,
      status: "todo",
    });
    setAddingFor(null);
  };

  const rangeLabel = `${formatDate(days[0], { day: "numeric", month: "long" })} → ${formatDate(days[DAYS - 1], { day: "numeric", month: "long", year: "numeric" })}`;

  if (isMobile) {
    return (
      <div className="content">
        <div className="ph" style={{ marginBottom: 14 }}>
          <div>
            <div className="ph-eyebrow">{rangeLabel}</div>
            <h1 className="ph-title">Plán</h1>
            <div className="ph-sub"><span>{overdueCount} po termínu</span><span className="dot" /><span>{activeProjects.length} projektů</span></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          <button className="btn" onClick={() => setOffsetDays((v) => v - DAYS)}>←</button>
          <button className="btn primary" onClick={() => setOffsetDays(0)}>dnes</button>
          <button className="btn" onClick={() => setOffsetDays((v) => v + DAYS)}>→</button>
        </div>

        {rows.map((row) => {
          const list = row.tasks
            .filter((t) => t.dueDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

          return (
            <div key={row.id} className="rail-card" style={{ marginBottom: 10 }}>
              <div className="rail-h">
                <span className="rail-h-t" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, display: "inline-block" }} />
                  {row.name}
                </span>
                <span className="rail-h-a">{list.length}</span>
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--text-3)", padding: "8px 0" }}>Žádné úkoly s termínem</div>
              ) : (
                list.map((t) => {
                  const d = parseYMD(t.dueDate);
                  const isOver = d && d < today;
                  return (
                    <div key={t.id} className="pr-row" onClick={() => setTaskDetail(t.id)}>
                      <div className="pr-top">
                        <span className="pr-name" style={{ color: "var(--text)" }}>{t.title}</span>
                        <span className="pr-pct" style={{ color: isOver ? "var(--red)" : "var(--text-3)" }}>{taskDue(t)}</span>
                      </div>
                      {isOver ? <div className="pr-sub" style={{ color: "var(--red)" }}>Po termínu</div> : null}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{rangeLabel} · {DAYS} dní</div>
          <h1 className="ph-title">Plán</h1>
          <div className="ph-sub"><span>{overdueCount} po termínu</span><span className="dot" /><span>{activeProjects.length} projektů</span></div>
        </div>
        <div className="row">
          <button className="btn" onClick={() => setOffsetDays((v) => v - DAYS)}>← zpět</button>
          <button className="btn primary" onClick={() => setOffsetDays(0)}>dnes</button>
          <button className="btn" onClick={() => setOffsetDays((v) => v + DAYS)}>vpřed →</button>
        </div>
      </div>

      <div className="tl">
        <div className="tl-head">
          <div className="tl-head-l">Projekt</div>
          <div className="tl-days">
            {days.map((d, i) => {
              const isToday = formatDateKey(d) === todayKey;
              const dow = d.getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div key={i} className={`tl-day ${isToday ? "today" : ""} ${isWeekend ? "we" : ""}`}>{d.getDate()}.{d.getMonth() + 1}</div>
              );
            })}
          </div>
        </div>

        {rows.map((row) => {
          const lanes = laneData.get(row.id) || [];
          const maxLane = lanes.reduce((m, x) => Math.max(m, x.lane), 0);
          const rowHeight = Math.max(50, 44 + maxLane * 30);

          return (
            <div key={row.id} className="tl-row" style={{ minHeight: rowHeight }}>
              <div className="tl-lab" style={{ position: "relative" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: row.color, display: "inline-block" }} />
                <span style={{ flex: 1 }}>{row.name}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-4)" }}>{row.tasks.length}</span>
                <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => setAddingFor(addingFor === row.id ? null : row.id)}>+</button>

                {addingFor === row.id ? (
                  <QuickAddPopover
                    project={row}
                    defaultDate={todayKey}
                    onClose={() => setAddingFor(null)}
                    onAdd={(payload) => handleAdd(row.projectId, payload)}
                  />
                ) : null}
              </div>

              <div className="tl-grid">
                {days.map((d, i) => (
                  <div key={i} className={`tl-cell ${formatDateKey(d) === todayKey ? "today" : ""}`} />
                ))}

                {lanes.map(({ task, idx, span, lane }) => {
                  if (idx < 0 || idx > DAYS - 1) return null;
                  const d = parseYMD(task.dueDate);
                  const isOverdue = d && d < today;
                  return (
                    <div
                      key={task.id}
                      className={`tl-task ${isOverdue ? "overdue" : ""}`}
                      style={{
                        left: `calc(${(idx / DAYS) * 100}% + 3px)`,
                        width: `calc(${(span / DAYS) * 100}% - 6px)`,
                        top: 11 + lane * 30,
                        background: row.color,
                      }}
                      onClick={() => setTaskDetail(task.id)}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
