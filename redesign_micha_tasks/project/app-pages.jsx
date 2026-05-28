// Atlas v2 — page components and main App
const { useState: useS, useEffect: useE, useMemo: useM } = React;

// === RIGHT RAIL ===
function RailDonut() {
  const counts = {
    doing: window.tasksByStatus("doing").length,
    wait: window.tasksByStatus("wait").length,
    todo: window.tasksByStatus("todo").length,
    done: 23,
  };
  const total = counts.todo + counts.doing + counts.wait + counts.done;
  const r = 40, c = 2 * Math.PI * r;
  const segs = [
    { k: "doing", color: "#3b82f6", v: counts.doing, lab: "Rozpracováno" },
    { k: "wait",  color: "#fb923c", v: counts.wait, lab: "Čekám" },
    { k: "todo",  color: "#8b8f9c", v: counts.todo, lab: "To do" },
    { k: "done",  color: "#22c55e", v: counts.done, lab: "Hotovo" },
  ];
  let acc = 0;
  return (
    <div className="rail-card">
      <div className="rail-h"><span className="rail-h-t">Stav úkolů</span><span className="rail-h-a">{total} celkem</span></div>
      <div className="donut-block">
        <div className="donut">
          <svg width="96" height="96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
            {segs.map(s => {
              const frac = s.v / total;
              const dasharray = `${frac * c} ${c}`;
              const dashoffset = -acc * c;
              acc += frac;
              return (
                <circle key={s.k} cx="48" cy="48" r={r} fill="none" stroke={s.color} strokeWidth="9"
                  strokeDasharray={dasharray} strokeDashoffset={dashoffset} strokeLinecap="butt" />
              );
            })}
          </svg>
          <div className="donut-center">
            <div className="donut-num">{total - counts.done}</div>
            <div className="donut-sub">aktivních</div>
          </div>
        </div>
        <div className="donut-legend">
          {segs.map(s => (
            <div key={s.k} className="donut-leg-row">
              <span className="donut-leg-dot" style={{background: s.color}} />
              <span className="donut-leg-label">{s.lab}</span>
              <span className="donut-leg-val">{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RailStreak() {
  const s = window.WORKSPACE.streak;
  const weekProgress = 5 / 7;
  const r = 40, c = 2 * Math.PI * r;
  return (
    <div className="rail-card">
      <div className="rail-h"><span className="rail-h-t">Streak</span><span className="rail-h-a">12 týdnů ↓</span></div>
      <div className="streak-ring">
        <div className="streak-circle">
          <svg width="96" height="96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
            <circle cx="48" cy="48" r={r} fill="none" stroke="var(--accent)" strokeWidth="6"
              strokeDasharray={`${weekProgress * c} ${c}`} strokeLinecap="round" />
          </svg>
          <div className="streak-center">
            <div className="streak-c-num">{s.current}</div>
            <div className="streak-c-sub">dní</div>
          </div>
        </div>
        <div className="streak-meta-col">
          <div className="streak-meta-r"><span className="streak-meta-r-k">best</span><span className="streak-meta-r-v gold">{s.best} 🔥</span></div>
          <div className="streak-meta-r"><span className="streak-meta-r-k">týden</span><span className="streak-meta-r-v">5 / 7</span></div>
          <div className="streak-meta-r"><span className="streak-meta-r-k">měsíc</span><span className="streak-meta-r-v">22</span></div>
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

function RailProjects({ goTo }) {
  return (
    <div className="rail-card">
      <div className="rail-h"><span className="rail-h-t">Progres projektů</span><span className="rail-h-a" onClick={()=>goTo("projekty")}>vše →</span></div>
      {window.PROJECTS.filter(p=>p.status==="aktivní" && p.total>0).slice(0, 8).map(p => (
        <div key={p.id} className="pr-row" onClick={()=>goTo("project", p.id)}>
          <div className="pr-top">
            <span className="pr-dot" style={{background: p.color}} />
            <span className="pr-name">{p.name}</span>
            <span className="pr-pct">{p.progress}%</span>
          </div>
          <div className="pr-bar"><div className="pr-bar-fill" style={{width: `${p.progress}%`, background: p.color}} /></div>
          <div className="pr-sub">{p.openTasks} otev. · {p.doneTasks} hot.</div>
        </div>
      ))}
    </div>
  );
}

function RailNotes({ goTo }) {
  return (
    <div className="rail-card">
      <div className="rail-h"><span className="rail-h-t">Nedávné poznámky</span><span className="rail-h-a" onClick={()=>goTo("poznamky")}>vše →</span></div>
      {window.NOTES.slice(0, 4).map(n => (
        <div key={n.id} className="note-row">
          <div className="note-t">{n.title}</div>
          <div className="note-x">{n.excerpt}</div>
          <div className="note-m">{n.date}{n.project ? ` · ${window.findProject(n.project)?.name}` : ""}</div>
        </div>
      ))}
    </div>
  );
}

// === PAGE: PŘEHLED ===
function PagePrehled({ tasks, setTasks, openTask, goTo }) {
  const [filter, setFilter] = useS("all");
  const I = window.I;

  const overdue = tasks.filter(t => t.overdue && t.status !== "done");
  const doing = tasks.filter(t => t.status === "doing" && !t.overdue);
  const wait = tasks.filter(t => t.status === "wait");
  const todo = tasks.filter(t => t.status === "todo");

  const setStatus = (id, s) => setTasks(prev => prev.map(t => t.id===id ? {...t, status: s, overdue: s==="done"?false:t.overdue} : t));
  const toggleStar = (id) => setTasks(prev => prev.map(t => t.id===id ? {...t, starred: !t.starred} : t));
  const show = (k) => filter==="all" || filter===k;

  const sec = (key, num, title, items, marker, alert) => items.length>0 && show(key) ? (
    <section className="sec">
      <div className="sec-head">
        <span className={`sec-marker ${marker}`} />
        <span className={`sec-title ${alert?"alert":""}`}>{title}</span>
        <span className="sec-count">{items.length}</span>
        <span className="sec-sep" />
        {items.length>3 ? <span className="sec-act">+{items.length-3} dalších</span> : null}
      </div>
      <div className="tcards">
        {items.slice(0, 3).map(t => <window.TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />)}
      </div>
    </section>
  ) : null;

  return (
    <div className="content">
      <window.Headline overdueCount={overdue.length} />

      <div className="work">
        <div>
          {/* AI hero */}
          <div className="ai-hero">
            <div className="ai-orb"><I.spark /></div>
            <div>
              <div className="ai-text-h">
                Mám pro tebe <span className="num">{window.AI_SUGGESTIONS.length}</span> návrhů, jak začít dnešní den.
              </div>
              <div className="ai-text-sub">32 aktivních · {overdue.length} po termínu · streak {window.WORKSPACE.streak.current} dní · claude-4.5</div>
            </div>
            <button className="ai-act"><I.bolt /> Vygenerovat plán</button>
          </div>

          <div className="aisug">
            {window.AI_SUGGESTIONS.map((s, i) => {
              const t = window.findTask(s.taskId);
              return (
                <div key={s.id} className="aisug-card" onClick={()=>openTask(t)}>
                  <span className="aisug-num">{String(i+1).padStart(2,"0")}</span>
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
            <span className={`chip ${filter==="all"?"active":""}`} onClick={()=>setFilter("all")}>
              <span className="chip-dot" style={{background:"var(--text-2)"}} /> Vše <span className="chip-count">{tasks.length}</span>
            </span>
            <span className={`chip ${filter==="overdue"?"active":""}`} onClick={()=>setFilter("overdue")}>
              <span className="chip-dot" style={{background:"var(--red)"}} /> Po termínu <span className="chip-count">{overdue.length}</span>
            </span>
            <span className={`chip ${filter==="doing"?"active":""}`} onClick={()=>setFilter("doing")}>
              <span className="chip-dot" style={{background:"var(--blue)"}} /> Rozpracováno <span className="chip-count">{doing.length}</span>
            </span>
            <span className={`chip ${filter==="wait"?"active":""}`} onClick={()=>setFilter("wait")}>
              <span className="chip-dot" style={{background:"var(--orange)"}} /> Čekám <span className="chip-count">{wait.length}</span>
            </span>
            <span className={`chip ${filter==="todo"?"active":""}`} onClick={()=>setFilter("todo")}>
              <span className="chip-dot" style={{background:"var(--gray)"}} /> To do <span className="chip-count">{todo.length}</span>
            </span>
            <span className="chip">
              <span className="chip-dot" style={{background:"var(--accent)"}} /> Top úkoly <span className="chip-count">{tasks.filter(t=>t.starred).length}</span>
            </span>
            <span className="chips-sep" />
            <span className="chip">Seskupit ▾</span>
            <span className="chip">Řadit ▾</span>
          </div>

          {sec("overdue", "I.", "Po termínu", overdue, "alert", true)}
          {sec("doing", "II.", "Rozpracováno", doing, "doing")}
          {sec("wait", "III.", "Čekám", wait, "wait")}
          {sec("todo", "IV.", "To do", todo, "todo")}
        </div>

        <aside className="rail">
          <RailDonut />
          <RailStreak />
          <RailProjects goTo={goTo} />
          <RailNotes goTo={goTo} />
        </aside>
      </div>
    </div>
  );
}

// === PAGE: RYCHLÝ ===
function PageRychly() {
  const I = window.I;
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Nakup · udělej · vyřiď</div>
          <h1 className="ph-title">Rychlý seznam</h1>
          <div className="ph-sub"><span>2 položky</span><span className="dot" /><span>nejjednodušší capture</span></div>
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
              <window.PrioChip p="medium" />
              <window.Tag name="Cíga" />
              <span style={{color:"var(--text-3)", fontSize:13}}>Koukni na weba doručení.</span>
            </div>
          </div>
          <div className="tcard-acts"><window.Stepper status="wait" /></div>
        </div>
        <div className="tcard todo">
          <div className="tcard-state" />
          <div className="tcard-body"><div className="tcard-title">Kamik</div></div>
          <div className="tcard-acts"><window.Stepper status="todo" /></div>
        </div>
      </div>
    </div>
  );
}

// === PAGE: PROJEKTY ===
function PageProjekty({ goTo }) {
  const [tab, setTab] = useS("aktivni");
  const tabs = [
    { id: "vse", label: "Vše", count: 15 },
    { id: "aktivni", label: "Aktivní", count: 14 },
    { id: "napady", label: "Nápady", count: 0 },
    { id: "hotove", label: "Hotové", count: 1 },
    { id: "archiv", label: "Archiv", count: 0 },
  ];
  const filtered = window.PROJECTS.filter(p => tab==="vse" || (tab==="aktivni" && p.status==="aktivní") || (tab==="hotove" && p.status==="hotový"));

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">15 projektů · 14 aktivních · 1 hotový</div>
          <h1 className="ph-title">Projekty</h1>
          <div className="ph-sub"><span>poslední úprava: 27. 5.</span></div>
        </div>
        <button className="btn primary"><window.I.plus /> Nový projekt</button>
      </div>

      <div className="chips" style={{marginBottom: 22}}>
        {tabs.map(t => (
          <span key={t.id} className={`chip ${tab===t.id?"active":""}`} onClick={()=>setTab(t.id)}>
            {t.label} <span className="chip-count">{t.count}</span>
          </span>
        ))}
        <span className="chips-sep" />
        <span className="chip">Seskupit ▾</span>
        <span className="chip">Řadit: progres ▾</span>
      </div>

      <div className="pgrid">
        {filtered.map(p => {
          const doing = window.TASKS.filter(t => t.project===p.id && t.status==="doing").length;
          const wait = window.TASKS.filter(t => t.project===p.id && t.status==="wait").length;
          const todo = window.TASKS.filter(t => t.project===p.id && t.status==="todo").length;
          return (
            <div key={p.id} className="pcard" style={{"--proj-color": p.color}} onClick={()=>goTo("project", p.id)}>
              <div className="pcard-top">
                <span className="pcard-stat">{p.status}{p.overdueCount ? ` · ⚠ ${p.overdueCount}` : ""}</span>
                <span style={{color:"var(--text-3)"}}>›</span>
              </div>
              <div className="pcard-name">{p.name}</div>
              <div className="pcard-sub">{p.total} úkolů · {p.doneTasks} hotových</div>
              <div className="pcard-counts">
                {todo>0 ? <span className="pcc todo">○ <span className="pcc-v">{todo}</span></span> : null}
                {doing>0 ? <span className="pcc doing">◐ <span className="pcc-v">{doing}</span></span> : null}
                {wait>0 ? <span className="pcc wait">◑ <span className="pcc-v">{wait}</span></span> : null}
                {p.doneTasks>0 ? <span className="pcc done">● <span className="pcc-v">{p.doneTasks}</span></span> : null}
              </div>
              <div className="pcard-bar"><div className="pcard-fill" style={{width: `${p.progress}%`}} /></div>
              <div className="pcard-foot">
                <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--text-3)"}}>progres</span>
                <span className="pcard-pct">{p.progress}%</span>
              </div>
            </div>
          );
        })}
        <div className="pcard" style={{borderStyle:"dashed", borderColor:"var(--border)", borderLeftColor:"var(--border)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", color:"var(--text-3)", minHeight: 220}}>
          <window.I.plus />
          <span style={{marginTop:8, fontFamily:"var(--serif)", fontStyle:"italic", fontSize: 19}}>Nový projekt</span>
        </div>
      </div>
    </div>
  );
}

// === PAGE: PROJECT DETAIL ===
function PageProject({ projectId, openTask, goTo, tasks, setTasks }) {
  const p = window.findProject(projectId);
  if (!p) return null;
  const projectTasks = tasks.filter(t => t.project === projectId);
  const cols = [
    { id: "todo", label: "To do", color: "var(--gray)" },
    { id: "doing", label: "Rozpracováno", color: "var(--blue)" },
    { id: "wait", label: "Čekám", color: "var(--orange)" },
    { id: "done", label: "Hotovo", color: "var(--green)" },
  ];
  const setStatus = (id, s) => setTasks(prev => prev.map(t => t.id===id ? {...t, status:s, overdue: s==="done"?false:t.overdue} : t));

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow" style={{cursor:"pointer"}} onClick={()=>goTo("projekty")}>← Projekty</div>
          <h1 className="ph-title" style={{display:"flex", alignItems:"center", gap:20}}>
            <span style={{width:16, height:16, borderRadius:4, background:p.color, display:"inline-block"}} />
            {p.name}
            <span style={{
              fontFamily:"var(--mono)", fontSize:11, color: p.color,
              padding:"5px 14px", border:`1px solid ${p.color}`,
              borderRadius:"var(--r-pill)", textTransform:"uppercase", letterSpacing:"0.12em",
              fontWeight: 500,
            }}>{p.status}</span>
          </h1>
          <div className="ph-sub">
            <span>{p.total} úkolů</span><span className="dot" />
            <span>{p.progress}% hotových</span><span className="dot" />
            <span>založeno 19. 3. 2026</span>
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

      <div className="quickadd" style={{borderColor:"var(--border-soft)", background: "var(--bg-2)"}}>
        <span className="quickadd-plus" style={{background:"var(--accent-soft)", color:"var(--accent)"}}>
          <window.I.note />
        </span>
        <input placeholder={`Nová poznámka k projektu ${p.name}…`} />
        <span className="quickadd-kbd">Enter</span>
      </div>

      <div className="kanban">
        {cols.map(c => {
          const ct = projectTasks.filter(t => t.status===c.id);
          return (
            <div key={c.id} className="kcol" style={{"--col-color": c.color}}>
              <div className="kcol-head">
                <span className="kcol-name">{c.label}</span>
                <span className="kcol-count">{ct.length}</span>
                <span className="kcol-add"><window.I.plus /></span>
              </div>
              {ct.map(t => (
                <div key={t.id} className="kcard" onClick={()=>openTask(t)}>
                  <div className="kcard-t">{t.title}</div>
                  <div className="kcard-m">
                    {t.priority && t.priority!=="medium" && t.priority!=="none" ? <window.PrioChip p={t.priority} /> : null}
                    {t.tags?.slice(0,2).map(tg => <window.Tag key={tg} name={tg} />)}
                    {t.due ? <span className={`due ${t.overdue?"overdue":""}`}>{t.due}</span> : null}
                  </div>
                  {t.hasSubtasks ? <div className="kcard-sub">≡ {t.hasSubtasks} podúkoly</div> : null}
                  <div className="kcard-quick" onClick={e=>e.stopPropagation()}>
                    <button className={t.status==="todo"?"cur todo":""} onClick={()=>setStatus(t.id, "todo")}>To do</button>
                    <button className={t.status==="doing"?"cur doing":t.status==="wait"?"cur wait":""}
                      onClick={()=>setStatus(t.id, t.status==="doing"?"wait":"doing")}>
                      {t.status==="wait" ? "Čekám" : "Doing"}
                    </button>
                    <button className={t.status==="done"?"cur done":""} onClick={()=>setStatus(t.id, "done")}>Hotovo</button>
                  </div>
                </div>
              ))}
              {ct.length === 0 ? (
                <div className="kcard" style={{borderStyle:"dashed", textAlign:"center", color:"var(--text-3)", padding:"18px"}}>+ Přidat úkol</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === PAGE: ÚKOLY ===
function PageUkoly({ tasks, openTask, setTasks }) {
  const [view, setView] = useS("table");
  const [filter, setFilter] = useS("vse");
  const setStatus = (id, s) => setTasks(prev => prev.map(t => t.id===id ? {...t, status:s, overdue: s==="done"?false:t.overdue} : t));
  const toggleStar = (id) => setTasks(prev => prev.map(t => t.id===id ? {...t, starred: !t.starred} : t));

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">55 úkolů celkem · 32 aktivních · 23 hotových</div>
          <h1 className="ph-title">Úkoly</h1>
          <div className="ph-sub"><span>poslední úprava: 27. 5.</span></div>
        </div>
        <div className="row">
          <button className={`btn ${view==="cards"?"primary":""}`} onClick={()=>setView("cards")}>Karty</button>
          <button className={`btn ${view==="table"?"primary":""}`} onClick={()=>setView("table")}>Tabulka</button>
        </div>
      </div>

      <div className="chips">
        {["vse","todo","doing","wait","done"].map(f => (
          <span key={f} className={`chip ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>
            {f==="vse" ? <><span className="chip-dot" style={{background:"var(--text-2)"}}/>Vše</> :
              <><span className="chip-dot" style={{background: window.STATUS_META[f].color}} />{window.STATUS_META[f].label}</>}
          </span>
        ))}
        <span className="chips-div" />
        <span className="chip">Priorita ▾</span>
        <span className="chip">Projekt ▾</span>
        <span className="chip">Tag ▾</span>
        <span className="chips-sep" />
        <span className="chip">+ Filtr</span>
      </div>

      {view === "table" ? (
        <div className="ttable">
          <div className="ttable-row head">
            <div></div>
            <div className="head-sort">Název ↑</div>
            <div className="head-sort">Status</div>
            <div className="head-sort">Priorita</div>
            <div className="head-sort">Projekt</div>
            <div className="head-sort">Termín</div>
          </div>
          {tasks.slice(0, 12).map(t => (
            <div key={t.id} className="ttable-row" onClick={()=>openTask(t)}>
              <input type="checkbox" onClick={e=>e.stopPropagation()} />
              <div className={`tt-name ${t.status==="done"?"done":""}`}>{t.title}</div>
              <div>
                <span className={`tt-st ${t.status}`}>
                  <span className="d" /> {window.STATUS_META[t.status].label}
                </span>
              </div>
              <div><window.PrioChip p={t.priority} /></div>
              <div><window.ProjectPill id={t.project} /></div>
              <div><span className={`due ${t.overdue?"overdue":""}`}>{t.due || "—"}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tcards" style={{marginTop: 8}}>
          {tasks.slice(0, 10).map(t => (
            <window.TaskCard key={t.id} t={t} onOpen={openTask} onStatusChange={setStatus} onStar={toggleStar} />
          ))}
        </div>
      )}
    </div>
  );
}

// === PAGE: PLÁN ===
function PagePlan({ openTask }) {
  const days = Array.from({length: 28}, (_, i) => i + 1);
  const today = 28;
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
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">29. dubna → 26. května 2026 · 4 týdny</div>
          <h1 className="ph-title">Plán</h1>
          <div className="ph-sub"><span>2 po termínu</span><span className="dot" /><span>14 projektů</span></div>
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
              <span style={{width:9, height:9, borderRadius:"50%", background:p.color, display:"inline-block"}} />
              <span style={{flex:1}}>{p.name}</span>
              <span style={{fontFamily:"var(--mono)", fontSize:11, color:"var(--text-4)"}}>{p.openTasks}</span>
            </div>
            <div className="tl-grid">
              {days.map(d => <div key={d} className={`tl-cell ${d===today?"today":""}`} />)}
              {placements.filter(x => x.project === p.id).map((x, i) => (
                <div key={i} className={`tl-task ${x.overdue?"overdue":""}`}
                  style={{
                    left: `calc(${(x.start - 1) / 28 * 100}% + 3px)`,
                    width: `calc(${x.span / 28 * 100}% - 6px)`,
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

// === PAGE: TAGY ===
function PageTagy() {
  const tagsData = [
    { name: "IT", count: 14, projects: 6, color: "var(--blue)" },
    { name: "Web OC", count: 11, projects: 2 },
    { name: "Elischka", count: 9, projects: 4 },
    { name: "Web DC", count: 7, projects: 2 },
    { name: "Nesrsta", count: 6, projects: 3 },
    { name: "Ivana", count: 5, projects: 3 },
    { name: "Online", count: 5, projects: 2 },
    { name: "Jordán", count: 4, projects: 2 },
    { name: "PPC", count: 3, projects: 1 },
    { name: "Tisk", count: 3, projects: 2 },
    { name: "Vybavení", count: 2, projects: 1 },
    { name: "Data - Zbyněk", count: 2, projects: 1 },
    { name: "Zákaznická linka", count: 2, projects: 1 },
    { name: "Cíga", count: 1, projects: 0 },
  ];
  const max = Math.max(...tagsData.map(t => t.count));

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">14 tagů · sdílené napříč projekty</div>
          <h1 className="ph-title">Tagy</h1>
          <div className="ph-sub"><span>nejpoužívanější: IT (14×)</span></div>
        </div>
        <button className="btn primary"><window.I.plus /> Nový tag</button>
      </div>

      <div className="quickadd">
        <span className="quickadd-plus">#</span>
        <input placeholder="Název nového tagu… (např. 'Newsletter')" />
        <span className="quickadd-kbd">Enter</span>
      </div>

      <div className="tagtable">
        <div className="tagrow head">
          <div>Tag ↑</div>
          <div>Použití</div>
          <div>Projekty</div>
          <div>Akce</div>
        </div>
        {tagsData.map(t => (
          <div key={t.name} className="tagrow">
            <div className="tagrow-name">{t.name}</div>
            <div className="tagrow-bar">
              <div className="tagrow-bar-fill"><div style={{width: `${(t.count/max)*100}%`}} /></div>
              <span className="tagrow-count">{t.count}×</span>
            </div>
            <div style={{fontFamily:"var(--mono)", color:"var(--text-3)", fontSize: 13}}>{t.projects} projektů</div>
            <div className="row">
              <button className="icon-btn" title="Filtrovat"><window.I.search /></button>
              <button className="icon-btn" title="Upravit">⋯</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === PAGE: POZNÁMKY ===
function PagePoznamky() {
  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">10 poznámek · 4 nové dnes</div>
          <h1 className="ph-title">Poznámky</h1>
          <div className="ph-sub"><span>poslední úprava: před 1 hod</span></div>
        </div>
        <button className="btn primary"><window.I.plus /> Nová poznámka</button>
      </div>

      <div className="chips">
        <span className="chip active">Všechny <span className="chip-count">10</span></span>
        <span className="chip">Bez projektu <span className="chip-count">2</span></span>
        <span className="chip">Dnes <span className="chip-count">4</span></span>
        <span className="chip">Tento týden <span className="chip-count">7</span></span>
        <span className="chips-sep" />
        <span className="chip">Seskupit ▾</span>
      </div>

      <div className="ngrid">
        {window.NOTES.concat(window.NOTES.slice(0, 2)).map((n, i) => (
          <div key={i} className="ncard" style={{"--proj-color": n.project ? window.findProject(n.project)?.color : "var(--text-3)"}}>
            <div className="ncard-top">
              <span className="ncard-date">{n.date}</span>
              {n.project ? <window.ProjectPill id={n.project} /> : null}
            </div>
            <div className="ncard-t">{n.title}</div>
            <div className="ncard-x">{n.excerpt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === APP ===
function App() {
  const [page, setPage] = useS("prehled");
  const [projectId, setProjectId] = useS(null);
  const [tasks, setTasks] = useS(window.TASKS.map(t => ({...t})));
  const [openObj, setOpenObj] = useS(null);
  const [collapsed, setCollapsed] = useS(false);

  const openTask = (t) => setOpenObj(t);
  const closeTask = () => setOpenObj(null);
  const updateTask = (patch) => {
    if (!openObj) return;
    const next = { ...openObj, ...patch };
    setOpenObj(next);
    setTasks(prev => prev.map(t => t.id === openObj.id ? next : t));
  };

  const goTo = (p, id) => { setPage(p); if (id) setProjectId(id); };

  const crumbs = useM(() => {
    if (page==="prehled") return ["Workspace", "Přehled"];
    if (page==="projekty") return ["Workspace", "Projekty"];
    if (page==="project") return ["Workspace", "Projekty", window.findProject(projectId)?.name || ""];
    if (page==="ukoly") return ["Workspace", "Úkoly"];
    if (page==="plan") return ["Workspace", "Plán"];
    if (page==="poznamky") return ["Workspace", "Poznámky"];
    if (page==="rychly") return ["Workspace", "Rychlý seznam"];
    if (page==="tagy") return ["Workspace", "Tagy"];
    return [page];
  }, [page, projectId]);

  return (
    <div className={`app ${collapsed?"collapsed":""}`}>
      <window.Sidebar page={page} setPage={setPage} setProjectId={setProjectId} collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="main">
        <window.TopBar crumbs={crumbs} />
        {page==="prehled" ? <PagePrehled tasks={tasks} setTasks={setTasks} openTask={openTask} goTo={goTo} /> : null}
        {page==="rychly" ? <PageRychly /> : null}
        {page==="projekty" ? <PageProjekty goTo={goTo} /> : null}
        {page==="project" ? <PageProject projectId={projectId} openTask={openTask} goTo={goTo} tasks={tasks} setTasks={setTasks} /> : null}
        {page==="ukoly" ? <PageUkoly tasks={tasks} openTask={openTask} setTasks={setTasks} /> : null}
        {page==="plan" ? <PagePlan openTask={openTask} /> : null}
        {page==="tagy" ? <PageTagy /> : null}
        {page==="poznamky" ? <PagePoznamky /> : null}
      </div>
      {openObj ? <window.TaskDetail t={openObj} onClose={closeTask} onChange={updateTask} /> : null}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
