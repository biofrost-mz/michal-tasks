import React, { useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Icon from "../components/Icon.jsx";
import NotesMiniList from "../components/NotesMiniList.jsx";
import ProjectChatPanel from "../components/ProjectChatPanel.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import { projectColor, parseYMD, startOfToday } from "../utils.js";

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#8b8f9c" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

const TASK_COLS = [
  { id: "todo", label: "To do", color: "var(--gray)", className: "todo" },
  { id: "doing", label: "Rozpracováno", color: "var(--blue)", className: "doing" },
  { id: "waiting", label: "Čekám", color: "var(--orange)", className: "wait" },
  { id: "done", label: "Hotovo", color: "var(--green)", className: "done" },
];

function taskDue(task) {
  const d = parseYMD(task.dueDate);
  if (!d) return null;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function taskOverdue(task) {
  const d = parseYMD(task.dueDate);
  if (!d || task.status === "done") return false;
  return d < startOfToday();
}

function TaskStatusButton({ current, target, onClick, label }) {
  return (
    <button className={current === target ? `cur ${target === "waiting" ? "wait" : target}` : ""} onClick={onClick}>
      {label}
    </button>
  );
}

export function ProjectDetailPage() {
  const {
    projects,
    tasks,
    notes,
    selProject,
    setPage,
    addTask,
    updateTask,
    updateProject,
    deleteProject,
    setTaskDetail,
    addNote,
    openNote,
  } = useApp();

  const toast = useToast();
  const confirm = useConfirm();

  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [quickTask, setQuickTask] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [inlineAdd, setInlineAdd] = useState(null);
  const [inlineVal, setInlineVal] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const touchTaskIdRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchElementRef = useRef(null);

  const project = projects.find((p) => p.id === selProject);
  if (!project) return <div className="content"><div className="ph-title">Projekt nenalezen</div></div>;

  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const projectNotes = notes.filter((n) => n.primaryProjectId === project.id);

  const doneCount = projectTasks.filter((t) => t.status === "done").length;
  const progress = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0;

  const saveEdit = () => {
    updateProject(project.id, { name: eName.trim() || project.name, description: eDesc.trim() });
    setEditing(false);
    toast("Projekt uložen", "success");
  };

  const createTask = (status = "todo", title = quickTask) => {
    const clean = title.trim();
    if (!clean) return;
    addTask({ title: clean, status, projectId: project.id });
    setQuickTask("");
    setInlineVal("");
    setInlineAdd(null);
  };

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow" style={{ cursor: "pointer" }} onClick={() => setPage("projects")}>← Projekty</div>
          <h1 className="ph-title" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ width: 16, height: 16, borderRadius: 4, background: projectColor(project.id), display: "inline-block" }} />
            {project.name}
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: projectColor(project.id),
                padding: "5px 14px",
                border: `1px solid ${projectColor(project.id)}`,
                borderRadius: "var(--r-pill)",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontWeight: 500,
              }}
            >
              {PROJ_STATUS[project.status]?.label || project.status}
            </span>
          </h1>
          <div className="ph-sub">
            <span>{projectTasks.length} úkolů</span><span className="dot" />
            <span>{progress}% hotových</span><span className="dot" />
            <span>poslední úprava: dnes</span>
          </div>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setEditing(true);
              setEName(project.name || "");
              setEDesc(project.description || "");
            }}
          >
            Upravit
          </button>
          <button
            className="btn"
            onClick={() => setChatOpen(true)}
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            💬 Chat
          </button>
          <button
            className="btn danger"
            onClick={async () => {
              if (!(await confirm("Opravdu smazat projekt? Úkoly přejdou do Inboxu."))) return;
              await deleteProject(project.id);
              setPage("projects");
            }}
          >
            Smazat
          </button>
        </div>
      </div>

      {editing ? (
        <div className="quickadd" style={{ borderStyle: "solid", marginBottom: 12 }}>
          <span className="quickadd-plus">✎</span>
          <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Název projektu" />
          <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Popis projektu" />
          <button className="btn primary" onClick={saveEdit}>Uložit</button>
          <button className="btn" onClick={() => setEditing(false)}>Zrušit</button>
        </div>
      ) : null}

      <div style={{ marginBottom: 18 }}>
        <QuickAdd defaultProjectId={project.id} />
      </div>

      <div className="quickadd" style={{ borderColor: "var(--border-soft)", background: "var(--bg-2)" }}>
        <span className="quickadd-plus" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
          <Icon name="file-text" size={13} color="currentColor" strokeWidth={1.8} />
        </span>
        <input
          placeholder={`Nová poznámka k projektu ${project.name}…`}
          value={quickNote}
          onChange={(e) => setQuickNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const clean = quickNote.trim();
              if (clean) {
                const n = addNote({ title: clean, primaryProjectId: project.id });
                openNote(n.id);
                setQuickNote("");
              }
            }
          }}
        />
        <span className="quickadd-kbd">Enter</span>
      </div>

      <div className="kanban">
        {TASK_COLS.map((col) => {
          const listAll = projectTasks.filter((t) => t.status === col.id);
          const list = col.id === "done" && !showAllDone ? listAll.slice(0, 5) : listAll;

          return (
            <div
              key={col.id}
              className="kcol"
              style={{ "--col-color": col.color }}
              data-col-id={col.id}
              onDragOver={(e) => { e.preventDefault(); }}
              onDragEnter={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("drag-over"); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove("drag-over");
                const taskId = e.dataTransfer.getData("text/plain");
                if (taskId) {
                  updateTask(taskId, { status: col.id });
                }
              }}
            >
              <div className="kcol-head">
                <span className="kcol-name">{col.label}</span>
                <span className="kcol-count">{listAll.length}</span>
                <span className="kcol-add" onClick={() => { setInlineAdd(col.id); setInlineVal(""); }}><Icon name="plus" size={12} color="currentColor" strokeWidth={2} /></span>
              </div>

              {list.map((t) => (
                <div
                  key={t.id}
                  className="kcard"
                  onClick={() => setTaskDetail(t.id)}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", t.id);
                    e.currentTarget.classList.add("dragging");
                  }}
                  onDragEnd={(e) => {
                    e.currentTarget.classList.remove("dragging");
                  }}
                  onTouchStart={(e) => {
                    touchTaskIdRef.current = t.id;
                    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                    touchElementRef.current = e.currentTarget;
                  }}
                  onTouchMove={(e) => {
                    if (!touchStartRef.current || !touchElementRef.current) return;
                    const dx = e.touches[0].clientX - touchStartRef.current.x;
                    const dy = e.touches[0].clientY - touchStartRef.current.y;
                    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                      if (e.cancelable) e.preventDefault();
                      touchElementRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 10px)`;
                      touchElementRef.current.style.zIndex = "1000";
                      touchElementRef.current.classList.add("dragging");

                      const elem = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
                      const colElem = elem?.closest(".kcol");
                      document.querySelectorAll(".kcol").forEach((col) => {
                        if (col === colElem) {
                          col.classList.add("drag-over");
                        } else {
                          col.classList.remove("drag-over");
                        }
                      });
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!touchElementRef.current) return;
                    const clientX = e.changedTouches[0].clientX;
                    const clientY = e.changedTouches[0].clientY;
                    const elem = document.elementFromPoint(clientX, clientY);
                    const colElem = elem?.closest(".kcol");
                    if (colElem) {
                      const colId = colElem.getAttribute("data-col-id");
                      if (colId && colId !== t.status) {
                        updateTask(touchTaskIdRef.current, { status: colId });
                      }
                    }
                    touchElementRef.current.style.transform = "";
                    touchElementRef.current.style.zIndex = "";
                    touchElementRef.current.classList.remove("dragging");
                    document.querySelectorAll(".kcol").forEach((col) => {
                      col.classList.remove("drag-over");
                    });
                    touchTaskIdRef.current = null;
                    touchStartRef.current = null;
                    touchElementRef.current = null;
                  }}
                >
                  <div className="kcard-t">{t.title || "Bez názvu"}</div>
                  <div className="kcard-m">
                    {t.priority === "high" ? <span className="prio" style={{ "--prio-color": "#f87171" }}>↑ Vysoká</span> : null}
                    {t.dueDate ? <span className={`due ${taskOverdue(t) ? "overdue" : ""}`}>{taskDue(t)}</span> : null}
                  </div>
                  {Array.isArray(t.subtasks) && t.subtasks.length > 0 ? <div className="kcard-sub">≡ {t.subtasks.length} podúkoly</div> : null}
                  <div className="kcard-quick" onClick={(e) => e.stopPropagation()}>
                    <TaskStatusButton current={t.status} target="todo" label="To do" onClick={() => updateTask(t.id, { status: "todo" })} />
                    <TaskStatusButton current={t.status} target={t.status === "waiting" ? "waiting" : "doing"} label={t.status === "waiting" ? "Čekám" : "Doing"} onClick={() => updateTask(t.id, { status: t.status === "doing" ? "waiting" : "doing" })} />
                    <TaskStatusButton current={t.status} target="done" label="Hotovo" onClick={() => updateTask(t.id, { status: "done" })} />
                  </div>
                </div>
              ))}

              {col.id === "done" && listAll.length > 5 ? (
                <button className="btn" style={{ width: "100%", marginTop: 6 }} onClick={() => setShowAllDone((v) => !v)}>
                  {showAllDone ? "Skrýt dokončené" : `+ ${listAll.length - 5} dalších`}
                </button>
              ) : null}

              {inlineAdd === col.id ? (
                <div style={{ marginTop: 6 }}>
                  <input
                    autoFocus
                    value={inlineVal}
                    onChange={(e) => setInlineVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createTask(col.id, inlineVal);
                      if (e.key === "Escape") { setInlineAdd(null); setInlineVal(""); }
                    }}
                    onBlur={() => createTask(col.id, inlineVal)}
                    placeholder="Název úkolu… (Enter)"
                    className="detail-input"
                    style={{ width: "100%" }}
                  />
                </div>
              ) : null}

              {listAll.length === 0 && inlineAdd !== col.id ? (
                <div className="kcard" style={{ borderStyle: "dashed", textAlign: "center", color: "var(--text-3)", padding: "18px" }} onClick={() => { setInlineAdd(col.id); setInlineVal(""); }}>
                  + Přidat úkol
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, borderTop: "1px solid var(--border)", paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Poznámky projektu</span>
        </div>
        <NotesMiniList projectId={project.id} />
      </div>

      {chatOpen ? (
        <ProjectChatPanel
          project={project}
          tasks={projectTasks}
          notes={projectNotes}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, tasks, addProject, openProject } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");
  const newInputRef = useRef(null);

  const [pGroupBy, setPGroupBy] = useState("none"); // "none", "status"
  const [pSortBy, setPSortBy] = useState("progress"); // "progress", "alphabetical", "tasksCount"
  const [pGroupOpen, setPGroupByOpen] = useState(false);
  const [pSortOpen, setPSortByOpen] = useState(false);

  const pGroupRef = useRef(null);
  const pSortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pGroupRef.current && !pGroupRef.current.contains(e.target)) {
        setPGroupByOpen(false);
      }
      if (pSortRef.current && !pSortRef.current.contains(e.target)) {
        setPSortByOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const PROJ_GROUP_LABELS = {
    none: "Bez seskupení",
    status: "Stavu",
  };

  const PROJ_SORT_LABELS = {
    progress: "Progresu",
    alphabetical: "Abecedy",
    tasksCount: "Počtu úkolů",
  };

  const sortedProjects = useMemo(() => {
    let list = [...projects];

    if (tab !== "all") {
      list = list.filter((p) => p.status === tab);
    }

    if (pSortBy === "alphabetical") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (pSortBy === "tasksCount") {
      list.sort((a, b) => {
        const countA = tasks.filter((t) => t.projectId === a.id).length;
        const countB = tasks.filter((t) => t.projectId === b.id).length;
        return countB - countA;
      });
    } else {
      list.sort((a, b) => {
        const tasksA = tasks.filter((t) => t.projectId === a.id);
        const doneA = tasksA.filter((t) => t.status === "done").length;
        const progressA = tasksA.length ? (doneA / tasksA.length) : 0;

        const tasksB = tasks.filter((t) => t.projectId === b.id);
        const doneB = tasksB.filter((t) => t.status === "done").length;
        const progressB = tasksB.length ? (doneB / tasksB.length) : 0;

        return progressB - progressA;
      });
    }

    return list;
  }, [projects, tab, pSortBy, tasks]);

  const groupedProjects = useMemo(() => {
    if (pGroupBy !== "status") return null;

    const groups = {
      active: { label: "Aktivní", items: [] },
      idea: { label: "Nápady", items: [] },
      done: { label: "Hotové", items: [] },
      archived: { label: "Archiv", items: [] },
    };

    sortedProjects.forEach((p) => {
      if (groups[p.status]) {
        groups[p.status].items.push(p);
      }
    });

    return Object.entries(groups).filter(([k, g]) => g.items.length > 0);
  }, [sortedProjects, pGroupBy]);

  const counts = {
    all: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    idea: projects.filter((p) => p.status === "idea").length,
    done: projects.filter((p) => p.status === "done").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

  const create = () => {
    if (!nName.trim()) return;
    addProject({ name: nName.trim(), description: nDesc.trim(), status: nStatus });
    setNName("");
    setNDesc("");
    setNStatus("active");
    setShowNew(false);
    toast("Projekt vytvořen", "success");
  };

  const openNew = () => {
    setShowNew(true);
    setTimeout(() => newInputRef.current?.focus(), 40);
  };

  const renderProjectCard = (p) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const done = projectTasks.filter((t) => t.status === "done").length;
    const doing = projectTasks.filter((t) => t.status === "doing").length;
    const wait = projectTasks.filter((t) => t.status === "waiting").length;
    const todo = projectTasks.filter((t) => t.status === "todo").length;
    const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
    const overdueCount = projectTasks.filter((t) => taskOverdue(t)).length;

    return (
      <div key={p.id} className="pcard" style={{ "--proj-color": projectColor(p.id) }} onClick={() => openProject(p.id)}>
        <div className="pcard-top">
          <span className="pcard-stat">{PROJ_STATUS[p.status]?.label || p.status}{overdueCount ? ` · ⚠ ${overdueCount}` : ""}</span>
          <span style={{ color: "var(--text-3)" }}>›</span>
        </div>
        <div className="pcard-name">{p.name}</div>
        <div className="pcard-sub">{projectTasks.length} úkolů · {done} hotových</div>
        <div className="pcard-counts">
          {todo > 0 ? <span className="pcc todo">○ <span className="pcc-v">{todo}</span></span> : null}
          {doing > 0 ? <span className="pcc doing">◐ <span className="pcc-v">{doing}</span></span> : null}
          {wait > 0 ? <span className="pcc wait">◑ <span className="pcc-v">{wait}</span></span> : null}
          {done > 0 ? <span className="pcc done">● <span className="pcc-v">{done}</span></span> : null}
        </div>
        <div className="pcard-bar"><div className="pcard-fill" style={{ width: `${progress}%` }} /></div>
        <div className="pcard-foot">
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>progres</span>
          <span className="pcard-pct">{progress}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">{projects.length} projektů · {counts.active} aktivních</div>
          <h1 className="ph-title">Projekty</h1>
          <div className="ph-sub"><span>poslední úprava: dnes</span></div>
        </div>
        <button className="btn primary" onClick={openNew}><Icon name="plus" size={13} color="currentColor" strokeWidth={2} /> Nový projekt</button>
      </div>

      <div className="chips" style={{ marginBottom: 22 }}>
        {[
          { id: "all", label: "Vše" },
          { id: "active", label: "Aktivní" },
          { id: "idea", label: "Nápady" },
          { id: "done", label: "Hotové" },
          { id: "archived", label: "Archiv" },
        ].map((t) => (
          <span key={t.id} className={`chip ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="chip-count">{counts[t.id]}</span>
          </span>
        ))}
        <span className="chips-sep" />
        <span style={{ position: "relative" }} ref={pGroupRef}>
          <span className={`chip ${pGroupBy !== "none" ? "active" : ""}`} onClick={() => setPGroupByOpen(!pGroupOpen)}>
            Seskupit: {PROJ_GROUP_LABELS[pGroupBy]} ▾
          </span>
          {pGroupOpen && (
            <div className="pop" style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
              zIndex: 200,
              minWidth: 180,
              padding: "6px"
            }}>
              {Object.entries(PROJ_GROUP_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setPGroupBy(k); setPGroupByOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: pGroupBy === k ? "var(--accent-soft)" : "transparent",
                    color: pGroupBy === k ? "var(--accent)" : "var(--text-2)",
                    fontSize: 13,
                    fontWeight: pGroupBy === k ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => { if (pGroupBy !== k) e.currentTarget.style.background = "var(--card-h)"; }}
                  onMouseLeave={(e) => { if (pGroupBy !== k) e.currentTarget.style.background = "transparent"; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </span>

        <span style={{ position: "relative" }} ref={pSortRef}>
          <span className={`chip ${pSortBy !== "progress" ? "active" : ""}`} onClick={() => setPSortByOpen(!pSortOpen)}>
            Řadit podle: {PROJ_SORT_LABELS[pSortBy]} ▾
          </span>
          {pSortOpen && (
            <div className="pop" style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
              zIndex: 200,
              minWidth: 180,
              padding: "6px"
            }}>
              {Object.entries(PROJ_SORT_LABELS).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setPSortBy(k); setPSortByOpen(false); }}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: pSortBy === k ? "var(--accent-soft)" : "transparent",
                    color: pSortBy === k ? "var(--accent)" : "var(--text-2)",
                    fontSize: 13,
                    fontWeight: pSortBy === k ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                  onMouseEnter={(e) => { if (pSortBy !== k) e.currentTarget.style.background = "var(--card-h)"; }}
                  onMouseLeave={(e) => { if (pSortBy !== k) e.currentTarget.style.background = "transparent"; }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </span>
      </div>

      {showNew ? (
        <div className="quickadd" style={{ borderStyle: "solid" }}>
          <span className="quickadd-plus">+</span>
          <input ref={newInputRef} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Název projektu…" />
          <input value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Popis (volitelně)…" />
          <select value={nStatus} onChange={(e) => setNStatus(e.target.value)} style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 }}>
            {Object.entries(PROJ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn primary" onClick={create}>Vytvořit</button>
          <button className="btn" onClick={() => setShowNew(false)}>Zrušit</button>
        </div>
      ) : null}

      {pGroupBy === "status" ? (
        <div>
          {groupedProjects.map(([key, group]) => (
            <div key={key} style={{ marginBottom: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: PROJ_STATUS[key]?.color || "var(--text-3)" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--text)" }}>
                  {group.label} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-3)", marginLeft: 6 }}>({group.items.length})</span>
                </h2>
              </div>
              <div className="pgrid">
                {group.items.map((p) => renderProjectCard(p))}
              </div>
            </div>
          ))}
          {!showNew ? (
            <div className="pgrid" style={{ marginTop: 12 }}>
              <div
                className="pcard"
                style={{ borderStyle: "dashed", borderColor: "var(--border)", borderLeftColor: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "var(--text-3)", minHeight: 180, width: "100%" }}
                onClick={openNew}
              >
                <Icon name="plus" size={14} color="currentColor" strokeWidth={2} />
                <span style={{ marginTop: 8, fontFamily: "var(--serif)", fontSize: 17 }}>Nový projekt</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="pgrid">
          {sortedProjects.map((p) => renderProjectCard(p))}
          {!showNew ? (
            <div
              className="pcard"
              style={{ borderStyle: "dashed", borderColor: "var(--border)", borderLeftColor: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: "var(--text-3)", minHeight: 220 }}
              onClick={openNew}
            >
              <Icon name="plus" size={14} color="currentColor" strokeWidth={2} />
              <span style={{ marginTop: 8, fontFamily: "var(--serif)", fontSize: 19 }}>Nový projekt</span>
            </div>
          ) : null}
        </div>
      )}

      {!sortedProjects.length ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-3)" }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>◫</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Žádné projekty</div>
          <div style={{ fontSize: 13 }}>V této kategorii nejsou žádné projekty.</div>
        </div>
      ) : null}
    </div>
  );
}
