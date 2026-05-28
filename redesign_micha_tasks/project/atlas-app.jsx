// ATLAS — Editorial premium task manager, direction B
const { useState, useEffect, useMemo, useRef } = React;

// === ICONS ===
const AIcon = {
  home: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12L12 4l9 8M5 10v10h14V10"/></svg>,
  bolt: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  folder: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  check: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  cal: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  tag: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 12l-8 8-9-9V3h8l9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>,
  note: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H5v18h14V8l-5-5z"/><path d="M14 3v5h5"/></svg>,
  bell: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>,
  search: (p)=> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  star: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  staro: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  plus: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  close: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  flame: () => <span style={{display:'inline-block'}}>🔥</span>,
};

function ProjectPill({ id }) {
  const p = window.findProject(id);
  if (!p) return null;
  return (
    <span className="proj-pill" style={{ "--proj-color": p.color }}>
      <span className="pp-dot" /> {p.name}
    </span>
  );
}
function Tag({ name }) { return <span className="tag">{name}</span>; }
function PrioChip({ p }) {
  if (p === "none" || p === "medium" || !p) return null;
  const m = window.PRIORITY_META[p];
  return <span className="prio" style={{"--prio-color": m.color}}>{m.glyph} {m.label}</span>;
}

function Stepper({ status, onChange }) {
  return (
    <div className="tcard-stepper">
      {window.STATUS_ORDER.map(s => {
        const m = window.STATUS_META[s];
        return (
          <button key={s} className={status===s?"cur":""} onClick={(e)=>{ e.stopPropagation(); onChange?.(s); }} title={m.label}>
            {m.short}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({ t, onOpen, onStatusChange, onStar }) {
  return (
    <div className={`tcard ${t.status} ${t.overdue?"alert":""}`} onClick={() => onOpen?.(t)}>
      <div className="tcard-state" onClick={(e)=>{ e.stopPropagation(); onStatusChange?.(t.id, t.status==="done"?"todo":"done"); }} />
      <div className="tcard-body">
        <div className="tcard-title">{t.title}</div>
        {t.desc ? <div className="tcard-desc">{t.desc}</div> : null}
        <div className="tcard-meta">
          <ProjectPill id={t.project} />
          <PrioChip p={t.priority} />
          {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.overdue?"⚠ ":""}{t.due}</span> : null}
          {t.tags?.map(tg => <Tag key={tg} name={tg} />)}
          {t.hasSubtasks ? <span className="mono" style={{fontSize:10.5, color:"var(--text-3)"}}>≡ {t.hasSubtasks}</span> : null}
        </div>
      </div>
      <div className="tcard-acts" onClick={e=>e.stopPropagation()} style={{"--state-color": "var(--text-3)"}}>
        <Stepper status={t.status} onChange={(s)=>onStatusChange?.(t.id, s)} />
        <button className={`icon-btn star ${t.starred?"on":""}`} onClick={()=>onStar?.(t.id)}>
          {t.starred ? <AIcon.star /> : <AIcon.staro />}
        </button>
      </div>
    </div>
  );
}

function MiniCal() {
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
        <span className="sb-cal-month">Květen</span>
        <span className="sb-cal-year">26 → 31. 5.</span>
      </div>
      <div className="sb-cal-grid">
        {["Po","Út","St","Čt","Pá","So","Ne"].map((d,i)=><div key={"dh"+i} className="sb-cal-dh">{d}</div>)}
        {weeks.flat().map((c, i) => (
          <div key={i} className={`sb-cal-d ${c.m==="prev"?"muted":""} ${c.today?"today":""} ${c.has?"has":""} ${c.has==="overdue"?"overdue":""}`}>{c.d}</div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ page, setPage, setProjectId }) {
  const nav = [
    { id: "prehled", label: "Přehled", icon: AIcon.home },
    { id: "rychly", label: "Rychlý seznam", icon: AIcon.bolt, count: 2 },
    { id: "projekty", label: "Projekty", icon: AIcon.folder },
    { id: "ukoly", label: "Úkoly", icon: AIcon.check, count: 32 },
    { id: "plan", label: "Plán", icon: AIcon.cal },
    { id: "tagy", label: "Tagy", icon: AIcon.tag },
    { id: "poznamky", label: "Poznámky", icon: AIcon.note },
  ];

  return (
    <aside className="sb">
      <div className="sb-brand">
        <span className="sb-brand-mark">Atlas</span>
        <span className="sb-brand-tag">personal ledger · 26</span>
      </div>

      <div className="sb-ws">
        <div className="sb-ws-mono">A</div>
        <span className="sb-ws-name">Avenier</span>
        <span className="sb-ws-tag">ws</span>
      </div>

      <nav className="sb-nav">
        {nav.map(n => {
          const I = n.icon;
          return (
            <div key={n.id} className={`sb-nav-item ${page===n.id?"active":""}`} onClick={()=>{ setPage(n.id); setProjectId(null); }}>
              <I className="sb-nav-icon" />
              <span className="sb-nav-label">{n.label}</span>
              {n.count!=null ? <span className="sb-nav-count">{n.count}</span> : null}
            </div>
          );
        })}
      </nav>

      <MiniCal />

      <div className="sb-section">
        <span>Projekty · aktivní</span>
        <a>+</a>
      </div>
      <div className="sb-projects">
        {window.PROJECTS.filter(p => p.status==="aktivní").map(p => (
          <div key={p.id} className="sb-proj" onClick={()=>{ setPage("project"); setProjectId(p.id); }}>
            <span className="sb-proj-dot" style={{background: p.color}} />
            <span className="sb-proj-name">{p.name}</span>
            <span className="sb-proj-count">{p.openTasks}</span>
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-foot-av">MZ</div>
        <div>
          <div className="sb-foot-name">Michal Zich</div>
          <div className="sb-foot-sub">v2 · tmavý</div>
        </div>
        <div className="sb-foot-toggle" />
      </div>
    </aside>
  );
}

function TopBar({ crumbs }) {
  return (
    <div className="tb">
      <div className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i===crumbs.length-1?"active":""}>{c}</span>
            {i<crumbs.length-1 ? <span>›</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="tb-acts">
        <div className="tb-search">
          <AIcon.search />
          <span>Hledat napříč workspace…</span>
          <kbd>⌘K</kbd>
        </div>
        <button className="tb-btn primary"><AIcon.plus /> Úkol · N</button>
        <button className="tb-bell"><AIcon.bell /><span className="tb-bell-dot" /></button>
      </div>
    </div>
  );
}

// === Hero ledger ===
function Ledger({ overdueCount }) {
  return (
    <div className="ledger">
      <div className="ledger-top">
        <div>
          <div className="ledger-greet">Dobré ráno, Michale</div>
          <div className="ledger-date">
            <span className="day">středa</span>
            <span className="num">27</span>
            <span className="ym-stack">
              <div className="ym-m">května</div>
              <div>2026 · týden K22</div>
            </span>
          </div>
        </div>
        <div className="ledger-aside">
          <div className="ledger-aside-row"><span className="ledger-live-dot" />sync · před 1 min</div>
          <div>05:42 svítání · 21:09 soumrak</div>
          <div>Praha · CET</div>
        </div>
      </div>
      <div className="ledger-stats">
        <div className="ls-cell">
          <div className="ls-lab">Aktivní</div>
          <div className="ls-num"><span>32</span><span className="unit">/55</span></div>
          <div className="ls-foot up">↗ +3 dnes</div>
        </div>
        <div className="ls-cell">
          <div className="ls-lab">Po termínu</div>
          <div className="ls-num red"><span>{overdueCount}</span></div>
          <div className="ls-foot down">⚠ vyřeš dnes</div>
        </div>
        <div className="ls-cell">
          <div className="ls-lab">Hotovo · týden</div>
          <div className="ls-num green"><span>23</span><span className="unit">úk.</span></div>
          <div className="ls-foot up">+41 % nad průměrem</div>
        </div>
        <div className="ls-cell">
          <div className="ls-lab">Streak</div>
          <div className="ls-num gold"><span>12</span><span className="unit">dní</span> <AIcon.flame /></div>
          <div className="ls-foot">best · 28</div>
        </div>
        <div className="ls-cell">
          <div className="ls-lab">Projekty</div>
          <div className="ls-num violet"><span>14</span><span className="unit">/15</span></div>
          <div className="ls-foot">1 hotový tento měsíc</div>
        </div>
      </div>
    </div>
  );
}

// === Right rail components ===
function StackBar() {
  const counts = {
    doing: window.tasksByStatus("doing").length,
    wait: window.tasksByStatus("wait").length,
    todo: window.tasksByStatus("todo").length,
    done: 23,
  };
  const total = counts.doing + counts.wait + counts.todo + counts.done;
  const segs = [
    { k: "doing", color: "var(--blue)", v: counts.doing, lab: "Rozpracováno" },
    { k: "wait",  color: "var(--amber)", v: counts.wait, lab: "Čekám" },
    { k: "todo",  color: "var(--text-3)", v: counts.todo, lab: "To do" },
    { k: "done",  color: "var(--green)", v: counts.done, lab: "Hotovo" },
  ];
  return (
    <div className="rail-card">
      <div className="rail-h">
        <span className="rail-h-t">Stav úkolů</span>
        <span className="rail-h-a">{total} celkem</span>
      </div>
      <div className="stack">
        {segs.map(s => (
          <div key={s.k} className="stack-seg" style={{ width: `${s.v/total*100}%`, background: s.color }} title={s.lab} />
        ))}
      </div>
      <div className="stack-leg">
        {segs.map(s => (
          <div key={s.k} className="stack-row">
            <span className="stack-dot" style={{ background: s.color }} />
            <span className="stack-lab">{s.lab}</span>
            <span className="stack-v">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakCard() {
  const s = window.WORKSPACE.streak;
  return (
    <div className="rail-card">
      <div className="rail-h">
        <span className="rail-h-t">Streak</span>
        <span className="rail-h-a">12 týdnů ↓</span>
      </div>
      <div className="streak">
        <div className="streak-num">{s.current}</div>
        <div className="streak-meta-r">
          <div className="streak-meta">dní v řadě</div>
          <div className="streak-meta-row"><span>best</span><span>{s.best}</span></div>
          <div className="streak-meta-row"><span>týden</span><span>5 / 7</span></div>
        </div>
      </div>
      <div className="streak-grid">
        {s.weeks.map((w, i) => (
          <div key={i} className="streak-col">
            {w.map((d, j) => <div key={j} className={`streak-cell ${d?"l"+d:""}`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectsCard({ goTo }) {
  return (
    <div className="rail-card">
      <div className="rail-h">
        <span className="rail-h-t">Projekty</span>
        <span className="rail-h-a" onClick={()=>goTo("projekty")}>vše →</span>
      </div>
      {window.PROJECTS.filter(p => p.status==="aktivní" && p.total>0).slice(0, 8).map(p => (
        <div key={p.id} className="pr-row" onClick={()=>goTo("project", p.id)}>
          <span className="pr-dot" style={{background: p.color}} />
          <div className="pr-mid">
            <div className="pr-name">{p.name}</div>
            <div className="pr-meta">{p.openTasks} otev. · {p.doneTasks} hot.</div>
          </div>
          <span className="pr-num">{p.progress}%</span>
          <div className="pr-bar"><div className="pr-bar-fill" style={{width:`${p.progress}%`, background: p.color}} /></div>
        </div>
      ))}
    </div>
  );
}

function NotesCard({ goTo }) {
  return (
    <div className="rail-card">
      <div className="rail-h">
        <span className="rail-h-t">Nedávné poznámky</span>
        <span className="rail-h-a" onClick={()=>goTo("poznamky")}>vše →</span>
      </div>
      {window.NOTES.slice(0, 4).map(n => (
        <a key={n.id} className="note">
          <div className="note-t">{n.title}</div>
          <div className="note-x">{n.excerpt}</div>
          <div className="note-m">{n.date}{n.project ? ` · ${window.findProject(n.project)?.name}` : ""}</div>
        </a>
      ))}
    </div>
  );
}

// === PAGE PŘEHLED ===
function PagePrehled({ tasks, setTasks, openTask, goTo }) {
  const [filter, setFilter] = useState("all");

  const overdue = tasks.filter(t => t.overdue && t.status !== "done");
  const doing = tasks.filter(t => t.status === "doing" && !t.overdue);
  const wait = tasks.filter(t => t.status === "wait");
  const todo = tasks.filter(t => t.status === "todo");

  const setStatus = (id, s) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: s, overdue: s === "done" ? false : t.overdue } : t));
  };
  const toggleStar = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, starred: !t.starred } : t));

  const show = (k) => filter === "all" || filter === k;

  return (
    <div className="main-inner">
      <Ledger overdueCount={overdue.length} />

      <div className="work">
        <div>
          {/* AI hero */}
          <div className="ai-strip">
            <div className="ai-orb">A</div>
            <div>
              <div className="ai-text-h">Mám pro tebe <span className="num">{window.AI_SUGGESTIONS.length}</span> návrhů, jak dnes začít.</div>
              <div className="ai-text-sub">32 aktivních · {overdue.length} po termínu · streak {window.WORKSPACE.streak.current} dní · claude-4.5</div>
            </div>
            <button className="ai-act"><AIcon.bolt /> Vygenerovat plán</button>
          </div>

          <div className="aisug">
            {window.AI_SUGGESTIONS.map((s, i) => {
              const t = window.findTask(s.taskId);
              return (
                <div key={s.id} className="aisug-card" onClick={() => openTask(t)}>
                  <span className="aisug-num">{i+1}</span>
                  <div>
                    <div className="aisug-title">{t.title}</div>
                    <div className="aisug-reason">{s.reason}</div>
                  </div>
                  <span className="aisug-tag">{s.weight}</span>
                </div>
              );
            })}
          </div>

          <div className="quickadd">
            <span className="quickadd-plus">+</span>
            <input placeholder="Co dnes naplánovat?" />
            <span className="quickadd-kbd">N · Enter</span>
          </div>

          <div className="chips">
            <span className={`chip ${filter==="all"?"active":""}`} onClick={()=>setFilter("all")}>Vše <span className="chip-count">{tasks.length}</span></span>
            <span className={`chip ${filter==="overdue"?"active":""}`} onClick={()=>setFilter("overdue")} style={{color: filter==="overdue"?undefined:"var(--red)"}}>⚠ Po termínu <span className="chip-count">{overdue.length}</span></span>
            <span className={`chip ${filter==="doing"?"active":""}`} onClick={()=>setFilter("doing")}>Rozpracováno <span className="chip-count">{doing.length}</span></span>
            <span className={`chip ${filter==="wait"?"active":""}`} onClick={()=>setFilter("wait")}>Čekám <span className="chip-count">{wait.length}</span></span>
            <span className={`chip ${filter==="todo"?"active":""}`} onClick={()=>setFilter("todo")}>To do <span className="chip-count">{todo.length}</span></span>
            <span className="chip">★ Top <span className="chip-count">{tasks.filter(t=>t.starred).length}</span></span>
            <span className="chips-sep" />
            <span className="chip">Seskupit ▾</span>
            <span className="chip">Řadit ▾</span>
          </div>

          {overdue.length > 0 && show("overdue") ? (
            <section className="sec">
              <div className="sec-head">
                <span className="sec-num">I.</span>
                <span className="sec-title alert">Po termínu</span>
                <span className="sec-count">{overdue.length}</span>
              </div>
              <div className="tcards">
                {overdue.map(t => <TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
              </div>
            </section>
          ) : null}

          {doing.length > 0 && show("doing") ? (
            <section className="sec">
              <div className="sec-head">
                <span className="sec-num">II.</span>
                <span className="sec-title">Rozpracováno</span>
                <span className="sec-count">{doing.length}</span>
                <span className="sec-sep" />
                <span className="sec-act">+{Math.max(0, doing.length-3)} dalších</span>
              </div>
              <div className="tcards">
                {doing.slice(0, 3).map(t => <TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
              </div>
            </section>
          ) : null}

          {wait.length > 0 && show("wait") ? (
            <section className="sec">
              <div className="sec-head">
                <span className="sec-num">III.</span>
                <span className="sec-title">Čekám</span>
                <span className="sec-count">{wait.length}</span>
                <span className="sec-sep" />
                <span className="sec-act">+{Math.max(0, wait.length-3)} dalších</span>
              </div>
              <div className="tcards">
                {wait.slice(0, 3).map(t => <TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
              </div>
            </section>
          ) : null}

          {todo.length > 0 && show("todo") ? (
            <section className="sec">
              <div className="sec-head">
                <span className="sec-num">IV.</span>
                <span className="sec-title">To do</span>
                <span className="sec-count">{todo.length}</span>
              </div>
              <div className="tcards">
                {todo.slice(0, 3).map(t => <TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="rail">
          <StackBar />
          <StreakCard />
          <ProjectsCard goTo={goTo} />
          <NotesCard goTo={goTo} />
        </aside>
      </div>
    </div>
  );
}

// === PAGE PROJEKTY ===
function PageProjekty({ goTo }) {
  const [tab, setTab] = useState("aktivni");
  const tabs = [
    { id: "vse", label: "Vše", count: 15 },
    { id: "aktivni", label: "Aktivní", count: 14 },
    { id: "napady", label: "Nápady", count: 0 },
    { id: "hotove", label: "Hotové", count: 1 },
    { id: "archiv", label: "Archiv", count: 0 },
  ];
  const filtered = window.PROJECTS.filter(p => tab==="vse" || (tab==="aktivni" && p.status==="aktivní") || (tab==="hotove" && p.status==="hotový"));

  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet">15 projektů · 14 aktivních · 1 hotový</div>
          <h1 className="serif" style={{fontSize: 52, fontWeight: 400, letterSpacing:"-0.02em", margin: "6px 0 0"}}>Projekty</h1>
        </div>
        <button className="btn primary"><AIcon.plus /> Nový projekt</button>
      </div>

      <div className="proj-tabs">
        {tabs.map(t => (
          <div key={t.id} className={`proj-tab ${tab===t.id?"is":""}`} onClick={()=>setTab(t.id)}>
            {t.label} <span className="c">{t.count}</span>
          </div>
        ))}
      </div>

      <div className="pgrid">
        {filtered.map(p => {
          const doing = window.TASKS.filter(t => t.project===p.id && t.status==="doing").length;
          const wait = window.TASKS.filter(t => t.project===p.id && t.status==="wait").length;
          const todo = window.TASKS.filter(t => t.project===p.id && t.status==="todo").length;
          return (
            <div key={p.id} className="pcard" style={{"--proj-color": p.color}} onClick={()=>goTo("project", p.id)}>
              <div className="pcard-top">
                <span className="pcard-stat">{p.status}</span>
                <span className="pcard-arrow">›</span>
              </div>
              <div className="pcard-name">{p.name}</div>
              <div className="pcard-sub">{p.total} úkolů{p.overdueCount ? ` · ⚠ ${p.overdueCount} po termínu` : ""}</div>
              <div className="pcard-progress">
                <div className="pcard-bar"><div className="pcard-fill" style={{width: `${p.progress}%`}} /></div>
                <span className="pcard-pct">{p.progress}%</span>
              </div>
              <div className="pcard-counts">
                {todo>0 ? <span className="pcc todo"><span className="pcc-d" /><span className="pcc-v">{todo}</span> todo</span> : null}
                {doing>0 ? <span className="pcc doing"><span className="pcc-d" /><span className="pcc-v">{doing}</span> doing</span> : null}
                {wait>0 ? <span className="pcc wait"><span className="pcc-d" /><span className="pcc-v">{wait}</span> wait</span> : null}
                {p.doneTasks>0 ? <span className="pcc done"><span className="pcc-d" /><span className="pcc-v">{p.doneTasks}</span> done</span> : null}
              </div>
            </div>
          );
        })}
        <div className="pcard" style={{borderStyle:"dashed", borderColor:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"var(--text-3)", minHeight: 200}}>
          <AIcon.plus />
          <span style={{marginTop: 8, fontFamily:"var(--serif)", fontStyle:"italic", fontSize: 17}}>Nový projekt</span>
        </div>
      </div>
    </div>
  );
}

// === PAGE PROJECT DETAIL ===
function PageProject({ projectId, openTask, goTo }) {
  const p = window.findProject(projectId);
  if (!p) return null;
  const cols = [
    { id: "todo", label: "To do", color: "var(--text-2)" },
    { id: "doing", label: "Rozpracováno", color: "var(--blue)" },
    { id: "wait", label: "Čekám", color: "var(--amber)" },
    { id: "done", label: "Hotovo", color: "var(--green)" },
  ];
  const tasks = window.tasksByProject(projectId);

  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet" style={{cursor:"pointer", color:"var(--text-3)"}} onClick={()=>goTo("projekty")}>← Projekty</div>
          <h1 className="serif" style={{fontSize: 56, fontWeight: 400, letterSpacing:"-0.02em", margin: "8px 0 0", display:"flex", alignItems:"center", gap:18}}>
            <span style={{width:14, height:14, borderRadius:3, background:p.color, display:"inline-block"}} />
            {p.name}
            <span style={{
              fontFamily:"var(--mono)", fontSize: 11, color: "var(--gold)",
              padding: "4px 12px", border: "1px solid var(--gold)",
              borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.12em",
            }}>{p.status}</span>
          </h1>
          <div style={{fontFamily:"var(--mono)", fontSize: 11, color:"var(--text-3)", marginTop: 10, textTransform:"uppercase", letterSpacing:"0.12em"}}>
            {p.total} úkolů · {p.progress}% hotových · created 19. 3. 2026
          </div>
        </div>
        <div className="row">
          <button className="btn">Upravit</button>
          <button className="btn danger">Smazat</button>
        </div>
      </div>

      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input placeholder={`Nový úkol v ${p.name}…`} />
        <span className="quickadd-kbd">N · Enter</span>
      </div>

      <div className="kanban">
        {cols.map(c => {
          const ct = tasks.filter(t => t.status===c.id);
          return (
            <div key={c.id} className="kcol">
              <div className="kcol-head" style={{"--col-color": c.color}}>
                <span className="kcol-name">{c.label}</span>
                <span className="kcol-count">{ct.length}</span>
                <span className="kcol-add"><AIcon.plus /></span>
              </div>
              {ct.map(t => (
                <div key={t.id} className="kcard" onClick={()=>openTask(t)}>
                  <div className="kcard-t">{t.title}</div>
                  <div className="kcard-m">
                    <PrioChip p={t.priority} />
                    {t.tags?.slice(0,2).map(tg => <Tag key={tg} name={tg} />)}
                    {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.due}</span> : null}
                  </div>
                  {t.hasSubtasks ? <div className="kcard-st">≡ {t.hasSubtasks} podúkoly</div> : null}
                </div>
              ))}
              {ct.length === 0 ? (
                <div className="kcard" style={{borderStyle:"dashed", textAlign:"center", color:"var(--text-3)"}}>+ Přidat úkol</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === PAGE ÚKOLY (table) ===
function PageUkoly({ tasks, openTask }) {
  const [filter, setFilter] = useState("vse");
  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet">55 úkolů celkem · 32 aktivních · 23 hotových</div>
          <h1 className="serif" style={{fontSize: 56, fontWeight: 400, letterSpacing:"-0.02em", margin:"8px 0 0"}}>Úkoly</h1>
        </div>
        <div className="row">
          <button className="btn">Karty</button>
          <button className="btn primary">Tabulka</button>
        </div>
      </div>

      <div className="chips">
        {["vse","todo","doing","wait","done"].map(f => (
          <span key={f} className={`chip ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
            {f === "vse" ? "Vše" : window.STATUS_META[f].label}
          </span>
        ))}
        <span style={{width:1, height:18, background:"var(--border-soft)"}} />
        <span className="chip">Priorita ▾</span>
        <span className="chip">Projekt ▾</span>
        <span className="chips-sep" />
        <span className="chip">+ Filtr</span>
      </div>

      <div className="ttable">
        <div className="ttable-row head">
          <div></div>
          <div>Název ↑</div>
          <div>Status</div>
          <div>Priorita</div>
          <div>Projekt</div>
          <div>Termín</div>
        </div>
        {tasks.slice(0, 14).map(t => {
          const m = window.STATUS_META[t.status];
          return (
            <div key={t.id} className="ttable-row" onClick={()=>openTask(t)}>
              <input type="checkbox" />
              <div className={`tt-name ${t.status==="done"?"done":""}`}>{t.title}</div>
              <div><span className="tt-st"><span className="d" style={{background: m.color}} />{m.label}</span></div>
              <div><PrioChip p={t.priority} /></div>
              <div><ProjectPill id={t.project} /></div>
              <div><span className={`due ${t.overdue?"overdue":""}`}>{t.due || "—"}</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === PAGE PLÁN ===
function PagePlan({ openTask }) {
  const days = Array.from({length: 28}, (_, i) => i + 1);
  const today = 27;
  const rows = window.PROJECTS.filter(p => p.status==="aktivní").slice(0, 9);
  const placements = [
    { project: "oc", title: "AI odpovědi na e-maily", start: 26, span: 1, color: "#3b82f6", overdue: true, taskId: 1 },
    { project: "spolu", title: "Spolupráce: Cestujzababku", start: 26, span: 1, color: "#fb923c", overdue: true, taskId: 2 },
    { project: "oc", title: "Chatbot", start: 13, span: 5, color: "#3b82f6", taskId: 4 },
    { project: "dc", title: "Automatizace období", start: 5, span: 4, color: "#ec4899", taskId: 7 },
    { project: "aiav", title: "Domluvit Davida", start: 11, span: 2, color: "#f97316", taskId: 5 },
    { project: "or", title: "Zvýšení klientů OC TIT", start: 18, span: 8, color: "#f43f5e", taskId: 6 },
    { project: "vmd", title: "Videomedailonek Tomáš", start: 8, span: 3, color: "#06b6d4" },
    { project: "adhoc", title: "Brief AI Avenier", start: 14, span: 4, color: "#14b8a6" },
    { project: "med", title: "Medevio kickoff", start: 20, span: 4, color: "#e11d48" },
  ];
  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet">29. dubna → 26. května 2026 · 4 týdny</div>
          <h1 className="serif" style={{fontSize: 56, fontWeight: 400, letterSpacing:"-0.02em", margin:"8px 0 0"}}>Plán</h1>
        </div>
        <div className="row">
          <button className="btn">← zpět</button>
          <button className="btn primary">dnes</button>
          <button className="btn">vpřed →</button>
        </div>
      </div>

      <div className="tl">
        <div className="tl-head">
          <div className="tl-head-l">Projekt</div>
          <div className="tl-days">
            {days.map(d => {
              const dow = (d - 1 + 2) % 7;
              const isWE = dow === 5 || dow === 6;
              return <div key={d} className={`tl-day ${d===today?"today":""} ${isWE?"we":""}`}>{d}.5</div>;
            })}
          </div>
        </div>
        {rows.map(p => (
          <div key={p.id} className="tl-row">
            <div className="tl-lab">
              <span style={{width:8, height:8, borderRadius:"50%", background: p.color, display:"inline-block"}} />
              <span style={{flex:1}}>{p.name}</span>
              <span className="mono" style={{fontSize:10, color:"var(--text-4)"}}>{p.openTasks}</span>
            </div>
            <div className="tl-grid">
              {days.map(d => <div key={d} className={`tl-cell ${d===today?"today":""}`} />)}
              {placements.filter(x => x.project === p.id).map((x, i) => (
                <div key={i} className={`tl-task ${x.overdue?"overdue":""}`}
                  style={{
                    left: `calc(${(x.start - 1) / 28 * 100}% + 2px)`,
                    width: `calc(${x.span / 28 * 100}% - 4px)`,
                    background: x.color,
                  }}
                  onClick={() => x.taskId && openTask(window.findTask(x.taskId))}
                >{x.title}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === PAGE POZNÁMKY ===
function PagePoznamky() {
  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet">10 poznámek · 4 nové dnes</div>
          <h1 className="serif" style={{fontSize: 56, fontWeight: 400, letterSpacing:"-0.02em", margin: "8px 0 0"}}>Poznámky</h1>
        </div>
        <button className="btn primary"><AIcon.plus /> Nová</button>
      </div>
      <div className="pgrid" style={{gridTemplateColumns:"repeat(2, 1fr)"}}>
        {window.NOTES.concat(window.NOTES).map((n, i) => (
          <div key={i} className="pcard" style={{"--proj-color": n.project ? window.findProject(n.project)?.color : "var(--text-3)", minHeight: 150}}>
            <div className="pcard-top">
              <span className="pcard-stat">{n.date}</span>
              <span className="pcard-arrow">›</span>
            </div>
            <div className="pcard-name" style={{fontSize: 22}}>{n.title}</div>
            <div style={{color:"var(--text-2)", fontSize: 13, marginTop: 4}}>{n.excerpt}</div>
            {n.project ? <div style={{marginTop:12}}><ProjectPill id={n.project} /></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// === PAGE RYCHLÝ ===
function PageRychly() {
  return (
    <div className="main-inner">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom: 18}}>
        <div>
          <div className="ledger-greet">Nakup · udělej · vyřiď</div>
          <h1 className="serif" style={{fontSize: 56, fontWeight: 400, letterSpacing:"-0.02em", margin:"8px 0 0", display:"flex", alignItems:"center", gap:18}}>
            <AIcon.bolt /> Rychlý seznam
          </h1>
        </div>
      </div>

      <div className="quickadd">
        <span className="quickadd-plus">+</span>
        <input placeholder="Co potřebuješ udělat nebo koupit…" />
        <span className="quickadd-kbd">Enter</span>
      </div>

      <div className="tcards">
        <div className="tcard wait">
          <div className="tcard-state" />
          <div className="tcard-body">
            <div className="tcard-title">Liquid</div>
            <div className="tcard-meta">
              <PrioChip p="medium" />
              <Tag name="Cíga" />
              <span style={{color:"var(--text-3)", fontSize:12.5}}>Koukni na weba doručení.</span>
            </div>
          </div>
          <div className="tcard-acts" style={{"--state-color":"var(--amber)"}}><Stepper status="wait" /></div>
        </div>
        <div className="tcard todo">
          <div className="tcard-state" />
          <div className="tcard-body"><div className="tcard-title">Kamik</div></div>
          <div className="tcard-acts" style={{"--state-color":"var(--text-3)"}}><Stepper status="todo" /></div>
        </div>
      </div>
    </div>
  );
}

// === TASK DETAIL ===
function TaskDetail({ t, onClose, onChange }) {
  if (!t) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="detail" onClick={e=>e.stopPropagation()}>
        <div className="detail-top">
          <div className="detail-top-l">Detail úkolu · #{String(t.id).padStart(4,"0")}</div>
          <div className="row">
            <button className="btn danger">Smazat</button>
            <button className="icon-btn" onClick={onClose}><AIcon.close /></button>
          </div>
        </div>
        <div className="detail-body">
          <div className="row">
            <button className={`icon-btn star ${t.starred?"on":""}`} onClick={()=>onChange({starred: !t.starred})}>
              {t.starred ? <AIcon.star /> : <AIcon.staro />}
            </button>
            <ProjectPill id={t.project} />
            {t.priority && t.priority !== "medium" && t.priority !== "none" ? <PrioChip p={t.priority} /> : null}
            {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.due}{t.overdue?" ⚠":""}</span> : null}
          </div>
          <h2 className="detail-title">{t.title}</h2>

          <div className="detail-grid">
            <div className="detail-k">Status</div>
            <div className="detail-v" style={{"--state-color":"var(--gold)"}}><Stepper status={t.status} onChange={(s)=>onChange({status: s})} /></div>

            <div className="detail-k">Priorita</div>
            <div className="detail-v">
              {["none","low","medium","high"].map(p => (
                <span key={p} className={`chip ${t.priority===p?"active":""}`} onClick={()=>onChange({priority: p})}>
                  {window.PRIORITY_META[p].glyph} {window.PRIORITY_META[p].label}
                </span>
              ))}
            </div>

            <div className="detail-k">Termín</div>
            <div className="detail-v">
              <input className="detail-input" placeholder="dd. mm. rrrr" defaultValue={t.due || ""} style={{maxWidth:160}} />
              <span className="mono" style={{color:"var(--text-3)", fontSize:11}}>založeno 19. 3. 2026</span>
            </div>

            <div className="detail-k">Projekt</div>
            <div className="detail-v"><ProjectPill id={t.project} /></div>

            <div className="detail-k">Tagy</div>
            <div className="detail-v">
              {["IT","Web OC","Web DC","Elischka","Nesrsta","Jordán","Tisk","Vybavení","Ivana","Online","PPC"].map(tg => {
                const on = t.tags?.includes(tg);
                return (
                  <span key={tg} className={`tag`} style={{
                    background: on ? "var(--gold-soft)" : "transparent",
                    color: on ? "var(--gold)" : "var(--text-2)",
                    border: "1px solid " + (on ? "var(--gold)" : "var(--border-soft)"),
                    padding: "3px 9px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}>{tg}</span>
                );
              })}
            </div>

            <div className="detail-k">Přiřazeno</div>
            <div className="detail-v"><button className="btn">+ Nepřiřazeno</button></div>
          </div>

          <div className="detail-sect">
            <div className="detail-h">Popis</div>
            <textarea className="detail-input" rows="4" placeholder="Poznámky, kontext, odkazy…" defaultValue={t.desc} />
          </div>

          <div className="detail-sect">
            <div className="detail-h" style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
              <span>Atlas asistent</span>
              <span className="mono" style={{fontSize:10.5, color:"var(--violet)", textTransform:"uppercase", letterSpacing:"0.1em"}}>claude-4.5</span>
            </div>
            <div style={{padding: 14, background:"var(--bg-2)", borderRadius:8, border:"1px solid var(--border-soft)"}}>
              <div style={{fontSize: 13, color:"var(--text-2)", lineHeight: 1.5}}>
                <span className="serif it" style={{fontSize:16, color:"var(--text)"}}>„Rozdělit na 3 podúkoly</span> — Brief Inka, Návrh odpovědí, Test linkou. Priorita zvýšena na <strong style={{color:"var(--red)"}}>Vysoká</strong>.“
              </div>
              <div className="row" style={{marginTop: 12}}>
                <button className="btn violet">Aplikovat</button>
                <button className="btn">Jiný návrh</button>
                <button className="btn">Vysvětli</button>
              </div>
            </div>
          </div>

          <div className="detail-sect">
            <div className="detail-h">Podúkoly · {t.hasSubtasks || 0}</div>
            <div className="row">
              <input className="detail-input" placeholder="Přidat podúkol… (Enter)" />
              <button className="btn primary"><AIcon.plus /></button>
            </div>
            {t.hasSubtasks ? (
              <div style={{marginTop: 12, display:"flex", flexDirection:"column", gap: 6}}>
                {Array.from({length: t.hasSubtasks}, (_, i) => (
                  <label key={i} style={{display:"flex", gap:10, padding:"8px 12px", background:"var(--bg-2)", borderRadius:6, border:"1px solid var(--border-soft)", fontSize:13.5}}>
                    <input type="checkbox" defaultChecked={i===0} />
                    Podúkol {i+1}: vyčistit, zdokumentovat, zpřístupnit
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-sect">
            <div className="detail-h">Připomínka e-mailem</div>
            <input className="detail-input" placeholder="dd.mm.rrrr --:--" />
          </div>

          <div className="detail-sect">
            <div className="detail-h">Opakování</div>
            <div className="row">
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

// === APP ===
function App() {
  const [page, setPage] = useState("prehled");
  const [projectId, setProjectId] = useState(null);
  const [tasks, setTasks] = useState(window.TASKS.map(t => ({...t})));
  const [openObj, setOpenObj] = useState(null);

  const openTask = (t) => setOpenObj(t);
  const closeTask = () => setOpenObj(null);
  const updateTask = (patch) => {
    if (!openObj) return;
    const next = { ...openObj, ...patch };
    setOpenObj(next);
    setTasks(prev => prev.map(t => t.id === openObj.id ? next : t));
  };

  const goTo = (p, id) => { setPage(p); if (id) setProjectId(id); };

  const crumbs = useMemo(() => {
    if (page === "prehled") return ["Workspace", "Přehled"];
    if (page === "projekty") return ["Workspace", "Projekty"];
    if (page === "project") return ["Workspace", "Projekty", window.findProject(projectId)?.name || ""];
    if (page === "ukoly") return ["Workspace", "Úkoly"];
    if (page === "plan") return ["Workspace", "Plán"];
    if (page === "poznamky") return ["Workspace", "Poznámky"];
    if (page === "rychly") return ["Workspace", "Rychlý seznam"];
    if (page === "tagy") return ["Workspace", "Tagy"];
    return [page];
  }, [page, projectId]);

  return (
    <div className="app">
      <Sidebar page={page} setPage={setPage} setProjectId={setProjectId} />
      <div className="main">
        <TopBar crumbs={crumbs} />
        {page === "prehled" ? <PagePrehled tasks={tasks} setTasks={setTasks} openTask={openTask} goTo={goTo} /> : null}
        {page === "projekty" ? <PageProjekty goTo={goTo} /> : null}
        {page === "project" ? <PageProject projectId={projectId} openTask={openTask} goTo={goTo} /> : null}
        {page === "ukoly" ? <PageUkoly tasks={tasks} openTask={openTask} /> : null}
        {page === "plan" ? <PagePlan openTask={openTask} /> : null}
        {page === "poznamky" ? <PagePoznamky /> : null}
        {page === "rychly" ? <PageRychly /> : null}
      </div>
      {openObj ? <TaskDetail t={openObj} onClose={closeTask} onChange={updateTask} /> : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
