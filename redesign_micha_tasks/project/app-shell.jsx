// Atlas v2 — shared components (icons, pills, sidebar, topbar, detail)
const { useState, useEffect, useMemo, useRef } = React;

// === ICONS ===
const I = {
  home: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12L12 4l9 8M5 10v10h14V10"/></svg>,
  bolt: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>,
  folder: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  check: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 12l2 2 4-4"/></svg>,
  cal: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  tag: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 12l-8 8-9-9V3h8l9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>,
  note: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H5v18h14V8l-5-5z"/><path d="M14 3v5h5"/></svg>,
  bell: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>,
  search: (p)=> <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  star: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  staro: (p)=> <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" {...p}><path d="M12 3l3 6 6 1-4.5 4 1 7-5.5-3-5.5 3 1-7L3 10l6-1z"/></svg>,
  plus: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  close: (p)=> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  chev: (p)=> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  sun: (p)=> <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M19 5l-1.5 1.5M5 19l1.5-1.5M19 19l-1.5-1.5M5 5l1.5 1.5"/></svg>,
  moon: (p)=> <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 13a9 9 0 11-11-11 7 7 0 0011 11z"/></svg>,
  flame: () => <span style={{display:'inline-block', transform:'translateY(-1px)'}}>🔥</span>,
  spark: (p)=> <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z"/></svg>,
  panel: (p)=> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>,
};

// === Pills ===
function ProjectPill({ id }) {
  const p = window.findProject(id);
  if (!p) return null;
  return <span className="proj-pill" style={{ "--proj-color": p.color }}><span className="pp-dot" />{p.name}</span>;
}
function Tag({ name }) { return <span className="tag">{name}</span>; }
function PrioChip({ p }) {
  if (!p || p === "none" || p === "medium") return null;
  const meta = window.PRIORITY_META[p];
  return <span className="prio" style={{"--prio-color": meta.color}}>{meta.glyph} {meta.label}</span>;
}

function Stepper({ status, onChange }) {
  return (
    <div className="stepper">
      {window.STATUS_ORDER.map(s => {
        const m = window.STATUS_META[s];
        return (
          <button key={s} className={status===s?`cur ${s}`:""} onClick={(e)=>{e.stopPropagation(); onChange?.(s);}} title={m.label}>
            {m.short}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({ t, onOpen, onStatusChange, onStar }) {
  return (
    <div className={`tcard ${t.status} ${t.overdue?"alert":""}`} onClick={()=>onOpen?.(t)}>
      <div className="tcard-state" onClick={(e)=>{e.stopPropagation(); onStatusChange?.(t.id, t.status==="done"?"todo":"done");}} title="Toggle hotovo" />
      <div className="tcard-body">
        <div className="tcard-title">{t.title}</div>
        {t.desc ? <div className="tcard-desc">{t.desc}</div> : null}
        <div className="tcard-meta">
          <ProjectPill id={t.project} />
          <PrioChip p={t.priority} />
          {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.overdue?"⚠ ":""}{t.due}</span> : null}
          {t.tags?.map(tg => <Tag key={tg} name={tg} />)}
          {t.hasSubtasks ? <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--text-3)"}}>≡ {t.hasSubtasks}</span> : null}
        </div>
      </div>
      <div className="tcard-acts" onClick={e=>e.stopPropagation()}>
        <Stepper status={t.status} onChange={(s)=>onStatusChange?.(t.id, s)} />
        <button className={`icon-btn star ${t.starred?"on":""}`} onClick={()=>onStar?.(t.id)} title="Top úkol">
          {t.starred ? <I.star /> : <I.staro />}
        </button>
      </div>
    </div>
  );
}

// === Mini calendar ===
function MiniCal() {
  const weeks = [
    [{d:27,m:"prev"},{d:28,m:"prev"},{d:29,m:"prev"},{d:30,m:"prev"},{d:1},{d:2},{d:3}],
    [{d:4},{d:5},{d:6},{d:7},{d:8},{d:9},{d:10}],
    [{d:11},{d:12},{d:13},{d:14},{d:15},{d:16},{d:17}],
    [{d:18},{d:19},{d:20},{d:21},{d:22},{d:23},{d:24}],
    [{d:25},{d:26,has:"overdue"},{d:27,today:true,has:true},{d:28,has:true},{d:29,has:true},{d:30},{d:31}],
  ];
  return (
    <div className="sb-cal">
      <div className="sb-cal-head">
        <span className="sb-cal-month">květen</span>
        <span className="sb-cal-nav"><span>‹</span><span>›</span></span>
      </div>
      <div className="sb-cal-grid">
        {["Po","Út","St","Čt","Pá","So","Ne"].map((d,i)=><div key={"dh"+i} className="sb-cal-dh">{d}</div>)}
        {weeks.flat().map((c,i)=>(
          <div key={i} className={`sb-cal-d ${c.m==="prev"?"muted":""} ${c.today?"today":""} ${c.has?"has":""} ${c.has==="overdue"?"overdue":""}`}>{c.d}</div>
        ))}
      </div>
    </div>
  );
}

// === SIDEBAR ===
function Sidebar({ page, setPage, setProjectId, collapsed, setCollapsed }) {
  const nav = [
    { id: "prehled", label: "Přehled", icon: I.home },
    { id: "rychly", label: "Rychlý seznam", icon: I.bolt, count: 2 },
    { id: "projekty", label: "Projekty", icon: I.folder },
    { id: "ukoly", label: "Úkoly", icon: I.check, count: 32 },
    { id: "plan", label: "Plán", icon: I.cal },
    { id: "tagy", label: "Tagy", icon: I.tag },
    { id: "poznamky", label: "Poznámky", icon: I.note },
  ];

  return (
    <aside className="sb">
      <button className="sb-collapse" onClick={()=>setCollapsed(!collapsed)} title={collapsed?"Rozbalit":"Sbalit"}>
        <I.panel />
      </button>
      <div className="sb-brand">
        <div className="sb-logo">A</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Atlas</div>
          <div className="sb-brand-tag">personal OS · v2</div>
        </div>
      </div>

      <div className="sb-ws">
        <div className="sb-ws-mono">A</div>
        <span className="sb-ws-name">Avenier</span>
        <span className="sb-ws-arrow">▾</span>
      </div>

      <nav className="sb-nav">
        {nav.map(n => {
          const Ic = n.icon;
          return (
            <div key={n.id} className={`sb-nav-item ${page===n.id?"active":""}`} onClick={()=>{setPage(n.id); setProjectId(null);}} title={n.label}>
              <Ic className="sb-nav-icon" />
              <span className="sb-nav-label">{n.label}</span>
              {n.count!=null ? <span className="sb-nav-count">{n.count}</span> : null}
            </div>
          );
        })}
      </nav>

      <MiniCal />

      <div className="sb-section">
        <span>Aktivní projekty</span>
        <a title="Nový projekt">+</a>
      </div>
      <div className="sb-projects">
        {window.PROJECTS.filter(p=>p.status==="aktivní").map(p => (
          <div key={p.id} className="sb-proj" onClick={()=>{setPage("project"); setProjectId(p.id);}} title={p.name}>
            <span className="sb-proj-dot" style={{background: p.color}} />
            <span className="sb-proj-name">{p.name}</span>
            <span className="sb-proj-count">{p.openTasks}</span>
          </div>
        ))}
      </div>

      <div className="sb-foot">
        <div className="sb-foot-av">MZ</div>
        <div className="sb-foot-meta">
          <div className="sb-foot-name">Michal Zich</div>
          <div className="sb-foot-sub">v2 · tmavý režim</div>
        </div>
        <div className="sb-foot-toggle" />
      </div>
    </aside>
  );
}

// === TOPBAR ===
function TopBar({ crumbs }) {
  return (
    <div className="tb">
      <div className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i===crumbs.length-1?"active":""}>{c}</span>
            {i<crumbs.length-1 ? <span className="sep">›</span> : null}
          </React.Fragment>
        ))}
      </div>
      <div className="tb-acts">
        <div className="tb-search">
          <I.search />
          <span>Hledat napříč workspace…</span>
          <kbd>⌘K</kbd>
        </div>
        <button className="tb-btn primary"><I.plus /> Nový úkol</button>
        <button className="tb-bell"><I.bell /><span className="tb-bell-dot" /></button>
      </div>
    </div>
  );
}

// === HEADLINE / LEDGER ===
function Headline({ overdueCount }) {
  return (
    <div className="headline">
      <div className="headline-top">
        <div>
          <div className="hl-greet">Dobré ráno, Michale</div>
          <div className="hl-row">
            <div className="hl-daynum">
              <div className="hl-day">středa</div>
              <div className="hl-num">28</div>
            </div>
            <div className="hl-meta">
              <span className="m-month">května 2026</span>
              <div>týden K22 · CW22</div>
              <div><span className="accent">svátek:</span> Vilém · <span className="accent">jmeniny:</span> Vilém</div>
              <div className="m-row">
                <I.sun /> svítání 05:42
                <span style={{margin:"0 6px", color:"var(--text-4)"}}>·</span>
                <I.moon /> soumrak 21:09
              </div>
            </div>
          </div>
        </div>
        <div className="hl-aside">
          <div className="hl-aside-row"><span className="hl-live-dot" />sync · před 1 min</div>
          <div>Praha · CET · 22 °C</div>
          <div><span className="hl-svatek">☀ slunný den</span></div>
        </div>
      </div>
      <div className="hl-stats">
        <div className="hl-stat">
          <div className="hl-stat-l">Aktivní</div>
          <div className="hl-stat-v">32</div>
          <div className="hl-stat-u">z 55 · ↗ +3 dnes</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Po termínu</div>
          <div className="hl-stat-v" style={{color:"var(--red)"}}>{overdueCount}</div>
          <div className="hl-stat-u" style={{color:"var(--red)"}}>⚠ vyřeš dnes</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Hotovo · týden</div>
          <div className="hl-stat-v" style={{color:"var(--green)"}}>23</div>
          <div className="hl-stat-u" style={{color:"var(--green)"}}>+41 % nad průměr</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Streak 🔥</div>
          <div className="hl-stat-v" style={{color:"var(--accent)"}}>12</div>
          <div className="hl-stat-u">dní · best 28</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Projekty</div>
          <div className="hl-stat-v" style={{color:"var(--blue)"}}>14</div>
          <div className="hl-stat-u">z 15 · 1 hotový</div>
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
            <button className="icon-btn" onClick={onClose}><I.close /></button>
          </div>
        </div>
        <div className="detail-body">
          <div className="row">
            <button className={`icon-btn star ${t.starred?"on":""}`} onClick={()=>onChange({starred: !t.starred})}>
              {t.starred ? <I.star /> : <I.staro />}
            </button>
            <ProjectPill id={t.project} />
            <PrioChip p={t.priority} />
            {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.due}{t.overdue?" ⚠":""}</span> : null}
          </div>
          <h2 className="detail-title">{t.title}</h2>

          <div className="detail-grid">
            <div className="detail-k">Status</div>
            <div className="detail-v"><Stepper status={t.status} onChange={(s)=>onChange({status:s})} /></div>

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
              <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--text-3)"}}>založeno 19. 3. 2026</span>
            </div>

            <div className="detail-k">Projekt</div>
            <div className="detail-v"><ProjectPill id={t.project} /></div>

            <div className="detail-k">Tagy</div>
            <div className="detail-v">
              {["IT","Web OC","Web DC","Elischka","Nesrsta","Jordán","Tisk","Vybavení","Ivana","Online","PPC"].map(tg => {
                const on = t.tags?.includes(tg);
                return (
                  <span key={tg} className="tag" style={{
                    background: on ? "var(--accent-soft)" : undefined,
                    color: on ? "var(--accent)" : undefined,
                    borderColor: on ? "color-mix(in srgb, var(--accent) 30%, transparent)" : undefined,
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
            <div className="detail-h">
              <span>AI asistent</span>
              <span style={{fontFamily:"var(--mono)", fontSize:10.5, color:"var(--accent)", textTransform:"uppercase", letterSpacing:"0.1em"}}>claude-4.5</span>
            </div>
            <div style={{padding: 16, background: "var(--bg-2)", borderRadius: "var(--r)", border:"1px solid color-mix(in srgb, var(--accent) 18%, var(--border-soft))"}}>
              <div style={{fontSize: 13.5, color:"var(--text-2)", lineHeight: 1.55}}>
                <strong style={{color:"var(--accent)"}}>Návrh:</strong> Rozdělit na 3 podúkoly — Brief Inka, Návrh odpovědí, Test linkou. Doporučená priorita: <strong style={{color:"var(--red)"}}>Vysoká</strong>.
              </div>
              <div className="row" style={{marginTop: 12}}>
                <button className="btn primary"><I.spark /> Aplikovat</button>
                <button className="btn">Jiný návrh</button>
                <button className="btn">Vysvětli</button>
              </div>
            </div>
          </div>

          <div className="detail-sect">
            <div className="detail-h"><span>Podúkoly · {t.hasSubtasks || 0}</span></div>
            <div className="row">
              <input className="detail-input" placeholder="Přidat podúkol… (Enter)" />
              <button className="btn primary"><I.plus /></button>
            </div>
            {t.hasSubtasks ? (
              <div style={{marginTop: 12, display:"flex", flexDirection:"column", gap: 6}}>
                {Array.from({length: t.hasSubtasks}, (_, i) => (
                  <label key={i} style={{display:"flex", gap:10, padding:"10px 14px", background:"var(--bg-2)", borderRadius:"var(--r)", border:"1px solid var(--border-soft)", fontSize:14}}>
                    <input type="checkbox" defaultChecked={i===0} />
                    Podúkol {i+1}: vyčistit, zdokumentovat, zpřístupnit
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="detail-sect">
            <div className="detail-h"><span>Připomínka e-mailem</span></div>
            <input className="detail-input" placeholder="dd.mm.rrrr --:--" />
          </div>

          <div className="detail-sect">
            <div className="detail-h"><span>Opakování</span></div>
            <div className="row" style={{flexWrap:"wrap", gap:6}}>
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

// Export to window for app-pages.jsx
Object.assign(window, {
  I, ProjectPill, Tag, PrioChip, Stepper, TaskCard,
  Sidebar, TopBar, Headline, TaskDetail,
});
