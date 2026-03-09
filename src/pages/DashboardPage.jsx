import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import QuickAdd from '../components/QuickAdd.jsx'
import DashTaskCard from '../components/DashTaskCard.jsx'
import { STATUSES } from '../constants.js'
import { startOfToday, parseYMD, projectColor } from '../utils.js'

function StatCard({ label, value, color, icon, active, onClick }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color + "12" : t.card,
        border: `1px solid ${active ? color + "40" : t.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        textAlign: "left",
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: t.shadow,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.1 }}>
        <Icon name={icon} size={40} color={color} strokeWidth={1.25} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text2, marginBottom: 8 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}
      </div>
    </button>
  );
}

export default function DashboardPage() {
  const { t, tasks, projects, dashFilter, setDashFilter, search, openProject, isMobile } = useApp();

  const [doingOpen, setDoingOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);

  const today = startOfToday();
  const tmrw = new Date(today);
  tmrw.setDate(tmrw.getDate() + 1);
  const dayAfter = new Date(tmrw);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const activeP = projects.filter((p) => p.status === "active").length;
  const totalT = tasks.length;
  const doneT = tasks.filter((x) => x.status === "done").length;
  const waitingT = tasks.filter((x) => x.status === "waiting").length;
  const starredT = tasks.filter((x) => x.starred && x.status !== "done");

  const doing = tasks.filter((x) => x.status === "doing");
  const waitingAll = tasks.filter((x) => x.status === "waiting");
  const todo = tasks.filter((x) => x.status === "todo");

  const overdue = tasks.filter((x) => {
    const d = parseYMD(x.dueDate);
    return d && x.status !== "done" && d < today;
  });

  const dueToday = tasks.filter((x) => {
    if (!x.dueDate || x.status === "done") return false;
    const d = parseYMD(x.dueDate);
    return d && d.getTime() === today.getTime();
  });

  const dueSoon = tasks.filter((x) => {
    if (!x.dueDate || x.status === "done") return false;
    const d = parseYMD(x.dueDate);
    return d && d > today && d <= dayAfter;
  });

  const matchesSearch = (task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (task.title || "").toLowerCase().includes(s) || (task.description || "").toLowerCase().includes(s);
  };

  let filterContent = null;

  if (dashFilter === "active-projects") {
    const ap = projects.filter((p) => p.status === "active");
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Aktivní projekty</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {ap.map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const done = pt.filter((x) => x.status === "done").length;
          return (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", marginBottom: 8, cursor: "pointer" }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: t.text2 }}>{pt.length} úkolů, {done} hotovo</div>
            </div>
          );
        })}
      </div>
    );
  } else if (dashFilter === "total") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Všechny úkoly ({totalT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {tasks.filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "done") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#22c55e" }}>Hotové úkoly ({doneT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {tasks.filter((x) => x.status === "done").filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "waiting") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>Čekám ({waitingT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {waitingAll.filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "starred") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#eab308", display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="star" size={16} color="#eab308" fill="#eab308" strokeWidth={1.5} />
            TOP úkoly ({starredT.length})
          </h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {starredT.length === 0 ? (
          <div style={{ color: t.text3, fontSize: 12.5, padding: "16px 0", fontStyle: "italic" }}>
            Označ úkoly hvězdičkou ★ a budou se zobrazovat zde
          </div>
        ) : (
          starredT.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} />)
        )}
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === "active");

  // Helper: section header
  const SectionHead = ({ icon, title, color, count, action }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={12} color={color} strokeWidth={2} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{title}</span>
      <span className="mono" style={{ fontSize: 11.5, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 6 }}>{count}</span>
      {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "16px 14px" : "20px 20px" }} className="fi">

      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-end", justifyContent: "space-between", marginBottom: isMobile ? 14 : 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 2 }}>Přehled</h1>
          <p style={{ color: t.text2, fontSize: 13 }}>
            {new Date().toLocaleDateString("cs-CZ", { weekday: isMobile ? "short" : "long", day: "numeric", month: isMobile ? "numeric" : "long", year: isMobile ? undefined : "numeric" })}
          </p>
        </div>
        {!isMobile && (
          <div style={{ fontSize: 12, color: t.text3, textAlign: "right", lineHeight: 1.7, flexShrink: 0 }}>
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>N</span> nový úkol
            {"  ·  "}
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>Esc</span> zavřít
          </div>
        )}
      </div>

      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <QuickAdd />
      </div>

      {/* Layout: two-column on desktop, single on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(520px, 1fr) 480px", gap: isMobile ? 12 : 28, alignItems: "start", minWidth: isMobile ? 0 : 1060 }}>

        {/* ── LEFT: Focus ── */}
        <div>
          {/* Filter overlay replaces left column content */}
          {filterContent && <div className="fi">{filterContent}</div>}

          {!dashFilter && (
            <>
              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3, background: t.card, borderRadius: 14, border: `1px dashed ${t.border}` }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>◇</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>Zatím prázdno</div>
                  <div style={{ fontSize: 13 }}>Přidej první úkol přes pole nahoře nebo stiskni <kbd style={{ background: t.input, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>N</kbd></div>
                </div>
              )}

              {/* Starred */}
              {starredT.length > 0 && (
                <div style={{ background: t.kanban, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="star" title="TOP úkoly" color="#eab308" count={starredT.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {starredT.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#eab308" />)}
                  </div>
                </div>
              )}

              {/* Overdue */}
              {overdue.length > 0 && (
                <div style={{ background: "#ef444408", border: `1px solid #ef444425`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="alert-circle" title="Po termínu" color="#ef4444" count={overdue.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {overdue.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#ef4444" />)}
                  </div>
                </div>
              )}

              {/* Due today */}
              {dueToday.length > 0 && (
                <div style={{ background: "#a855f708", border: `1px solid #a855f725`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="calendar" title="Dnes" color="#a855f7" count={dueToday.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {dueToday.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#a855f7" />)}
                  </div>
                </div>
              )}

              {/* Doing — collapsible */}
              {(() => {
                const list = doing.filter(matchesSearch);
                const shown = doingOpen ? list : list.slice(0, 3);
                return (
                  <div style={{ background: "#3b82f608", border: `1px solid #3b82f625`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                    <SectionHead
                      icon="play-circle" title="Rozpracováno" color="#3b82f6" count={list.length}
                      action={list.length > 3 && (
                        <button onClick={() => setDoingOpen(v => !v)} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                          {doingOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                        </button>
                      )}
                    />
                    {list.length === 0 ? (
                      <div style={{ color: t.text3, fontSize: 12.5, padding: "8px 4px 2px", fontStyle: "italic" }}>Žádné rozpracované úkoly</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#3b82f6" />)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Due soon */}
              {dueSoon.length > 0 && (
                <div style={{ background: "#f9731608", border: `1px solid #f9731625`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="clock" title="Blíží se deadline" color="#f97316" count={dueSoon.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {dueSoon.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#f97316" />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Context ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 20, order: isMobile ? -1 : 0, minWidth: 0 }}>

          {/* Stat cards 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 6 : 8 }}>
            <StatCard label="Celkem úkolů" value={totalT} color="#8b5cf6" icon="list" active={dashFilter === "total"} onClick={() => setDashFilter(dashFilter === "total" ? null : "total")} />
            <StatCard label="Aktivní proj." value={activeP} color="#3b82f6" icon="folder" active={dashFilter === "active-projects"} onClick={() => setDashFilter(dashFilter === "active-projects" ? null : "active-projects")} />
            <StatCard label="Hotovo" value={doneT} color="#22c55e" icon="check-circle" active={dashFilter === "done"} onClick={() => setDashFilter(dashFilter === "done" ? null : "done")} />
            <StatCard label="TOP úkoly" value={starredT.length} color="#eab308" icon="star" active={dashFilter === "starred"} onClick={() => setDashFilter(dashFilter === "starred" ? null : "starred")} />
          </div>

          {/* Active projects */}
          {activeProjects.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 8 }}>Aktivní projekty</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeProjects.map((p) => {
                  const pt = tasks.filter((x) => x.projectId === p.id);
                  const done = pt.filter((x) => x.status === "done").length;
                  const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
                  return (
                    <div key={p.id} onClick={() => openProject(p.id)} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer", borderLeft: `3px solid ${projectColor(p.id)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                        <span className="mono" style={{ fontSize: 11.5, color: pct === 100 ? "#22c55e" : t.text3, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 999, background: t.input }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${projectColor(p.id)}, #22c55e)`, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting — collapsible */}
          {waitingAll.length > 0 && (() => {
            const list = waitingAll.filter(matchesSearch);
            const shown = waitingOpen ? list : list.slice(0, 3);
            return (
              <div style={{ background: "#f59e0b08", border: `1px solid #f59e0b25`, borderRadius: 12, padding: "12px 12px 8px" }}>
                <SectionHead
                  icon="pause-circle" title="Čekám" color="#f59e0b" count={list.length}
                  action={list.length > 3 && (
                    <button onClick={() => setWaitingOpen(v => !v)} style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                      {waitingOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                    </button>
                  )}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#f59e0b" />)}
                </div>
              </div>
            );
          })()}

          {/* To do — collapsible */}
          {(() => {
            const list = todo.filter(matchesSearch);
            const shown = todoOpen ? list : list.slice(0, 3);
            return (
              <div style={{ background: t.kanban, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 12px 8px" }}>
                <SectionHead
                  icon="list" title="To do" color="#8b95a5" count={list.length}
                  action={list.length > 3 && (
                    <button onClick={() => setTodoOpen(v => !v)} style={{ background: "none", border: "none", color: t.text2, fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                      {todoOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                    </button>
                  )}
                />
                {list.length === 0 ? (
                  <div style={{ color: t.text3, fontSize: 12, padding: "6px 4px 2px", fontStyle: "italic" }}>To do je prázdné</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#8b95a5" />)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
