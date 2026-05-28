// CORTEX — Task manager redesign, direction A
// Linear/terminal precision, info-dense, violet accent

const { useState, useEffect, useMemo, useRef } = React;

// === ICONS (inline SVG, single weight) ===
const Icon = {
  home: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12L12 4l9 8M5 10v10h14V10"/></svg>,
  bolt: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  folder: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  cal: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  tag: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 12l-8 8-9-9V3h8l9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>,
  note: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H5v18h14V8l-5-5z"/><path d="M14 3v5h5"/></svg>,
  bell: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>,
  search: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  star: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  star_outline: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  chev: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  cl: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  plus: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  alert: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h0"/></svg>,
  flame: () => <span style={{display:'inline-block', transform:'translateY(-1px)'}}>🔥</span>,
  spark: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/><path d="M19 14l.7 2 2 .8-2 .7-.7 2.3-.7-2.3-2-.7 2-.8z"/></svg>,
  drag: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>,
};

// === Small components ===

function ProjectPill({ projectId, withDot = true }) {
  const p = window.findProject(projectId);
  if (!p) return null;
  return (
    <span className="proj-pill" style={{ "--proj-color": p.color }}>
      {withDot && <span className="pp-dot" />}
      {p.name}
    </span>
  );
}

function Tag({ name }) {
  return <span className="tag-pill">{name}</span>;
}

function PriorityChip({ p }) {
  const meta = window.PRIORITY_META[p] || window.PRIORITY_META.none;
  if (p === "none" || !p) return null;
  return (
    <span className="prio" style={{ "--prio-color": meta.color }}>
      {meta.glyph} {meta.label}
    </span>
  );
}

function StatusControl({ status, onChange }) {
  return (
    <div className="statusctl">
      {window.STATUS_ORDER.map(s => {
        const m = window.STATUS_META[s];
        const is = status === s;
        return (
          <button
            key={s}
            className={`${is ? `is ${s}` : ""}`}
            onClick={(e) => { e.stopPropagation(); onChange?.(s); }}
            title={m.label}
          >
            {m.short}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({ task, onOpen, onStatusChange, onStar, compact = false }) {
  const proj = window.findProject(task.project);
  const isAlert = task.overdue;
  return (
    <div
      className={`tcard ${task.status} ${isAlert ? "alert" : ""}`}
      onClick={() => onOpen?.(task)}
    >
      <div
        className="tcard-check"
        onClick={(e) => {
          e.stopPropagation();
          const next = task.status === "done" ? "todo" : "done";
          onStatusChange?.(task.id, next);
        }}
        title="Označit hotovo"
      />

      <div className="tcard-body">
        <div className="tcard-title-row">
          <div className="tcard-title">{task.title}</div>
          {task.hasSubtasks ? (
            <span className="tcard-id mono">≡{task.hasSubtasks}</span>
          ) : null}
        </div>
        {task.desc && !compact ? (
          <div className="tcard-desc">{task.desc}</div>
        ) : null}
        <div className="tcard-meta">
          <ProjectPill projectId={task.project} />
          {task.priority && task.priority !== "none" && task.priority !== "medium" ? (
            <PriorityChip p={task.priority} />
          ) : null}
          {task.due ? (
            <span className={`due ${task.overdue ? "overdue" : ""}`}>
              {task.overdue ? "⚠ " : ""}{task.due}
            </span>
          ) : null}
          {task.tags?.map(t => <Tag key={t} name={t} />)}
        </div>
      </div>

      <div className="tcard-actions" onClick={(e) => e.stopPropagation()}>
        <StatusControl status={task.status} onChange={(s) => onStatusChange?.(task.id, s)} />
        <button
          className={`icon-btn star ${task.starred ? "on" : ""}`}
          onClick={() => onStar?.(task.id)}
          title="Top úkol"
        >
          {task.starred ? <Icon.star /> : <Icon.star_outline />}
        </button>
      </div>
    </div>
  );
}

// === SIDEBAR ===
function MiniCal({ onPick }) {
  // May 2026 — Cz: weeks starting Monday
  // 1.5. = Friday. Render full grid.
  const weeks = [
    [{d:27,m:"prev"},{d:28,m:"prev"},{d:29,m:"prev"},{d:30,m:"prev"},{d:1},{d:2},{d:3}],
    [{d:4},{d:5},{d:6},{d:7},{d:8},{d:9},{d:10}],
    [{d:11},{d:12},{d:13},{d:14},{d:15},{d:16},{d:17}],
    [{d:18},{d:19},{d:20},{d:21},{d:22},{d:23},{d:24}],
    [{d:25},{d:26,has:"overdue"},{d:27,today:true,has:true},{d:28},{d:29,has:true},{d:30},{d:31}],
  ];
  return (
    <div className="sb-cal">
      <div className="sb-cal-head">
        <span className="sb-cal-month">Květen 2026</span>
        <span className="sb-cal-nav">
          <span>‹</span><span>›</span>
        </span>
      </div>
      <div className="sb-cal-grid">
        {["Po","Út","St","Čt","Pá","So","Ne"].map((d,i) => <div key={"dh"+i} className="sb-cal-dh">{d[0]}</div>)}
        {weeks.flat().map((c, i) => (
          <div
            key={i}
            className={`sb-cal-d ${c.m === "prev" ? "muted" : ""} ${c.today ? "today" : ""} ${c.has ? "has" : ""} ${c.has === "overdue" ? "overdue" : ""}`}
            onClick={() => onPick?.(c.d)}
          >{c.d}</div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, projectId, setProjectId }) {
  const nav = [
    { id: "prehled", label: "Přehled", icon: Icon.home },
    { id: "rychly", label: "Rychlý seznam", icon: Icon.bolt, count: 2 },
    { id: "projekty", label: "Projekty", icon: Icon.folder },
    { id: "ukoly", label: "Úkoly", icon: Icon.check, count: 32 },
    { id: "plan", label: "Plán", icon: Icon.cal },
    { id: "tagy", label: "Tagy", icon: Icon.tag },
    { id: "poznamky", label: "Poznámky", icon: Icon.note },
  ];
  const activeProjects = window.PROJECTS.filter(p => p.status === "aktivní");

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <div className="sb-logo">CX</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Cortex</div>
          <div className="sb-brand-ver">v2.0 · personal OS</div>
        </div>
      </div>

      <div className="sb-ws">
        <div className="sb-ws-badge">A</div>
        <div className="sb-ws-name">Avenier</div>
        <span className="sb-ws-arrow">▾</span>
      </div>

      <div className="sb-search">
        <Icon.search />
        <input placeholder="Filtruj nebo Enter…" />
        <span className="sb-search-kbd">⌘K</span>
      </div>

      <nav className="sb-nav">
        {nav.map(n => {
          const I = n.icon;
          return (
            <div
              key={n.id}
              className={`sb-nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => { setPage(n.id); setProjectId(null); }}
            >
              <I className="sb-nav-icon" />
              <span className="sb-nav-label">{n.label}</span>
              {n.count != null ? <span className="sb-nav-count mono tabular">{n.count}</span> : null}
            </div>
          );
        })}
      </nav>

      <MiniCal />

      <div className="sb-section">
        <span>Aktivní projekty</span>
        <span className="sb-section-action" title="Nový projekt">+</span>
      </div>
      <div className="sb-projects">
        {activeProjects.map(p => (
          <div
            key={p.id}
            className="sb-proj"
            onClick={() => { setPage("projekty-detail"); setProjectId(p.id); }}
          >
            <span className="sb-proj-dot" style={{ background: p.color }} />
            <span className="sb-proj-name">{p.name}</span>
            <span className="sb-proj-count tabular">{p.openTasks}</span>
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-foot-avatar">MZ</div>
        <div className="sb-foot-meta">
          <div className="sb-foot-name">Michal Zich</div>
          <div className="sb-foot-ver">v2.0.0 · Tmavý režim</div>
        </div>
        <div className="sb-foot-theme" />
      </div>
    </aside>
  );
}

// === TOP BAR ===
function TopBar({ crumbs }) {
  return (
    <div className="topbar">
      <div className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i === crumbs.length - 1 ? "active" : ""}>{c}</span>
            {i < crumbs.length - 1 ? <span className="sep">/</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="tb-actions">
        <button className="tb-btn"><Icon.plus /> Nový úkol <kbd>N</kbd></button>
        <button className="tb-btn"><Icon.search /> Hledat <kbd>⌘K</kbd></button>
        <button className="tb-bell"><Icon.bell /><span className="tb-bell-dot" /></button>
      </div>
    </div>
  );
}

// === Right rail ===
function Donut() {
  const counts = useMemo(() => ({
    todo: window.tasksByStatus("todo").length,
    doing: window.tasksByStatus("doing").length,
    wait: window.tasksByStatus("wait").length,
    done: 23,
  }), []);
  const total = counts.todo + counts.doing + counts.wait + counts.done;
  const r = 36, c = 2 * Math.PI * r;
  const segs = [
    { k: "doing", color: "var(--blue)", v: counts.doing, lab: "Rozpracováno" },
    { k: "wait",  color: "var(--amber)", v: counts.wait, lab: "Čekám" },
    { k: "todo",  color: "var(--text-2)", v: counts.todo, lab: "To do" },
    { k: "done",  color: "var(--green)", v: counts.done, lab: "Hotovo" },
  ];
  let acc = 0;
  return (
    <div className="donut-block">
      <div className="donut">
        <svg width="88" height="88">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
          {segs.map(s => {
            const frac = s.v / total;
            const dasharray = `${frac * c} ${c}`;
            const dashoffset = -acc * c;
            acc += frac;
            return (
              <circle
                key={s.k}
                cx="44" cy="44" r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="8"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
              />
            );
          })}
        </svg>
        <div className="donut-center">
          <div className="donut-num tabular">{total - counts.done}</div>
          <div className="donut-sub">aktivních</div>
        </div>
      </div>
      <div className="donut-legend">
        {segs.map(s => (
          <div key={s.k} className="donut-leg-row">
            <span className="donut-leg-dot" style={{ background: s.color }} />
            <span className="donut-leg-label">{s.lab}</span>
            <span className="donut-leg-val tabular">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakBlock() {
  const s = window.WORKSPACE.streak;
  return (
    <div className="streak-block">
      <div className="streak-top">
        <span className="streak-num tabular">{s.current}</span>
        <span className="streak-flame"><Icon.flame /></span>
        <span className="streak-cap">dní v řadě · best {s.best}</span>
      </div>
      <div className="streak-grid">
        {s.weeks.map((w, i) => (
          <div key={i} className="streak-col">
            {w.map((d, j) => (
              <div key={j} className={`streak-cell ${d ? "l"+d : ""}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectProgress({ onClick }) {
  return (
    <>
      {window.PROJECTS.filter(p => p.status === "aktivní" && p.total > 0).slice(0, 8).map(p => (
        <div key={p.id} className="pp-row" onClick={() => onClick?.(p.id)} style={{cursor:"pointer"}}>
          <div className="pp-top">
            <span className="pp-dot" style={{ background: p.color }} />
            <span className="pp-name">{p.name}</span>
            <span className="pp-pct tabular">{p.progress}%</span>
          </div>
          <div className="pp-bar">
            <div className="pp-bar-fill" style={{ width: `${p.progress}%`, background: p.color }} />
          </div>
          <div className="pp-sub">{p.openTasks} otev. · {p.doneTasks} hotových</div>
        </div>
      ))}
    </>
  );
}

function RightRail({ goTo }) {
  return (
    <aside className="rail">
      <div className="rail-section">
        <div className="rail-head"><span>Stav · z 55 celkem</span><a>Detail</a></div>
        <Donut />
      </div>
      <div className="rail-section">
        <div className="rail-head"><span>Streak · květen</span><a>Heatmap</a></div>
        <StreakBlock />
      </div>
      <div className="rail-section">
        <div className="rail-head"><span>Progress projektů</span><a onClick={() => goTo("projekty")}>Vše</a></div>
        <ProjectProgress onClick={(id) => goTo("projekty-detail", id)} />
      </div>
      <div className="rail-section">
        <div className="rail-head"><span>Nedávné poznámky</span><a onClick={() => goTo("poznamky")}>Vše →</a></div>
        {window.NOTES.map(n => (
          <div key={n.id} className="note-row">
            <div className="note-title">{n.title}</div>
            <div className="note-excerpt">{n.excerpt}</div>
            <div className="note-date">{n.date}{n.project ? ` · ${window.findProject(n.project)?.name || ""}` : ""}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ============ PAGE: PŘEHLED =============
function PagePrehled({ tasks, setTasks, openTask }) {
  const [filter, setFilter] = useState("all");
  const [aiOpen, setAiOpen] = useState(true);

  const overdue = tasks.filter(t => t.overdue && t.status !== "done");
  const doing = tasks.filter(t => t.status === "doing" && !t.overdue);
  const wait = tasks.filter(t => t.status === "wait");
  const todo = tasks.filter(t => t.status === "todo");

  const setStatus = (id, s) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: s, overdue: s === "done" ? false : t.overdue } : t));
  };
  const toggleStar = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));
  };

  const showSection = (key) => filter === "all" || filter === key;

  return (
    <div className="content">
      {/* page head */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Přehled</h1>
          <div className="page-sub">
            <span>{window.WORKSPACE.today.fmt}</span>
            <span className="dot" />
            <span><span className="live-dot" /> &nbsp;sync · before 1 min</span>
          </div>
        </div>
      </div>

      {/* HUD tiles */}
      <div className="hud">
        <div className="hud-tile accent">
          <div className="hud-label">Aktivní</div>
          <div className="hud-value tabular">32<span className="hud-unit">/55</span></div>
          <div className="hud-trend up">+3 dnes</div>
        </div>
        <div className="hud-tile alert">
          <div className="hud-label">Po termínu</div>
          <div className="hud-value tabular">{overdue.length}</div>
          <div className="hud-trend down">⚠ vyřeš dnes</div>
        </div>
        <div className="hud-tile">
          <div className="hud-label">Hotovo (týden)</div>
          <div className="hud-value tabular">23<span className="hud-unit">úk.</span></div>
          <div className="hud-trend up">↗ 41 % over avg</div>
        </div>
        <div className="hud-tile">
          <div className="hud-label">Streak</div>
          <div className="hud-value tabular" style={{color:"var(--orange)"}}>12<span className="hud-unit">dní</span></div>
          <div className="hud-trend">best · 28</div>
        </div>
        <div className="hud-tile">
          <div className="hud-label">Projekty</div>
          <div className="hud-value tabular">14<span className="hud-unit">/15</span></div>
          <div className="hud-trend">1 hotový</div>
        </div>
      </div>

      {/* AI compact bar */}
      <div className="aibar">
        <div className="aibar-icon"><Icon.spark /></div>
        <div className="aibar-text">
          <div className="aibar-title">AI denní plán</div>
          <div className="aibar-sub">32 aktivních · 4 návrhy připravené · {overdue.length} po termínu</div>
        </div>
        <span className="aibar-mini">claude-4.5</span>
        <button className="aibar-btn" onClick={() => setAiOpen(!aiOpen)}>
          <Icon.spark /> {aiOpen ? "Zavřít" : "Vygenerovat"}
        </button>
      </div>
      {aiOpen ? (
        <div className="aisug">
          {window.AI_SUGGESTIONS.map((s, i) => {
            const t = window.findTask(s.taskId);
            return (
              <div key={s.id} className="aisug-row" onClick={() => openTask(t)}>
                <span className="aisug-num">{String(i+1).padStart(2,"0")}</span>
                <div className="aisug-text">
                  <div className="aisug-name">{t.title}</div>
                  <div className="aisug-reason">{s.reason}</div>
                </div>
                <span className="aisug-tag">{s.weight}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* quick add */}
      <div style={{height: 16}} />
      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input placeholder="Nový úkol… (např. 'AI brief Web OC do pátku')" />
        <span className="quickadd-kbd">N / Enter</span>
      </div>

      {/* filter chips */}
      <div className="chips">
        <span className="chip active" onClick={() => setFilter("all")}>
          <span className="chip-dot" /> Vše <span className="chip-count">{tasks.length}</span>
        </span>
        <span className={`chip ${filter==="overdue"?"active":""}`} onClick={() => setFilter("overdue")}>
          <span className="chip-dot" style={{background:"var(--red)"}} /> Po termínu <span className="chip-count">{overdue.length}</span>
        </span>
        <span className={`chip ${filter==="doing"?"active":""}`} onClick={() => setFilter("doing")}>
          <span className="chip-dot" style={{background:"var(--blue)"}} /> Rozpracováno <span className="chip-count">{doing.length}</span>
        </span>
        <span className={`chip ${filter==="wait"?"active":""}`} onClick={() => setFilter("wait")}>
          <span className="chip-dot" style={{background:"var(--amber)"}} /> Čekám <span className="chip-count">{wait.length}</span>
        </span>
        <span className={`chip ${filter==="todo"?"active":""}`} onClick={() => setFilter("todo")}>
          <span className="chip-dot" style={{background:"var(--text-3)"}} /> To do <span className="chip-count">{todo.length}</span>
        </span>
        <span className="chip">
          <span className="chip-dot" style={{background:"var(--amber)"}} /> Top úkoly <span className="chip-count">{tasks.filter(t=>t.starred).length}</span>
        </span>
        <span className="chips-sep" />
        <span className="chips-act">Seskupit ▾</span>
        <span className="chips-act">Řadit ▾</span>
      </div>

      {/* Sections */}
      {overdue.length > 0 && showSection("overdue") ? (
        <section className="section">
          <div className="section-head">
            <span className="section-marker alert" />
            <span className="section-title alert">Po termínu</span>
            <span className="section-count tabular">{overdue.length}</span>
          </div>
          <div className="tcards">
            {overdue.map(t => <TaskCard key={t.id} task={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
          </div>
        </section>
      ) : null}

      {doing.length > 0 && showSection("doing") ? (
        <section className="section">
          <div className="section-head">
            <span className="section-marker doing" />
            <span className="section-title">Rozpracováno</span>
            <span className="section-count tabular">{doing.length}</span>
            <span className="section-sep" />
            <span className="section-act">+12 dalších</span>
          </div>
          <div className="tcards">
            {doing.slice(0, 3).map(t => <TaskCard key={t.id} task={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
          </div>
        </section>
      ) : null}

      {wait.length > 0 && showSection("wait") ? (
        <section className="section">
          <div className="section-head">
            <span className="section-marker wait" />
            <span className="section-title">Čekám</span>
            <span className="section-count tabular">{wait.length}</span>
            <span className="section-sep" />
            <span className="section-act">+{Math.max(0, wait.length-3)} dalších</span>
          </div>
          <div className="tcards">
            {wait.slice(0, 3).map(t => <TaskCard key={t.id} task={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
          </div>
        </section>
      ) : null}

      {todo.length > 0 && showSection("todo") ? (
        <section className="section">
          <div className="section-head">
            <span className="section-marker todo" />
            <span className="section-title">To do</span>
            <span className="section-count tabular">{todo.length}</span>
          </div>
          <div className="tcards">
            {todo.slice(0, 3).map(t => <TaskCard key={t.id} task={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ============ PAGE: PROJEKTY =============
function PageProjekty({ onOpenProject }) {
  const [tab, setTab] = useState("aktivni");
  const tabs = [
    { id: "vse", label: "Vše", count: 15 },
    { id: "aktivni", label: "Aktivní", count: 14 },
    { id: "napady", label: "Nápady", count: 0 },
    { id: "hotove", label: "Hotové", count: 1 },
    { id: "archiv", label: "Archiv", count: 0 },
  ];
  const filtered = window.PROJECTS.filter(p => tab === "vse" || (tab === "aktivni" && p.status === "aktivní") || (tab === "hotove" && p.status === "hotový"));

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Projekty</h1>
          <div className="page-sub">
            <span className="mono tabular">15 projektů</span><span className="dot" />
            <span className="mono">14 aktivních</span><span className="dot" />
            <span className="mono">1 hotový</span>
          </div>
        </div>
        <button className="btn primary"><Icon.plus /> Nový projekt</button>
      </div>

      <div className="chips">
        {tabs.map(t => (
          <span key={t.id} className={`chip ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="chip-count">{t.count}</span>
          </span>
        ))}
        <span className="chips-sep" />
        <span className="chips-act">Seskupit podle stavu ▾</span>
      </div>

      <div className="proj-grid">
        {filtered.map(p => (
          <div key={p.id} className="proj-card" style={{ "--proj-color": p.color }} onClick={() => onOpenProject(p.id)}>
            <div className="proj-card-top">
              <span className="proj-card-status mono">{p.status}</span>
              <span style={{color:"var(--text-4)"}}>→</span>
            </div>
            <div className="proj-card-name">{p.name}</div>
            <div className="proj-card-meta">{p.total} úkolů celkem{p.overdueCount ? ` · ⚠ ${p.overdueCount} po termínu` : ""}</div>
            <div className="proj-card-counts">
              {p.openTasks > 0 ? <span className="pcc todo">○ {p.openTasks - (tasksDoingFor(p.id)||0) - (tasksWaitFor(p.id)||0)}</span> : null}
              {tasksDoingFor(p.id) > 0 ? <span className="pcc doing">◐ {tasksDoingFor(p.id)}</span> : null}
              {tasksWaitFor(p.id) > 0 ? <span className="pcc wait">◑ {tasksWaitFor(p.id)}</span> : null}
              {p.doneTasks > 0 ? <span className="pcc done">● {p.doneTasks}</span> : null}
            </div>
            <div className="proj-card-bar">
              <div className="proj-card-bar-fill" style={{ width: `${p.progress}%` }} />
            </div>
            <div className="proj-card-foot">
              <span className="mono" style={{fontSize:11, color:"var(--text-3)"}}>{p.doneTasks}/{p.total} hotových</span>
              <span className="proj-card-pct tabular">{p.progress}%</span>
            </div>
          </div>
        ))}
        <div className="proj-card" style={{borderStyle:"dashed", borderColor: "var(--border)", borderLeftColor:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"var(--text-3)", minHeight: 200}}>
          <Icon.plus />
          <span style={{marginTop:8}}>Nový projekt</span>
        </div>
      </div>
    </div>
  );
}
function tasksDoingFor(pid){ return window.TASKS.filter(t=>t.project===pid && t.status==="doing").length; }
function tasksWaitFor(pid){ return window.TASKS.filter(t=>t.project===pid && t.status==="wait").length; }

// ============ PAGE: PROJECT DETAIL (Kanban) =============
function PageProjectDetail({ projectId, openTask, onBack }) {
  const p = window.findProject(projectId);
  if (!p) return null;
  const tasks = window.tasksByProject(projectId);
  const cols = [
    { id: "todo", label: "To do", color: "var(--text-2)" },
    { id: "doing", label: "Rozpracováno", color: "var(--blue)" },
    { id: "wait", label: "Čekám", color: "var(--amber)" },
    { id: "done", label: "Hotovo", color: "var(--green)" },
  ];
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <div className="page-sub" style={{marginBottom: 8, cursor:"pointer"}} onClick={onBack}>
            <span>← Projekty</span><span className="dot" /><span>{p.name}</span>
          </div>
          <h1 className="page-title" style={{display:"flex", alignItems:"center", gap:12}}>
            <span style={{width:10, height:10, borderRadius:3, background:p.color, display:"inline-block"}} />
            {p.name}
            <span style={{
              fontFamily:"var(--font-mono)", fontSize:11, textTransform:"uppercase",
              padding:"3px 8px", borderRadius:4, background:"var(--violet-soft)", color:"var(--violet)",
              letterSpacing:"0.1em"
            }}>{p.status}</span>
          </h1>
          <div className="page-sub"><span className="mono">{p.total} úkolů</span><span className="dot" /><span className="mono">{p.progress}% hotových</span></div>
        </div>
        <div className="row">
          <button className="btn">Upravit</button>
          <button className="btn danger">Smazat</button>
        </div>
      </div>

      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input placeholder={`Nový úkol v projektu ${p.name}…`} />
        <span className="quickadd-kbd">N / Enter</span>
      </div>

      <div className="kanban">
        {cols.map(c => {
          const colTasks = tasks.filter(t => t.status === c.id);
          return (
            <div key={c.id} className="kcol" style={{ "--col-color": c.color }}>
              <div className="kcol-head">
                <span className="kcol-name">{c.label}</span>
                <span className="kcol-count mono">{colTasks.length}</span>
                <span className="kcol-add">+</span>
              </div>
              {colTasks.map(t => (
                <div key={t.id} className="kcard" onClick={() => openTask(t)}>
                  <div className="kcard-title">{t.title}</div>
                  <div className="kcard-meta">
                    {t.priority && t.priority !== "medium" && t.priority !== "none" ? <PriorityChip p={t.priority} /> : null}
                    {t.tags?.slice(0,2).map(tg => <Tag key={tg} name={tg} />)}
                    {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.due}</span> : null}
                  </div>
                  {t.hasSubtasks ? <div className="kcard-id mono">≡ {t.hasSubtasks} podúkoly</div> : null}
                </div>
              ))}
              {colTasks.length === 0 ? (
                <div className="kcard" style={{borderStyle:"dashed", textAlign:"center", color:"var(--text-3)", cursor:"pointer"}}>+ Přidat úkol</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ PAGE: ÚKOLY (table) =============
function PageUkoly({ tasks, setTasks, openTask }) {
  const [view, setView] = useState("table");
  const [filter, setFilter] = useState("vse");
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Úkoly</h1>
          <div className="page-sub"><span className="mono tabular">{tasks.length} aktivních · 55 celkem</span></div>
        </div>
        <div className="row">
          <div className="statusctl">
            <button className={view==="cards"?"is doing":""} onClick={() => setView("cards")}>Karty</button>
            <button className={view==="table"?"is doing":""} onClick={() => setView("table")}>Tabulka</button>
          </div>
        </div>
      </div>

      <div className="chips">
        {["vse","todo","doing","wait","done"].map(f => (
          <span key={f} className={`chip ${filter===f?"active":""}`} onClick={() => setFilter(f)}>
            {f === "vse" ? "Vše" : window.STATUS_META[f]?.label}
          </span>
        ))}
        <span style={{width:1, height:18, background:"var(--border-soft)", margin:"0 4px"}} />
        <span className="chip"><Icon.alert /> Priorita</span>
        <span className="chip">Bez filtru projektu</span>
        <span className="chips-sep" />
        <span className="chips-act">+ Filtr</span>
      </div>

      {view === "table" ? (
        <div className="ttable">
          <div className="ttable-row head">
            <div></div>
            <div className="sort active">Název ↑</div>
            <div className="sort">Status</div>
            <div className="sort">Priorita</div>
            <div className="sort">Projekt</div>
            <div className="sort">Termín</div>
            <div className="sort">Vytvořeno</div>
          </div>
          {tasks.slice(0, 14).map(t => {
            const m = window.STATUS_META[t.status];
            const proj = window.findProject(t.project);
            return (
              <div key={t.id} className="ttable-row" onClick={() => openTask(t)} style={{cursor:"pointer"}}>
                <div><input type="checkbox" /></div>
                <div>
                  <div style={{fontWeight: 500, color: t.status === "done" ? "var(--text-3)" : "var(--text)", textDecoration: t.status === "done" ? "line-through" : "none"}}>{t.title}</div>
                </div>
                <div><span className="ttable-status"><span className="dot" style={{background:m.color}} />{m.label}</span></div>
                <div><PriorityChip p={t.priority} /></div>
                <div>{proj ? <ProjectPill projectId={t.project} /> : <span style={{color:"var(--text-4)"}}>Inbox</span>}</div>
                <div><span className={`ttable-date ${t.overdue ? "overdue" : ""}`}>{t.due || "—"}</span></div>
                <div className="ttable-date">11. 3.</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="tcards" style={{marginTop: 8}}>
          {tasks.slice(0, 10).map(t => <TaskCard key={t.id} task={t} onOpen={openTask} onStatusChange={(id,s)=>setTasks(prev=>prev.map(x=>x.id===id?{...x,status:s}:x))} />)}
        </div>
      )}
    </div>
  );
}

// ============ PAGE: PLÁN (timeline) =============
function PagePlan({ tasks, openTask }) {
  const days = Array.from({length: 28}, (_, i) => i + 1);
  const today = 27;
  const rows = window.PROJECTS.filter(p => p.status === "aktivní").slice(0, 9);
  // example tasks placement
  const placements = [
    { project: "oc", title: "AI odpovědi na e-maily", start: 26, span: 1, color: "#3b82f6", overdue: true, taskId: 1 },
    { project: "spolu", title: "Spolupráce: Cestujzababku.cz", start: 26, span: 1, color: "#fb923c", overdue: true, taskId: 2 },
    { project: "oc", title: "Chatbot", start: 13, span: 5, color: "#3b82f6", taskId: 4 },
    { project: "dc", title: "Automatizace období", start: 5, span: 4, color: "#ec4899", taskId: 7 },
    { project: "aiav", title: "Domluvit Davida", start: 11, span: 2, color: "#f97316", taskId: 5 },
    { project: "or", title: "Zvýšení klientů OC TIT", start: 18, span: 8, color: "#f43f5e", taskId: 6 },
    { project: "vmd", title: "Videomedailonek Tomáš", start: 8, span: 3, color: "#06b6d4" },
    { project: "adhoc", title: "Brief AI Avenier", start: 14, span: 4, color: "#14b8a6" },
    { project: "med", title: "Medevio kickoff", start: 20, span: 4, color: "#e11d48" },
    { project: "oc", title: "Web OC release", start: 22, span: 4, color: "#3b82f6" },
  ];

  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Plán</h1>
          <div className="page-sub"><span className="mono">29. dubna – 26. května 2026</span><span className="dot" /><span className="mono">2 po termínu</span></div>
        </div>
        <div className="row">
          <button className="btn">← Zpět</button>
          <button className="btn primary">Dnes</button>
          <button className="btn">Vpřed →</button>
        </div>
      </div>

      <div className="tl">
        <div className="tl-head">
          <div style={{padding:"8px 14px", fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>Projekt</div>
          <div className="tl-head-r">
            {days.map(d => {
              const dow = (d - 1 + 2) % 7; // approximate; 0=Mon
              const isWE = dow === 5 || dow === 6;
              return (
                <div key={d} className={`tl-head-d ${d === today ? "today" : ""} ${isWE ? "we" : ""}`}>
                  <div>{d}.5</div>
                </div>
              );
            })}
          </div>
        </div>
        {rows.map(p => (
          <div key={p.id} className="tl-row">
            <div className="tl-lab">
              <span className="pp-dot" style={{ background: p.color }} />
              <span style={{flex:1}}>{p.name}</span>
              <span className="mono" style={{fontSize:10, color:"var(--text-4)"}}>{p.openTasks}</span>
            </div>
            <div className="tl-grid">
              {days.map(d => <div key={d} className={`tl-gc ${d===today?"today":""}`} />)}
              {placements.filter(x => x.project === p.id).map((x, i) => (
                <div
                  key={i}
                  className="tl-task"
                  style={{
                    left: `calc(${(x.start - 1) / 28 * 100}% + 2px)`,
                    width: `calc(${x.span / 28 * 100}% - 4px)`,
                    background: x.overdue ? `linear-gradient(90deg, ${x.color}, var(--red))` : x.color,
                    border: x.overdue ? "1px solid var(--red)" : "none",
                  }}
                  onClick={() => x.taskId && openTask(window.findTask(x.taskId))}
                >
                  {x.title}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop: 12, display:"flex", gap: 16, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--text-3)"}}>
        <span style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:12, height:12, background:"linear-gradient(90deg, var(--blue), var(--red))", borderRadius:2}} /> Po termínu</span>
        <span style={{display:"flex", alignItems:"center", gap:6}}><Icon.cal /> Opakující se</span>
        <span style={{display:"flex", alignItems:"center", gap:6}}><span style={{width:12, height:12, background:"var(--violet-soft)", border:"1px solid var(--violet)", borderRadius:2}} /> Dnešní den</span>
        <span className="chips-sep" />
        <span>Klikem na úkol otevřeš detail</span>
      </div>
    </div>
  );
}

// ============ TASK DETAIL MODAL =============
function TaskDetail({ task, onClose, onChange }) {
  if (!task) return null;
  const proj = window.findProject(task.project);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="detail" onClick={e => e.stopPropagation()}>
        <div className="detail-top">
          <div className="detail-top-l">
            <Icon.check />
            <span>Detail úkolu</span>
            <span className="mono" style={{color:"var(--text-4)"}}>·</span>
            <span className="mono" style={{color:"var(--text-4)"}}>#{task.id.toString().padStart(4,"0")}</span>
          </div>
          <div className="row">
            <button className="btn danger">Smazat</button>
            <button className="icon-btn" onClick={onClose}><Icon.cl /></button>
          </div>
        </div>
        <div className="detail-body">
          <div className="row" style={{gap: 8, marginBottom: 12}}>
            <button className={`icon-btn star ${task.starred?"on":""}`} onClick={() => onChange({starred: !task.starred})}>
              {task.starred ? <Icon.star /> : <Icon.star_outline />}
            </button>
            <ProjectPill projectId={task.project} />
            <PriorityChip p={task.priority} />
            {task.due ? <span className={`due ${task.overdue?"overdue":""}`}>{task.due}{task.overdue ? " ⚠" : ""}</span> : null}
          </div>
          <h2 className="detail-title">{task.title}</h2>

          <div className="detail-meta-grid">
            <div className="detail-meta-k">Status</div>
            <div className="detail-meta-v">
              <StatusControl status={task.status} onChange={(s) => onChange({status: s})} />
            </div>
            <div className="detail-meta-k">Priorita</div>
            <div className="detail-meta-v">
              {["none","low","medium","high"].map(p => (
                <span key={p} className={`chip ${task.priority===p?"active":""}`} onClick={() => onChange({priority: p})}>
                  {window.PRIORITY_META[p].glyph} {window.PRIORITY_META[p].label}
                </span>
              ))}
            </div>
            <div className="detail-meta-k">Termín</div>
            <div className="detail-meta-v">
              <input className="detail-input" placeholder="dd. mm. rrrr" defaultValue={task.due || ""} style={{maxWidth: 160}} />
              <span className="mono" style={{color:"var(--text-3)", marginLeft:8, fontSize: 11}}>založeno: 19. 3. 2026</span>
            </div>
            <div className="detail-meta-k">Projekt</div>
            <div className="detail-meta-v">
              <ProjectPill projectId={task.project} />
            </div>
            <div className="detail-meta-k">Tagy</div>
            <div className="detail-meta-v">
              {["IT","Web OC","Web DC","Elischka","Nesrsta","Jordán","Tisk","Vybavení","Ivana","Online","PPC"].map(t => (
                <span key={t} className={`tag-pill ${task.tags?.includes(t)?"":""}`} style={{
                  background: task.tags?.includes(t) ? "var(--violet-soft)" : "transparent",
                  color: task.tags?.includes(t) ? "var(--violet)" : "var(--text-2)",
                  borderColor: task.tags?.includes(t) ? "rgba(167,139,250,0.3)" : "var(--border)",
                  cursor: "pointer",
                }}>{t}</span>
              ))}
            </div>
            <div className="detail-meta-k">Přiřazeno</div>
            <div className="detail-meta-v">
              <button className="btn">+ Nepřiřazeno</button>
            </div>
          </div>

          <div className="detail-sect">
            <div className="detail-sect-h">Popis</div>
            <textarea className="detail-input" rows="4" placeholder="Poznámky, kontext, odkazy…" defaultValue={task.desc} />
          </div>

          <div className="detail-sect">
            <div className="detail-sect-h" style={{display:"flex", justifyContent:"space-between"}}>
              <span>AI Asistent</span>
              <span className="mono" style={{color:"var(--cyan)"}}>claude-4.5</span>
            </div>
            <div style={{padding: 12, background: "var(--bg)", border: "1px solid rgba(34, 211, 238, 0.15)", borderRadius: 6}}>
              <div style={{fontSize: 12, color: "var(--text-2)"}}>Návrh dalšího kroku: rozdělit na 3 podúkoly (Brief Inka, Návrh odpovědí, Test linkou). Doporučená priorita: <strong style={{color:"var(--red)"}}>Vysoká</strong>.</div>
              <div className="row" style={{marginTop: 10}}>
                <button className="btn primary">Aplikovat návrh</button>
                <button className="btn">Jiný návrh</button>
              </div>
            </div>
          </div>

          <div className="detail-sect">
            <div className="detail-sect-h">Podúkoly · {task.hasSubtasks || 0}</div>
            <div className="row" style={{gap:8}}>
              <input className="detail-input" placeholder="Přidat podúkol… (Enter)" />
              <button className="btn primary"><Icon.plus /></button>
            </div>
            {task.hasSubtasks ? (
              <div style={{marginTop: 10, display:"flex", flexDirection:"column", gap: 6}}>
                {Array.from({length: task.hasSubtasks}, (_, i) => (
                  <label key={i} style={{display:"flex", alignItems:"center", gap: 8, padding: "6px 8px", background:"var(--bg)", border:"1px solid var(--border-soft)", borderRadius: 5, fontSize: 13}}>
                    <input type="checkbox" defaultChecked={i===0} /> Podúkol {i+1}: vyčistit, zdokumentovat, zpřístupnit
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-sect">
            <div className="detail-sect-h">Připomínka e-mailem</div>
            <input className="detail-input" placeholder="dd.mm.rrrr --:--" />
          </div>

          <div className="detail-sect">
            <div className="detail-sect-h">Opakování</div>
            <div className="row" style={{gap:4}}>
              {["Žádné","Každý den","Každý týden","Každý měsíc"].map(o => (
                <span key={o} className={`chip ${o==="Žádné"?"active":""}`}>{o}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============ APP ROOT =============
function App() {
  const [page, setPage] = useState("prehled");
  const [projectId, setProjectId] = useState(null);
  const [tasks, setTasks] = useState(window.TASKS.map(t => ({...t})));
  const [openTaskObj, setOpenTaskObj] = useState(null);

  const openTask = (t) => setOpenTaskObj(t);
  const closeTask = () => setOpenTaskObj(null);
  const updateTask = (patch) => {
    if (!openTaskObj) return;
    const next = { ...openTaskObj, ...patch };
    setOpenTaskObj(next);
    setTasks(prev => prev.map(t => t.id === openTaskObj.id ? next : t));
  };

  const goTo = (p, id) => {
    setPage(p === "projekty-detail" ? "projekty-detail" : p);
    if (id) setProjectId(id);
  };

  const crumbs = useMemo(() => {
    if (page === "prehled") return ["Přehled"];
    if (page === "projekty") return ["Projekty"];
    if (page === "projekty-detail") return ["Projekty", window.findProject(projectId)?.name || ""];
    if (page === "ukoly") return ["Úkoly"];
    if (page === "plan") return ["Plán"];
    if (page === "poznamky") return ["Poznámky"];
    return [page];
  }, [page, projectId]);

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} projectId={projectId} setProjectId={setProjectId} />

      <div className="main">
        <TopBar crumbs={crumbs} />
        {page === "prehled" ? <PagePrehled tasks={tasks} setTasks={setTasks} openTask={openTask} /> : null}
        {page === "projekty" ? <PageProjekty onOpenProject={(id) => { setPage("projekty-detail"); setProjectId(id); }} /> : null}
        {page === "projekty-detail" ? <PageProjectDetail projectId={projectId} openTask={openTask} onBack={() => setPage("projekty")} /> : null}
        {page === "ukoly" ? <PageUkoly tasks={tasks} setTasks={setTasks} openTask={openTask} /> : null}
        {page === "plan" ? <PagePlan tasks={tasks} openTask={openTask} /> : null}
        {page === "rychly" ? <PageRychly /> : null}
        {page === "poznamky" ? <PagePoznamky /> : null}
        {page === "tagy" ? <PageTagy /> : null}
      </div>

      <RightRail goTo={goTo} />

      {openTaskObj ? <TaskDetail task={openTaskObj} onClose={closeTask} onChange={updateTask} /> : null}
    </div>
  );
}

function PageRychly() {
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title" style={{display:"flex", alignItems:"center", gap:10}}>
            <Icon.bolt /> Rychlý seznam
          </h1>
          <div className="page-sub">Nakup, udělej, vyřiď.</div>
        </div>
      </div>
      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input placeholder="Co potřebuješ udělat nebo koupit…" />
        <span className="quickadd-kbd">Enter</span>
      </div>
      <div className="tcards" style={{marginTop: 12}}>
        <div className="tcard wait">
          <div className="tcard-check" />
          <div className="tcard-body">
            <div className="tcard-title-row"><div className="tcard-title">Liquid</div></div>
            <div className="tcard-meta">
              <PriorityChip p="medium" />
              <Tag name="Cíga" />
              <span className="muted" style={{fontSize:12}}>Koukni na weba doručení.</span>
            </div>
          </div>
          <div className="tcard-actions"><StatusControl status="wait" /></div>
        </div>
        <div className="tcard todo">
          <div className="tcard-check" />
          <div className="tcard-body">
            <div className="tcard-title-row"><div className="tcard-title">Kamik</div></div>
          </div>
          <div className="tcard-actions"><StatusControl status="todo" /></div>
        </div>
      </div>
    </div>
  );
}

function PagePoznamky() {
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Poznámky</h1>
          <div className="page-sub"><span className="mono">10 poznámek · 4 dnes</span></div>
        </div>
        <button className="btn primary"><Icon.plus /> Nová</button>
      </div>
      <div className="proj-grid" style={{gridTemplateColumns:"repeat(2, 1fr)"}}>
        {window.NOTES.map(n => (
          <div key={n.id} className="proj-card" style={{ "--proj-color": n.project ? window.findProject(n.project)?.color : "var(--text-3)", padding: 16 }}>
            <div className="proj-card-top">
              <span className="proj-card-status mono">{n.date}</span>
              <span style={{color:"var(--text-4)"}}>→</span>
            </div>
            <div className="proj-card-name" style={{fontSize: 16}}>{n.title}</div>
            <div className="proj-card-meta" style={{fontFamily:"var(--font-sans)", color:"var(--text-2)", marginTop: 8}}>{n.excerpt}</div>
            {n.project ? <div style={{marginTop: 10}}><ProjectPill projectId={n.project} /></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PageTagy() {
  const tags = ["IT","Web OC","Web DC","Elischka","Data - Zbyněk","Nesrsta","Jordán","Tisk","Vybavení","Ivana","Online","PPC","Zákaznická linka","Cíga"];
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tagy</h1>
          <div className="page-sub"><span className="mono">{tags.length} tagů · cross-projektů</span></div>
        </div>
      </div>
      <div style={{display:"flex", flexWrap:"wrap", gap: 6}}>
        {tags.map(t => (
          <span key={t} className="tag-pill" style={{fontSize: 13, padding: "6px 12px"}}>{t}</span>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
