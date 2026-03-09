import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import { startOfToday, parseYMD, projectColor } from '../utils.js'
import { STATUSES, PRIORITIES } from '../constants.js'

const DOW = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
const MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];
const MONTHS_SHORT = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

const COL_W = 44;
const CHIP_H = 28;
const LANE_GAP = 6;
const ROW_PAD = 10;
const LABEL_W = 210;
const DAYS = 28;

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

/* Assign chips to non-overlapping lanes */
function assignLanes(tasks, startDate) {
  const sorted = [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const laneEnds = []; // laneEnds[i] = last occupied column index in lane i

  return sorted.map((task) => {
    const d = parseYMD(task.dueDate);
    const idx = Math.round((d - startDate) / 86400000);
    const chipSpan = 3; // chips visually span ~3 columns

    let lane = 0;
    while (laneEnds[lane] !== undefined && laneEnds[lane] > idx) lane++;
    laneEnds[lane] = idx + chipSpan;

    return { ...task, lane, idx };
  });
}

/* Quick-add popover for a specific project row */
function QuickAddPopover({ project, defaultDate, onAdd, onClose, t }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [priority, setPriority] = useState("");
  const inputRef = useRef(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), dueDate: date || null, priority: priority || null });
    onClose();
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute", left: 0, top: "calc(100% + 6px)", zIndex: 300,
        background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12,
        padding: 16, width: 280, boxShadow: t.shadow,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: t.text2, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <span>+ Úkol do „{project.name}"</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 0, lineHeight: 1 }}>
          <Icon name="x" size={14} color={t.text3} strokeWidth={2} />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název úkolu…"
          style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, outline: "none" }}
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ flex: 1, padding: "7px 8px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, outline: "none" }}
          >
            <option value="">Priorita</option>
            {Object.entries(PRIORITIES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={!title.trim()}
          style={{
            padding: "8px 0", borderRadius: 8, border: "none",
            background: title.trim() ? t.accent : t.input,
            color: title.trim() ? "#fff" : t.text3,
            fontSize: 13, fontWeight: 600, cursor: title.trim() ? "pointer" : "default",
            transition: "background .15s",
          }}
        >
          Přidat úkol
        </button>
      </form>
    </div>
  );
}

export default function TimelinePage() {
  const { t, tasks, projects, addTask, setTaskDetail, isMobile } = useApp();
  const today = startOfToday();
  const [offsetDays, setOffsetDays] = useState(0);
  const [addingFor, setAddingFor] = useState(null); // project id
  const [hoverTask, setHoverTask] = useState(null);

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + offsetDays);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const todayStr = fmt(today);

  const tasksWithDue = tasks.filter((task) => task.dueDate && task.status !== "done");

  const activeProjects = projects.filter((p) => p.status === "active");
  const unassigned = tasksWithDue.filter((task) => !task.projectId);

  const rows = [
    ...activeProjects.map((proj) => ({
      id: proj.id,
      label: proj.name,
      isProject: true,
      project: proj,
      tasks: tasksWithDue.filter((task) => task.projectId === proj.id),
      color: projectColor(proj.id),
    })),
    ...(unassigned.length ? [{ id: "_inbox", label: "Bez projektu", isProject: false, tasks: unassigned, color: "#8b95a5" }] : []),
  ].filter((row) => row.tasks.length > 0 || (row.isProject)); // always show active projects

  // Today column index
  const todayIdx = Math.round((today - startDate) / 86400000);

  // Week groupings for header
  const weeks = [];
  let wStart = 0;
  days.forEach((d, i) => {
    if (i === 0 || d.getDay() === 1) {
      if (i > 0) weeks[weeks.length - 1].span = i - wStart;
      weeks.push({ label: `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`, start: i });
      wStart = i;
    }
  });
  if (weeks.length) weeks[weeks.length - 1].span = DAYS - wStart;

  const handleAddTask = (projectId, { title, dueDate, priority }) => {
    addTask({ title, projectId: projectId === "_inbox" ? null : projectId, dueDate, priority });
    setAddingFor(null);
  };

  // Default date for quick-add = first day visible or today
  const defaultAddDate = offsetDays >= 0 ? fmt(today) : fmt(startDate);

  if (isMobile) {
    // Mobile: simple list grouped by project
    return (
      <div style={{ padding: "20px 16px 80px", background: t.bg, minHeight: "100%" }}>
        <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size={20} color={t.accent} strokeWidth={2} />
          Plán
        </div>
        <div style={{ color: t.text3, fontSize: 13, marginBottom: 20 }}>Úkoly s termínem</div>

        {tasksWithDue.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: t.text3 }}>
            <div style={{ opacity: 0.15, display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <Icon name="calendar" size={48} color={t.text} strokeWidth={0.75} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text2, marginBottom: 6 }}>Žádné úkoly s termínem</div>
            <div style={{ fontSize: 13 }}>Přidejte termín k úkolům.</div>
          </div>
        )}

        {rows.filter(r => r.tasks.length > 0).map((row) => (
          <div key={row.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{row.label}</div>
              <div style={{ fontSize: 11, color: t.text3, background: t.input, borderRadius: 6, padding: "1px 7px" }}>{row.tasks.length}</div>
            </div>
            {[...row.tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((task) => {
              const d = parseYMD(task.dueDate);
              const isOverdue = task.dueDate < todayStr;
              const isToday = task.dueDate === todayStr;
              const pr = task.priority ? PRIORITIES[task.priority] : null;
              return (
                <div
                  key={task.id}
                  onClick={() => setTaskDetail(task.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", marginBottom: 6, borderRadius: 10,
                    background: t.card, border: `1px solid ${isOverdue ? "#ef444430" : t.border}`,
                    borderLeft: `3px solid ${isOverdue ? "#ef4444" : row.color}`,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.title}
                    </div>
                    {pr && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: pr.bg, padding: "1px 6px", borderRadius: 4 }}>
                        {pr.label}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: isOverdue ? 700 : 500, color: isOverdue ? "#ef4444" : isToday ? t.accent : t.text2 }}>
                      {d?.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                    </div>
                    {isOverdue && <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }}>Prošlý</div>}
                    {isToday && <div style={{ fontSize: 10, color: t.accent, fontWeight: 600 }}>Dnes</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: t.bg, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px 16px", flexShrink: 0, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", gap: 9 }}>
              <Icon name="calendar" size={20} color={t.accent} strokeWidth={2} />
              Plán
            </div>
            <div style={{ color: t.text3, fontSize: 13, marginTop: 2 }}>
              {days[0].toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })} – {days[DAYS - 1].toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setOffsetDays((o) => o - DAYS)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}>← Zpět</button>
            <button onClick={() => setOffsetDays(0)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.accent}`, background: t.accentBg, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Dnes</button>
            <button onClick={() => setOffsetDays((o) => o + DAYS)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}>Vpřed →</button>
          </div>
        </div>
      </div>

      {/* Timeline body */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 32px 32px" }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: t.text3 }}>
            <div style={{ marginBottom: 12, opacity: 0.2, display: "flex", justifyContent: "center" }}>
              <Icon name="calendar" size={56} color={t.text} strokeWidth={0.75} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: t.text2 }}>Žádné aktivní projekty ani úkoly s termínem</div>
            <div style={{ fontSize: 13 }}>Přidejte termíny k úkolům a zobrazí se zde.</div>
          </div>
        ) : (
          <div style={{ minWidth: DAYS * COL_W + LABEL_W + 40 }}>

            {/* Week header */}
            <div style={{ display: "flex", marginLeft: LABEL_W, marginBottom: 2 }}>
              {weeks.map((w, i) => (
                <div key={i} style={{
                  width: w.span * COL_W, flexShrink: 0,
                  fontSize: 11, fontWeight: 600, color: t.text3,
                  paddingLeft: 4, borderLeft: `1px solid ${t.border}`,
                }}>
                  {w.label}
                </div>
              ))}
            </div>

            {/* Day header */}
            <div style={{ display: "flex", marginLeft: LABEL_W, marginBottom: 10 }}>
              {days.map((d, i) => {
                const isToday = fmt(d) === todayStr;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} style={{
                    width: COL_W, flexShrink: 0, textAlign: "center",
                    fontSize: 11,
                    color: isToday ? t.accent : isWeekend ? t.text2 : t.text3,
                    fontWeight: isToday ? 700 : 400,
                    borderLeft: `1px solid ${isToday ? t.accent + "40" : t.border}`,
                    paddingTop: 2, paddingBottom: 4,
                    background: isWeekend ? t.kanban + "80" : "transparent",
                    borderRadius: isToday ? "4px 4px 0 0" : 0,
                    position: "relative",
                  }}>
                    <div style={{ fontSize: 10 }}>{DOW[d.getDay()]}</div>
                    <div style={{
                      width: isToday ? 22 : "auto", height: isToday ? 22 : "auto",
                      borderRadius: isToday ? "50%" : 0,
                      background: isToday ? t.accent : "transparent",
                      color: isToday ? "#fff" : "inherit",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: isToday ? "2px auto 0" : "2px 0 0",
                      fontWeight: isToday ? 700 : 400,
                    }}>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Project rows */}
            {rows.map((row) => {
              const laned = assignLanes(row.tasks, startDate);
              const maxLane = laned.reduce((m, t) => (t.lane > m ? t.lane : m), 0);
              const rowH = (maxLane + 1) * (CHIP_H + LANE_GAP) + ROW_PAD * 2;

              return (
                <div key={row.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: 4 }}>
                  {/* Project label */}
                  <div style={{
                    width: LABEL_W, flexShrink: 0, paddingRight: 14, paddingTop: ROW_PAD,
                    minHeight: rowH, display: "flex", flexDirection: "column",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, position: "relative" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: row.color, flexShrink: 0 }} />
                      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {row.label}
                      </div>
                      <div style={{ fontSize: 11, color: t.text3, background: t.input, borderRadius: 6, padding: "1px 7px", flexShrink: 0 }}>
                        {row.tasks.length}
                      </div>
                      {row.isProject && (
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <button
                            onClick={() => setAddingFor(addingFor === row.id ? null : row.id)}
                            title="Přidat úkol"
                            style={{
                              width: 22, height: 22, borderRadius: 6, border: `1px solid ${t.border}`,
                              background: addingFor === row.id ? t.accentBg : t.input,
                              color: addingFor === row.id ? t.accent : t.text3,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", flexShrink: 0,
                            }}
                          >
                            <Icon name="plus" size={12} color="currentColor" strokeWidth={2.5} />
                          </button>
                          {addingFor === row.id && (
                            <>
                              <div onClick={() => setAddingFor(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
                              <QuickAddPopover
                                project={row.project}
                                defaultDate={defaultAddDate}
                                onAdd={(data) => handleAddTask(row.id, data)}
                                onClose={() => setAddingFor(null)}
                                t={t}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grid + chips */}
                  <div style={{ position: "relative", flex: 1, minHeight: rowH }}>
                    {/* Background columns */}
                    <div style={{ display: "flex", position: "absolute", inset: 0 }}>
                      {days.map((d, i) => {
                        const isToday = fmt(d) === todayStr;
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <div key={i} style={{
                            width: COL_W, flexShrink: 0, height: "100%",
                            borderLeft: `1px solid ${isToday ? t.accent + "50" : t.border}`,
                            background: isToday ? t.accent + "06" : isWeekend ? t.kanban + "60" : "transparent",
                          }} />
                        );
                      })}
                    </div>

                    {/* Today vertical line */}
                    {todayIdx >= 0 && todayIdx < DAYS && (
                      <div style={{
                        position: "absolute",
                        left: todayIdx * COL_W + COL_W / 2,
                        top: 0, bottom: 0,
                        width: 2, background: t.accent + "60",
                        zIndex: 2, pointerEvents: "none",
                      }} />
                    )}

                    {/* Task chips */}
                    {laned.map((task) => {
                      if (task.idx < 0 || task.idx >= DAYS) return null;
                      const isOverdue = task.dueDate < todayStr;
                      const chipColor = isOverdue ? "#ef4444" : row.color;
                      const pr = task.priority ? PRIORITIES[task.priority] : null;
                      const isHovered = hoverTask === task.id;

                      return (
                        <div
                          key={task.id}
                          title={task.title}
                          onClick={() => setTaskDetail(task.id)}
                          onMouseEnter={() => setHoverTask(task.id)}
                          onMouseLeave={() => setHoverTask(null)}
                          style={{
                            position: "absolute",
                            left: task.idx * COL_W + 3,
                            top: ROW_PAD + task.lane * (CHIP_H + LANE_GAP),
                            height: CHIP_H,
                            maxWidth: COL_W * 4 - 6,
                            minWidth: COL_W - 6,
                            background: isHovered ? chipColor + "30" : chipColor + "18",
                            border: `1px solid ${chipColor}${isHovered ? "80" : "45"}`,
                            borderLeft: `3px solid ${chipColor}`,
                            borderRadius: 6,
                            padding: "0 8px",
                            display: "flex", alignItems: "center", gap: 5,
                            overflow: "hidden",
                            cursor: "pointer",
                            zIndex: 3,
                            transition: "background .1s, border-color .1s",
                          }}
                        >
                          {task.recurrence && (
                            <Icon name="repeat" size={10} color={chipColor} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                          )}
                          {pr && (
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color, flexShrink: 0 }} />
                          )}
                          <span style={{
                            fontSize: 12, fontWeight: 500, color: chipColor,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                          }}>
                            {task.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div style={{ marginTop: 24, display: "flex", gap: 20, fontSize: 12, color: t.text3, flexWrap: "wrap", borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 12, borderRadius: 3, background: "#ef444418", border: "1px solid #ef444445", borderLeft: "3px solid #ef4444" }} />
            Prošlý termín
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="repeat" size={12} color={t.text3} strokeWidth={2} /> Opakující se
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 2, height: 14, background: t.accent + "60", borderRadius: 1 }} />
            Dnešní den
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="plus" size={11} color={t.text3} strokeWidth={2} /> Přidat úkol do projektu
          </div>
          <div style={{ marginLeft: "auto", fontSize: 11 }}>Kliknutím na úkol otevřete detail</div>
        </div>
      </div>
    </div>
  );
}
