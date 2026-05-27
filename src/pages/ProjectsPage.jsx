import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../components/Toast.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import QuickAdd from '../components/QuickAdd.jsx'
import NotesMiniList from '../components/NotesMiniList.jsx'
import { ViewToggle, ListView } from './TasksPage.jsx'
import { STATUSES, STATUS_KEYS, PRIORITIES } from '../constants.js'
import { startOfToday, parseYMD, projectColor } from '../utils.js'
import { formatDate } from '../locale.js'

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#94a3b8" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

function KanbanCard({ task, onDragStart }) {
  const { t, tags, setTaskDetail, updateTask, isMobile } = useApp();
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;
  const phaseCount = task.phases?.length ?? 0;
  const subtasks = task.subtasks || [];
  const subDone = subtasks.filter((s) => s.done).length;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(task.id);
      }}
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        padding: isMobile ? "13px 13px" : "10px 11px",
        cursor: isMobile ? "pointer" : "grab",
        position: "relative",
        userSelect: "none",
      }}
    >
      {task.starred && (
        <span style={{ position: "absolute", top: 7, right: 9, lineHeight: 1 }}>
          <Icon name="star" size={11} color="#eab308" fill="#eab308" strokeWidth={1.5} />
        </span>
      )}

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          marginBottom: 6,
          lineHeight: 1.35,
          textDecoration: task.status === "done" ? "line-through" : "none",
          color: task.status === "done" ? t.text3 : t.text,
          paddingRight: task.starred ? 18 : 0,
        }}
      >
        {task.title || "Bez názvu"}
      </div>

      {pr && (
        <div style={{ marginBottom: 5 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: pr.color, background: pr.bg, padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Icon name={pr.icon} size={10} color={pr.color} strokeWidth={2.5} /> {pr.label}
          </span>
        </div>
      )}

      {taskTags.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
          {taskTags.map((tg) => (
            <span key={tg.id} style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: tg.color + "18", color: tg.color }}>
              {tg.name}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        {task.dueDate && (
          <span
            className="mono"
            style={{
              fontSize: 12,
              fontWeight: isOverdue ? 700 : 400,
              color: isOverdue ? "#ef4444" : t.text3,
              background: isOverdue ? "#ef444410" : "transparent",
              padding: isOverdue ? "1px 5px" : 0,
              borderRadius: 3,
            }}
          >
            {formatDate(task.dueDate) || task.dueDate}
          </span>
        )}
        {phaseCount > 0 && (
          <span style={{ fontSize: 12, color: t.text3, display: "flex", alignItems: "center", gap: 2 }}>
            ☰ {phaseCount}
          </span>
        )}
        {subtasks.length > 0 && (
          <span style={{ fontSize: 12, color: subDone === subtasks.length ? "#22c55e" : t.text3, display: "flex", alignItems: "center", gap: 2 }}>
            <Icon name="check-square" size={10} color={subDone === subtasks.length ? "#22c55e" : t.text3} strokeWidth={2} />
            {subDone}/{subtasks.length}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 3, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
          <button
            key={k}
            onClick={() => updateTask(task.id, { status: k })}
            title={STATUSES[k].label}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 5,
              fontSize: 12,
              border: `1px solid ${STATUSES[k].color}30`,
              background: STATUSES[k].color + "10",
              color: STATUSES[k].color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon name={STATUSES[k].icon} size={9} color="currentColor" strokeWidth={2} />
            <span style={{ fontSize: 9 }}>{STATUSES[k].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { t, projects, tasks, addTask, updateTask, updateProject, deleteProject, selProject, setPage, isMobile } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const project = projects.find((p) => p.id === selProject);

  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [view, setView] = useState("kanban");

  useEffect(() => {
    const handler = () => setView((v) => (v === "kanban" ? "list" : "kanban"));
    window.addEventListener("toggleKanbanView", handler);
    return () => window.removeEventListener("toggleKanbanView", handler);
  }, []);

  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [inlineAdd, setInlineAdd] = useState(null);
  const [inlineVal, setInlineVal] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);

  if (!project) return <div style={{ padding: 40, color: t.text3 }}>Projekt nenalezen</div>;

  const pTasks = tasks.filter((x) => x.projectId === project.id);

  return (
    <div style={{ padding: isMobile ? "14px 16px" : "24px 28px" }} className="fi">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12.5, color: t.text3 }}>
        <button onClick={() => setPage("projects")} style={{ background: "none", border: "none", color: t.text2, cursor: "pointer", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="chevron-left" size={14} color={t.text2} strokeWidth={2} />
          Projekty
        </button>
        <span>›</span>
        <span style={{ color: t.text, fontWeight: 600 }}>{project.name}</span>
      </div>

      {!editing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>{project.name}</h1>
              <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: PROJ_STATUS[project.status].color + "18", color: PROJ_STATUS[project.status].color }}>
                {PROJ_STATUS[project.status].label}
              </span>
            </div>
            {project.description && <p style={{ color: t.text2, fontSize: 13 }}>{project.description}</p>}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                setEName(project.name);
                setEDesc(project.description || "");
                setEditing(true);
              }}
              style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}
            >
              Upravit
            </button>
            <button
              onClick={async () => { if (await confirm("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")) deleteProject(project.id); }}
              style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid #ef444430`, background: "transparent", color: "#ef4444", fontSize: 12 }}
            >
              Smazat
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }} className="pop">
          <input
            value={eName}
            onChange={(e) => setEName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 16, fontWeight: 700, outline: "none", marginBottom: 8 }}
          />
          <textarea
            value={eDesc}
            onChange={(e) => setEDesc(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none", resize: "vertical", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {Object.entries(PROJ_STATUS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => updateProject(project.id, { status: k })}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1px solid ${project.status === k ? v.color : t.border}`,
                  background: project.status === k ? v.color + "18" : "transparent",
                  color: project.status === k ? v.color : t.text2,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                updateProject(project.id, { name: eName, description: eDesc });
                setEditing(false);
                toast("Projekt uložen", "success");
              }}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600 }}
            >
              Uložit
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}>
              Zrušit
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <QuickAdd defaultProjectId={project.id} />
        </div>
        {!isMobile && <ViewToggle view={view} setView={setView} modes={[{ k: "kanban", label: "Kanban", icon: "▦" }, { k: "list", label: "Tabulka", icon: "☰" }]} />}
      </div>

      {view === "kanban" ? (
        <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 10 } : { display: "grid", gridTemplateColumns: `repeat(${STATUS_KEYS.length}, minmax(200px, 1fr))`, gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
          {STATUS_KEYS.map((status) => {
            const cfg = STATUSES[status];
            const allCol = pTasks.filter((x) => x.status === status).sort((a, b) => (a.position || 0) - (b.position || 0));
            const isDone = status === "done";
            const col = isDone && !showAllDone ? allCol.slice(0, 5) : allCol;
            const isDragOver = dragOverStatus === status;

            return (
              <div
                key={status}
                style={{
                  background: isDragOver ? cfg.color + "12" : t.kanban,
                  borderRadius: 10,
                  padding: 8,
                  minHeight: 160,
                  borderTop: `3px solid ${cfg.color}`,
                  outline: isDragOver ? `2px solid ${cfg.color}50` : "2px solid transparent",
                  transition: "background .15s, outline .15s",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStatus(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) updateTask(taskId, { status });
                  setDragOverStatus(null);
                  setDraggingId(null);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, padding: "0 4px" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                    <Icon name={cfg.icon} size={11} color={cfg.color} strokeWidth={2} />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span className="mono" style={{ fontSize: 12, color: t.text3, marginLeft: "auto" }}>
                    {allCol.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {col.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onDragStart={(id) => setDraggingId(id)}
                    />
                  ))}
                </div>

                {isDone && allCol.length > 5 && (
                  <button
                    onClick={() => setShowAllDone((v) => !v)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "5px 0",
                      borderRadius: 6,
                      border: `1px dashed ${t.border}`,
                      background: "transparent",
                      color: t.text3,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {showAllDone ? "Skrýt dokončené" : `+ ${allCol.length - 5} dalších`}
                  </button>
                )}

                {col.length === 0 && inlineAdd !== status && (
                  <div
                    style={{ padding: "20px 8px", textAlign: "center", color: t.text3, fontSize: 12, border: `1.5px dashed ${cfg.color}30`, borderRadius: 8, cursor: "pointer", transition: "border-color .15s" }}
                    onClick={() => setInlineAdd(status)}
                  >
                    <div style={{ fontSize: 18, opacity: 0.35, marginBottom: 4 }}>+</div>
                    Přidat úkol
                  </div>
                )}

                {inlineAdd === status ? (
                  <div style={{ marginTop: 6 }}>
                    <input
                      autoFocus
                      value={inlineVal}
                      onChange={(e) => setInlineVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const title = inlineVal.trim();
                          if (title) { addTask({ title, status, projectId: project.id }); toast("Úkol přidán", "success"); }
                          setInlineAdd(null); setInlineVal("");
                        }
                        if (e.key === "Escape") { setInlineAdd(null); setInlineVal(""); }
                      }}
                      onBlur={() => {
                        const title = inlineVal.trim();
                        if (title) { addTask({ title, status, projectId: project.id }); toast("Úkol přidán", "success"); }
                        setInlineAdd(null); setInlineVal("");
                      }}
                      placeholder="Název úkolu… (Enter)"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: `1px solid ${cfg.color}60`,
                        background: t.card,
                        color: t.text,
                        outline: "none",
                        fontSize: 12.5,
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setInlineAdd(status); setInlineVal(""); }}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "5px 0",
                      borderRadius: 6,
                      border: `1px dashed ${t.border}`,
                      background: "transparent",
                      color: t.text3,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = cfg.color + "80"; e.currentTarget.style.color = cfg.color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3; }}
                  >
                    + Přidat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ListView taskList={pTasks} showProject={false} />
      )}

      {/* Notes section */}
      <div style={{ marginTop: 32, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Poznámky projektu</span>
        </div>
        <NotesMiniList projectId={project.id} />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const { t, projects, tasks, addProject, openProject, isMobile } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");
  const newInputRef = useRef(null);

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const create = () => {
    if (!nName.trim()) return;
    addProject({ name: nName.trim(), description: nDesc.trim(), status: nStatus });
    setNName("");
    setNDesc("");
    setShowNew(false);
    toast("Projekt vytvořen", "success");
  };

  const openNew = () => {
    setShowNew(true);
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const tabs = [
    { k: "all", l: "Vše", count: projects.length },
    { k: "active", l: "Aktivní", count: projects.filter((p) => p.status === "active").length },
    { k: "idea", l: "Nápady", count: projects.filter((p) => p.status === "idea").length },
    { k: "done", l: "Hotové", count: projects.filter((p) => p.status === "done").length },
    { k: "archived", l: "Archiv", count: projects.filter((p) => p.status === "archived").length },
  ];

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px" }} className="fi">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 2 }}>Projekty</h1>
          {!isMobile && <p style={{ color: t.text2, fontSize: 13 }}>{projects.length} projektů celkem · {projects.filter(p => p.status === "active").length} aktivních</p>}
        </div>
        <button
          onClick={openNew}
          style={{ padding: isMobile ? "8px 14px" : "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <span style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}>+</span> {isMobile ? "Nový" : "Nový projekt"}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `1px solid ${t.border}`, paddingBottom: 0, overflowX: isMobile ? "auto" : "visible" }}>
        {tabs.map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px 8px 0 0",
              fontSize: 13,
              fontWeight: filter === tab.k ? 600 : 400,
              border: "none",
              borderBottom: filter === tab.k ? `2px solid ${t.accent}` : "2px solid transparent",
              background: "transparent",
              color: filter === tab.k ? t.accent : t.text2,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color .12s",
            }}
          >
            {tab.l}
            {tab.count > 0 && (
              <span className="mono" style={{ fontSize: 12, padding: "1px 6px", borderRadius: 6, background: filter === tab.k ? t.accentBg : t.input, color: filter === tab.k ? t.accent : t.text3 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* New project form */}
      {showNew && (
        <div style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 14, padding: "20px 22px", marginBottom: 20, boxShadow: `0 0 0 3px ${t.accent}10` }} className="pop">
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>Nový projekt</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              ref={newInputRef}
              value={nName}
              onChange={(e) => setNName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Název projektu…"
              style={{ flex: 2, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 14, fontWeight: 500 }}
            />
            <input
              value={nDesc}
              onChange={(e) => setNDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Popis (volitelně)…"
              style={{ flex: 3, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.entries(PROJ_STATUS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setNStatus(k)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: nStatus === k ? 700 : 400,
                    border: `1.5px solid ${nStatus === k ? v.color : t.border}`,
                    background: nStatus === k ? v.color + "18" : "transparent",
                    color: nStatus === k ? v.color : t.text2,
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setShowNew(false); setNName(""); setNDesc(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12.5 }}>
                Zrušit
              </button>
              <button onClick={create} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: nName.trim() ? 1 : 0.4 }}>
                Vytvořit projekt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {filtered.map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const doneC = pt.filter((x) => x.status === "done").length;
          const doingC = pt.filter((x) => x.status === "doing").length;
          const todoC = pt.filter((x) => x.status === "todo").length;
          const waitingC = pt.filter((x) => x.status === "waiting").length;
          const pct = pt.length > 0 ? Math.round((doneC / pt.length) * 100) : 0;
          const overdueC = pt.filter((x) => {
            const d = parseYMD(x.dueDate);
            return d && x.status !== "done" && d < startOfToday();
          }).length;
          const statusColor = PROJ_STATUS[p.status]?.color || t.text3;
          const projCol = projectColor(p.id);

          return (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderLeft: `4px solid ${projCol}`,
              }}
            >
              {/* Top row: status badge + arrow */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: statusColor + "18", color: statusColor, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {PROJ_STATUS[p.status]?.label || p.status}
                </span>
                <span style={{ color: t.text3, fontSize: 16 }}>›</span>
              </div>

              {/* Name + description */}
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit',sans-serif", lineHeight: 1.2 }}>{p.name}</h3>
              <p style={{ fontSize: 12.5, color: t.text2, marginBottom: 16, lineHeight: 1.45, minHeight: 18, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {p.description || <span style={{ fontStyle: "italic", color: t.text3 }}>Bez popisu</span>}
              </p>

              {/* Task status breakdown */}
              {pt.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {todoC > 0 && <span style={{ fontSize: 12, color: STATUSES.todo.color, background: STATUSES.todo.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.todo.icon} size={10} color="currentColor" strokeWidth={2} /> {todoC}</span>}
                    {doingC > 0 && <span style={{ fontSize: 12, color: STATUSES.doing.color, background: STATUSES.doing.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.doing.icon} size={10} color="currentColor" strokeWidth={2} /> {doingC}</span>}
                    {waitingC > 0 && <span style={{ fontSize: 12, color: STATUSES.waiting.color, background: STATUSES.waiting.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.waiting.icon} size={10} color="currentColor" strokeWidth={2} /> {waitingC}</span>}
                    {doneC > 0 && <span style={{ fontSize: 12, color: STATUSES.done.color, background: STATUSES.done.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.done.icon} size={10} color="currentColor" strokeWidth={2} /> {doneC}</span>}
                    {overdueC > 0 && <span style={{ fontSize: 12, color: "#ef4444", background: "#ef444412", padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>⚠ {overdueC} po termínu</span>}
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: t.input, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${projCol}, #22c55e)`, borderRadius: 999, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: t.text3 }}>{pt.length} úkolů celkem</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? "#22c55e" : t.text2 }}>{pct} %</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: t.text3, fontStyle: "italic", marginTop: 4 }}>Žádné úkoly</div>
              )}
            </div>
          );
        })}

        {/* Add new project tile */}
        {!showNew && (
          <div
            onClick={openNew}
            style={{
              border: `2px dashed ${t.border}`,
              borderRadius: 14,
              padding: "20px 22px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 140,
              color: t.text3,
              transition: "border-color .15s, color .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3; }}
          >
            <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Nový projekt</span>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>◫</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Žádné projekty</div>
          <div style={{ fontSize: 13 }}>V této kategorii nejsou žádné projekty.</div>
        </div>
      )}
    </div>
  );
}
