import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import QuickAdd from '../components/QuickAdd.jsx'
import DashTaskCard from '../components/DashTaskCard.jsx'
import { STATUSES, STATUS_KEYS, PRIORITIES } from '../constants.js'
import { startOfToday, parseYMD, projectColor } from '../utils.js'

/* ── Stat card ── */
function StatCard({ label, value, color, icon, sub }) {
  const { t } = useApp();
  return (
    <div style={{
      background: t.card, border: `1px solid ${t.border}`,
      borderRadius: 12, padding: "14px 16px",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 8, right: 10, opacity: 0.08 }}>
        <Icon name={icon} size={36} color={color} strokeWidth={1.25} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 6 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-1px", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ── Section header ── */
function SectionHead({ icon, title, color, count, action }) {
  const { t } = useApp();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={12} color={color} strokeWidth={2} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{title}</span>
      <span className="mono" style={{ fontSize: 11.5, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 6 }}>{count}</span>
      {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
    </div>
  );
}

/* ── Compact task row (for Čekám + To do) ── */
function CompactTaskRow({ task, color }) {
  const { t, projects, updateTask, setTaskDetail } = useApp();
  const project = projects.find((p) => p.id === task.projectId);
  const pr = task.priority ? PRIORITIES[task.priority] : null;
  const today = startOfToday();
  const todayStr = today.toISOString().slice(0, 10);
  const isOverdue = task.dueDate && task.dueDate < todayStr;
  const pColor = project ? projectColor(project.id) : null;

  return (
    <div
      onClick={() => setTaskDetail(task.id)}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, cursor: "pointer", transition: "background .1s" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = t.card; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {/* Status toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          const idx = STATUS_KEYS.indexOf(task.status);
          updateTask(task.id, { status: STATUS_KEYS[(idx + 1) % STATUS_KEYS.length] });
        }}
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0,
          border: `1.5px solid ${color}50`, background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: 2, background: color + "70" }} />
      </button>

      {/* Project color dot */}
      {pColor && <div style={{ width: 6, height: 6, borderRadius: "50%", background: pColor, flexShrink: 0 }} />}

      {/* Title */}
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task.title || "Bez názvu"}
      </span>

      {/* Priority dot */}
      {pr && <div style={{ width: 6, height: 6, borderRadius: "50%", background: pr.color, flexShrink: 0 }} title={pr.label} />}

      {/* Due date */}
      {task.dueDate && (
        <span className="mono" style={{ fontSize: 11, color: isOverdue ? "#ef4444" : t.text3, flexShrink: 0, fontWeight: isOverdue ? 700 : 400 }}>
          {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
        </span>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t, tasks, projects, notes, setPage, setOpenNoteId, search, isMobile } = useApp();

  const [doingOpen, setDoingOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);

  const today = startOfToday();
  const todayStr = today.toISOString().slice(0, 10);
  const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().slice(0, 10);

  const activeTasks = tasks.filter((x) => x.status !== "done");
  const activeP = projects.filter((p) => p.status === "active");
  const totalT = tasks.length;
  const doneT = tasks.filter((x) => x.status === "done").length;
  const starredT = tasks.filter((x) => x.starred && x.status !== "done");

  const overdue   = activeTasks.filter((x) => x.dueDate && x.dueDate < todayStr);
  const dueToday  = activeTasks.filter((x) => x.dueDate === todayStr);
  const doing     = activeTasks.filter((x) => x.status === "doing");
  const waiting   = activeTasks.filter((x) => x.status === "waiting");
  const todo      = activeTasks.filter((x) => x.status === "todo");

  const matchesSearch = (task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (task.title || "").toLowerCase().includes(s) || (task.description || "").toLowerCase().includes(s);
  };

  // Recent notes (last 3, sorted by updatedAt)
  const recentNotes = [...(notes || [])].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  // Completion rate this week
  const weekAgo = new Date(today.getTime() - 7 * 86400000).getTime();
  const doneThisWeek = tasks.filter((x) => x.status === "done" && x.updatedAt && x.updatedAt > weekAgo).length;

  const CollapseBtn = ({ open, setOpen, count, color }) => count > 3 ? (
    <button onClick={() => setOpen((v) => !v)} style={{ background: "none", border: "none", color, fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
      {open ? "Sbalit ▴" : `+${count - 3} dalších ▾`}
    </button>
  ) : null;

  return (
    <div style={{ padding: isMobile ? "16px 14px 80px" : "20px 24px", overflowY: "auto", height: "100%" }} className="fi">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, letterSpacing: "-0.6px", marginBottom: 2 }}>Přehled</h1>
          <p style={{ color: t.text2, fontSize: 13 }}>
            {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: isMobile ? undefined : "numeric" })}
          </p>
        </div>
        {!isMobile && (
          <div style={{ fontSize: 12, color: t.text3, textAlign: "right", lineHeight: 1.7, flexShrink: 0 }}>
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>N</span> nový úkol {"  ·  "}
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>⌘K</span> hledat
          </div>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <QuickAdd />
      </div>

      {/* Two-column grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
        gap: isMobile ? 12 : 24,
        alignItems: "start",
      }}>

        {/* ══ LEFT: Task sections ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>

          {tasks.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3, background: t.card, borderRadius: 14, border: `1px dashed ${t.border}` }}>
              <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>◇</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Zatím prázdno</div>
              <div style={{ fontSize: 13 }}>Přidej první úkol přes pole nahoře</div>
            </div>
          )}

          {/* ⭐ TOP úkoly */}
          {starredT.length > 0 && (
            <div style={{ background: "#eab30808", border: `1px solid #eab30830`, borderRadius: 12, padding: "12px 12px 8px" }}>
              <SectionHead icon="star" title="TOP úkoly" color="#eab308" count={starredT.filter(matchesSearch).length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {starredT.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#eab308" />)}
              </div>
            </div>
          )}

          {/* 🔴 Po termínu */}
          {overdue.length > 0 && (
            <div style={{ background: "#ef444408", border: `1px solid #ef444430`, borderRadius: 12, padding: "12px 12px 8px" }}>
              <SectionHead icon="alert-circle" title="Po termínu" color="#ef4444" count={overdue.filter(matchesSearch).length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {overdue.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#ef4444" />)}
              </div>
            </div>
          )}

          {/* 🟣 Dnes */}
          {dueToday.length > 0 && (
            <div style={{ background: "#a855f708", border: `1px solid #a855f730`, borderRadius: 12, padding: "12px 12px 8px" }}>
              <SectionHead icon="calendar" title="Dnes" color="#a855f7" count={dueToday.filter(matchesSearch).length} />
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {dueToday.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#a855f7" />)}
              </div>
            </div>
          )}

          {/* 🔵 Rozpracováno */}
          {(() => {
            const list = doing.filter(matchesSearch);
            const shown = doingOpen ? list : list.slice(0, 3);
            return (
              <div style={{ background: "#3b82f608", border: `1px solid #3b82f630`, borderRadius: 12, padding: "12px 12px 8px" }}>
                <SectionHead
                  icon="play-circle" title="Rozpracováno" color="#3b82f6" count={list.length}
                  action={<CollapseBtn open={doingOpen} setOpen={setDoingOpen} count={list.length} color="#3b82f6" />}
                />
                {list.length === 0
                  ? <div style={{ color: t.text3, fontSize: 12.5, padding: "8px 4px 2px", fontStyle: "italic" }}>Žádné rozpracované úkoly</div>
                  : <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>{shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#3b82f6" />)}</div>
                }
              </div>
            );
          })()}

          {/* 🟡 Čekám — kompaktní */}
          {waiting.length > 0 && (() => {
            const list = waiting.filter(matchesSearch);
            const shown = waitingOpen ? list : list.slice(0, 5);
            return (
              <div style={{ background: "#f59e0b08", border: `1px solid #f59e0b30`, borderRadius: 12, padding: "12px 12px 6px" }}>
                <SectionHead
                  icon="pause-circle" title="Čekám" color="#f59e0b" count={list.length}
                  action={<CollapseBtn open={waitingOpen} setOpen={setWaitingOpen} count={list.length} color="#f59e0b" />}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {shown.map((task) => <CompactTaskRow key={task.id} task={task} color="#f59e0b" />)}
                </div>
              </div>
            );
          })()}

          {/* ⬜ To do — kompaktní */}
          {(() => {
            const list = todo.filter(matchesSearch);
            if (list.length === 0) return null;
            const shown = todoOpen ? list : list.slice(0, 5);
            return (
              <div style={{ background: t.kanban, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 12px 6px" }}>
                <SectionHead
                  icon="circle" title="To do" color={t.text3} count={list.length}
                  action={<CollapseBtn open={todoOpen} setOpen={setTodoOpen} count={list.length} color={t.text2} />}
                />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {shown.map((task) => <CompactTaskRow key={task.id} task={task} color={t.text3} />)}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ══ RIGHT: Stats + Projects + Notes ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, order: isMobile ? -1 : 0, minWidth: 0 }}>

          {/* Stat cards 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <StatCard label="Aktivní úkoly" value={activeTasks.length} color="#3b82f6" icon="check-square" sub={`z ${totalT} celkem`} />
            <StatCard label="Hotovo" value={doneT} color="#22c55e" icon="check-circle" sub={`${doneThisWeek} tento týden`} />
            <StatCard label="Projekty" value={activeP.length} color="#8b5cf6" icon="folder" sub="aktivních" />
            <StatCard label="TOP úkoly" value={starredT.length} color="#eab308" icon="star" sub="označených" />
          </div>

          {/* Aktivní projekty */}
          {activeP.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 8, paddingLeft: 2 }}>
                Aktivní projekty
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {activeP.map((p) => {
                  const pt = tasks.filter((x) => x.projectId === p.id);
                  const done = pt.filter((x) => x.status === "done").length;
                  const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
                  const open = pt.filter((x) => x.status !== "done").length;
                  return (
                    <div key={p.id} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "10px 12px", borderLeft: `3px solid ${projectColor(p.id)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{p.name}</span>
                        <span className="mono" style={{ fontSize: 11.5, color: pct === 100 ? "#22c55e" : t.text3, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: t.input, marginBottom: 5 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${projectColor(p.id)}, #22c55e)`, borderRadius: 999, transition: "width .3s" }} />
                      </div>
                      <div style={{ fontSize: 11, color: t.text3 }}>{open} otevřených · {done} hotovo</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nedávné poznámky */}
          {recentNotes.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 8, paddingLeft: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Nedávné poznámky</span>
                <button onClick={() => setPage("notes")} style={{ background: "none", border: "none", color: t.accent, fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                  Zobrazit vše →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {recentNotes.map((note) => {
                  const preview = note.content?.replace(/#{1,3} /g, "").replace(/\*\*/g, "").replace(/\n/g, " ").trim().slice(0, 70) || "";
                  return (
                    <div
                      key={note.id}
                      onClick={() => { setOpenNoteId(note.id); setPage("notes"); }}
                      style={{
                        background: t.card, border: `1px solid ${t.border}`, borderRadius: 9,
                        padding: "10px 12px", cursor: "pointer", transition: "border-color .12s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderH; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {note.title || "Bez názvu"}
                      </div>
                      {preview && (
                        <div style={{ fontSize: 11.5, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {preview}
                        </div>
                      )}
                      <div style={{ fontSize: 10.5, color: t.text3, marginTop: 4, opacity: 0.7 }}>
                        {new Date(note.updatedAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overdue reminder (if any) */}
          {overdue.length > 0 && !isMobile && (
            <div style={{ background: "#ef444408", border: `1px solid #ef444430`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="alert-circle" size={16} color="#ef4444" strokeWidth={2} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "#ef4444" }}>{overdue.length} úkolů po termínu</div>
                <div style={{ fontSize: 11, color: t.text3 }}>Zkontroluj sekci vlevo</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
