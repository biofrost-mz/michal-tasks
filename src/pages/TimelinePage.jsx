import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { parseYMD, projectColor, startOfToday } from "../utils.js";
import { formatDate, formatDateKey } from "../locale.js";

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

function taskDue(task) {
  const d = parseYMD(task.dueDate);
  if (!d) return null;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
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

function CellAddModal({ addingForCell, onClose, onAdd, projects }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(addingForCell?.projectId || "");
  const [dueDate, setDueDate] = useState(addingForCell?.dateKey || "");
  const [priority, setPriority] = useState("");
  const [description, setDescription] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onAdd({
      title: clean,
      projectId: projectId || null,
      dueDate: dueDate || null,
      priority: priority || null,
      description: description.trim() || "",
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={submit}>
          <div className="modal-header">
            <h3 className="modal-title">Připravit úkol</h3>
            <button type="button" className="icon-btn" onClick={onClose} style={{ border: "1px solid var(--border-soft)", borderRadius: "var(--r-sm)", padding: "2px 6px" }}>
              ✕
            </button>
          </div>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>Název úkolu</label>
              <input
                className="detail-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Co je potřeba udělat?…"
                autoFocus
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>Projekt</label>
                <select
                  className="detail-input"
                  value={projectId || ""}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">Bez projektu</option>
                  {projects.filter(p => p.status === "active").map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>Termín</label>
                <input
                  type="date"
                  className="detail-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>Priorita</label>
                <select
                  className="detail-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="">Žádná</option>
                  <option value="low">Nízká</option>
                  <option value="medium">Střední</option>
                  <option value="high">Vysoká</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-3)", marginBottom: 6, fontWeight: 500 }}>Poznámky / Popis</label>
              <textarea
                className="detail-input"
                style={{ resize: "none", height: 80 }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Bližší podrobnosti k úkolu…"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose}>Zrušit</button>
            <button type="submit" className="btn primary">Uložit úkol</button>
          </div>
        </form>
      </div>
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

  const [daysCount, setDaysCount] = useState(() => Number(localStorage.getItem("mt3:timeline_days") || 7));
  const [addingFor, setAddingFor] = useState(null);
  const [addingForCell, setAddingForCell] = useState(null);

  const handleSetDaysCount = (val) => {
    setDaysCount(val);
    localStorage.setItem("mt3:timeline_days", val);
  };

  const today = startOfToday();
  const startDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [today, offsetDays]);

  const days = useMemo(() => {
    return Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      return d;
    });
  }, [startDate, daysCount]);

  const todayKey = formatDateKey(today);
  const selectedDateKey = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return formatDateKey(d);
  }, [today, offsetDays]);

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

  const handleAddForCell = (payload) => {
    addTask({
      title: payload.title,
      dueDate: payload.dueDate,
      priority: payload.priority,
      projectId: payload.projectId,
      description: payload.description,
      status: "todo",
    });
    setAddingForCell(null);
  };

  const handleClickHeaderDay = (d) => {
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / 86400000);
    setOffsetDays(diffDays);
  };

  const rangeLabel = `${formatDate(days[0], { day: "numeric", month: "long" })} → ${formatDate(days[daysCount - 1], { day: "numeric", month: "long", year: "numeric" })}`;

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

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div className="segmented-control" style={{ width: "100%" }}>
            <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 7 ? "active" : ""}`} onClick={() => handleSetDaysCount(7)}>7 dní</button>
            <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 14 ? "active" : ""}`} onClick={() => handleSetDaysCount(14)}>14 dní</button>
            <button style={{ flex: 1 }} className={`sc-btn ${daysCount === 30 ? "active" : ""}`} onClick={() => handleSetDaysCount(30)}>30 dní</button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ flex: 1 }} className="btn" onClick={() => setOffsetDays((v) => v - daysCount)}>←</button>
            <button style={{ flex: 1 }} className="btn primary" onClick={() => setOffsetDays(0)}>dnes</button>
            <button style={{ flex: 1 }} className="btn" onClick={() => setOffsetDays((v) => v + daysCount)}>→</button>
          </div>
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
          <div className="ph-eyebrow">{rangeLabel} · {daysCount} dní</div>
          <h1 className="ph-title">Plán</h1>
          <div className="ph-sub"><span>{overdueCount} po termínu</span><span className="dot" /><span>{activeProjects.length} projektů</span></div>
        </div>
        <div className="row" style={{ gap: 12, alignItems: "center" }}>
          <div className="segmented-control">
            <button className={`sc-btn ${daysCount === 7 ? "active" : ""}`} onClick={() => handleSetDaysCount(7)}>7 dní</button>
            <button className={`sc-btn ${daysCount === 14 ? "active" : ""}`} onClick={() => handleSetDaysCount(14)}>14 dní</button>
            <button className={`sc-btn ${daysCount === 30 ? "active" : ""}`} onClick={() => handleSetDaysCount(30)}>30 dní</button>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn" onClick={() => setOffsetDays((v) => v - daysCount)}>← zpět</button>
            <button className="btn primary" onClick={() => setOffsetDays(0)}>dnes</button>
            <button className="btn" onClick={() => setOffsetDays((v) => v + daysCount)}>vpřed →</button>
          </div>
        </div>
      </div>

      <div className="tl">
        <div className="tl-head">
          <div className="tl-head-l">Projekt</div>
          <div className="tl-days" style={{ gridTemplateColumns: `repeat(${daysCount}, 1fr)` }}>
            {days.map((d, i) => {
              const dateKey = formatDateKey(d);
              const isToday = dateKey === todayKey;
              const isSelected = dateKey === selectedDateKey;
              const dow = d.getDay();
              const isWeekend = dow === 0 || dow === 6;
              return (
                <div
                  key={i}
                  className={`tl-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""} ${isWeekend ? "we" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleClickHeaderDay(d)}
                >
                  {d.getDate()}.{d.getMonth() + 1}
                </div>
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

              <div className="tl-grid" style={{ gridTemplateColumns: `repeat(${daysCount}, 1fr)` }}>
                {days.map((d, i) => {
                  const dateKey = formatDateKey(d);
                  const isToday = dateKey === todayKey;
                  const isSelected = dateKey === selectedDateKey;
                  return (
                    <div
                      key={i}
                      className={`tl-cell clickable ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        setAddingForCell({
                          projectId: row.projectId,
                          projectName: row.name,
                          dateKey: dateKey,
                        });
                      }}
                      title={`Připravit úkol pro ${row.name} na ${d.getDate()}.${d.getMonth() + 1}.`}
                    />
                  );
                })}

                {lanes.map(({ task, idx, span, lane }) => {
                  if (idx < 0 || idx > daysCount - 1) return null;
                  const d = parseYMD(task.dueDate);
                  const isOverdue = d && d < today;
                  return (
                    <div
                      key={task.id}
                      className={`tl-task ${isOverdue ? "overdue" : ""}`}
                      style={{
                        left: `calc(${(idx / daysCount) * 100}% + 3px)`,
                        width: `calc(${(span / daysCount) * 100}% - 6px)`,
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

      {addingForCell ? (
        <CellAddModal
          addingForCell={addingForCell}
          projects={projects}
          onClose={() => setAddingForCell(null)}
          onAdd={handleAddForCell}
        />
      ) : null}
    </div>
  );
}
