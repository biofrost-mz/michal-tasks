import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Icon from "../components/Icon.jsx";
import NotesMiniList from "../components/NotesMiniList.jsx";
import ProjectChatPanel from "../components/ProjectChatPanel.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import { projectColor, parseYMD, startOfToday, PROJECT_COLORS } from "../utils.js";
import { PROJ_STATUS } from "../constants.js";
import EmptyState from "../components/EmptyState.jsx";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


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

function DroppableCol({ colId, color, isOver, children }) {
  const { setNodeRef } = useDroppable({ id: colId });
  return (
    <div
      ref={setNodeRef}
      className={`kcol${isOver ? " drag-over" : ""}`}
      style={{ "--col-color": color }}
    >
      {children}
    </div>
  );
}

function SortableKCard({ t }) {
  const { setTaskDetail, updateTask } = useApp();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: t.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kcard"
      onClick={() => setTaskDetail(t.id)}
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
    reorderTasks,
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
  const [eColor, setEColor] = useState(null);
  const [quickTask, setQuickTask] = useState("");
  const [quickNote, setQuickNote] = useState("");
  const [inlineAdd, setInlineAdd] = useState(null);
  const [inlineVal, setInlineVal] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [overId, setOverId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const project = projects.find((p) => p.id === selProject);

  const projectTasks = useMemo(
    () => project ? tasks.filter((t) => t.projectId === project.id) : [],
    [tasks, project]
  );

  const columnTasksMap = useMemo(() => {
    const map = {};
    TASK_COLS.forEach((col) => {
      map[col.id] = projectTasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => (a.position || 0) - (b.position || 0));
    });
    return map;
  }, [projectTasks]);

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id);
  }, []);

  const handleDragOver = useCallback(({ over }) => {
    setOverId((prev) => {
      const next = over?.id ?? null;
      return prev === next ? prev : next;
    });
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;

    const activeTask = projectTasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const targetCol = TASK_COLS.find((c) => c.id === over.id);
    if (targetCol) {
      if (activeTask.status !== targetCol.id) updateTask(activeTask.id, { status: targetCol.id });
      return;
    }

    const overTask = projectTasks.find((t) => t.id === over.id);
    if (!overTask) return;

    if (activeTask.status === overTask.status) {
      const colTasks = columnTasksMap[activeTask.status] ?? [];
      const oldIdx = colTasks.findIndex((t) => t.id === active.id);
      const newIdx = colTasks.findIndex((t) => t.id === over.id);
      if (oldIdx !== newIdx) reorderTasks(arrayMove(colTasks, oldIdx, newIdx));
    } else {
      updateTask(activeTask.id, { status: overTask.status });
    }
  }, [projectTasks, columnTasksMap, updateTask, reorderTasks]);

  const activeTask = activeId ? projectTasks.find((t) => t.id === activeId) ?? null : null;

  if (!project) return <div className="content"><div className="ph-title">Projekt nenalezen</div></div>;

  const projectNotes = notes.filter((n) => n.primaryProjectId === project.id);

  const doneCount = projectTasks.filter((t) => t.status === "done").length;
  const progress = projectTasks.length ? Math.round((doneCount / projectTasks.length) * 100) : 0;

  const saveEdit = () => {
    updateProject(project.id, { name: eName.trim() || project.name, description: eDesc.trim(), color: eColor });
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
              setEColor(project.color || null);
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
            className="btn"
            onClick={() => {
              const isArchived = project.status === "archived";
              const nextStatus = isArchived ? "active" : "archived";
              updateProject(project.id, { status: nextStatus });
              toast(isArchived ? "Projekt byl obnoven" : "Projekt byl archivován", "success");
              setPage("projects");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name={project.status === "archived" ? "refresh-cw" : "archive"} size={13} color="currentColor" strokeWidth={1.8} />
            {project.status === "archived" ? "Obnovit" : "Archivovat"}
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
        <div className="quickadd" style={{ borderStyle: "solid", marginBottom: 12, flexDirection: "column", alignItems: "stretch", gap: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 10, width: "100%", alignItems: "center" }}>
            <span className="quickadd-plus">✎</span>
            <input value={eName} onChange={(e) => setEName(e.target.value)} placeholder="Název projektu" style={{ flex: 1 }} />
            <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} placeholder="Popis projektu" style={{ flex: 2 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>Barva projektu:</span>
              <div style={{ display: "flex", gap: 6 }}>
                {PROJECT_COLORS.map((c) => (
                  <span
                    key={c}
                    onClick={() => setEColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      display: "inline-block",
                      border: eColor === c ? "2px solid #ffffff" : "2px solid transparent",
                      boxShadow: eColor === c ? "0 0 0 2px var(--accent)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={saveEdit}>Uložit</button>
              <button className="btn" onClick={() => setEditing(false)}>Zrušit</button>
            </div>
          </div>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban">
          {TASK_COLS.map((col) => {
            const listAll = columnTasksMap[col.id] ?? [];
            const list = col.id === "done" && !showAllDone ? listAll.slice(0, 5) : listAll;
            const colIsOver = overId === col.id;

            return (
              <DroppableCol key={col.id} colId={col.id} color={col.color} isOver={colIsOver}>
                <div className="kcol-head">
                  <span className="kcol-name">{col.label}</span>
                  <span className="kcol-count">{listAll.length}</span>
                  <span className="kcol-add" onClick={() => { setInlineAdd(col.id); setInlineVal(""); }}>
                    <Icon name="plus" size={12} color="currentColor" strokeWidth={2} />
                  </span>
                </div>

                <SortableContext items={list.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {list.map((t) => <SortableKCard key={t.id} t={t} />)}
                </SortableContext>

                {col.id === "done" && listAll.length > 5 ? (
                  <button className="btn" style={{ width: "100%", marginTop: 6 }} onClick={() => setShowAllDone((v) => !v)}>
                    {showAllDone ? "Skrýt dokončené" : `+ ${listAll.length - 5} dalších`}
                  </button>
                ) : null}

                {listAll.length > 0 && inlineAdd !== col.id ? (
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      marginTop: 8,
                      borderStyle: "dashed",
                      borderColor: "var(--border-soft)",
                      background: "transparent",
                      color: "var(--text-3)",
                      fontSize: 12.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                    onClick={() => { setInlineAdd(col.id); setInlineVal(""); }}
                  >
                    <Icon name="plus" size={12} color="currentColor" strokeWidth={2} />
                    Přidat úkol
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
                  <div
                    className="kcard"
                    style={{ borderStyle: "dashed", textAlign: "center", color: "var(--text-3)", padding: "18px" }}
                    onClick={() => { setInlineAdd(col.id); setInlineVal(""); }}
                  >
                    + Přidat úkol
                  </div>
                ) : null}
              </DroppableCol>
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div
              className="kcard"
              style={{
                opacity: 0.92,
                cursor: "grabbing",
                boxShadow: "0 20px 48px rgba(0, 0, 0, 0.45)",
                pointerEvents: "none",
                transform: "rotate(3deg) scale(1.05)",
                transformOrigin: "center center",
                transition: "transform 0.15s ease",
              }}
            >
              <div className="kcard-t">{activeTask.title || "Bez názvu"}</div>
              <div className="kcard-m">
                {activeTask.priority === "high" ? <span className="prio" style={{ "--prio-color": "#f87171" }}>↑ Vysoká</span> : null}
                {activeTask.dueDate ? <span className={`due ${taskOverdue(activeTask) ? "overdue" : ""}`}>{taskDue(activeTask)}</span> : null}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
  const { projects, tasks, addProject, openProject, updateProject } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");
  const [nColor, setNColor] = useState(null);
  const newInputRef = useRef(null);

  const [pGroupBy, setPGroupBy] = useState("none"); // "none", "status"
  const [pSortBy, setPSortBy] = useState("newest"); // "newest", "progress", "alphabetical", "tasksCount"
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
    newest: "Nejnovější",
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
    } else if (pSortBy === "progress") {
      list.sort((a, b) => {
        const tasksA = tasks.filter((t) => t.projectId === a.id);
        const doneA = tasksA.filter((t) => t.status === "done").length;
        const progressA = tasksA.length ? (doneA / tasksA.length) : 0;

        const tasksB = tasks.filter((t) => t.projectId === b.id);
        const doneB = tasksB.filter((t) => t.status === "done").length;
        const progressB = tasksB.length ? (doneB / tasksB.length) : 0;

        return progressB - progressA;
      });
    } else {
      // newest
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
    addProject({ name: nName.trim(), description: nDesc.trim(), status: nStatus, color: nColor });
    setNName("");
    setNDesc("");
    setNStatus("active");
    setNColor(null);
    setShowNew(false);
    toast("Projekt vytvořen", "success");
  };

  const openNew = () => {
    setShowNew(true);
    const randColor = PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    setNColor(randColor);
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextStatus = p.status === "archived" ? "active" : "archived";
                updateProject(p.id, { status: nextStatus });
                toast(p.status === "archived" ? "Projekt byl obnoven" : "Projekt byl archivován", "success");
              }}
              title={p.status === "archived" ? "Obnovit z archivu" : "Archivovat projekt"}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "50%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-3)",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseEnter={(el) => {
                el.currentTarget.style.color = "var(--accent)";
                el.currentTarget.style.background = "var(--bg-3)";
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.color = "var(--text-3)";
                el.currentTarget.style.background = "transparent";
              }}
            >
              <Icon name={p.status === "archived" ? "refresh-cw" : "archive"} size={13} color="currentColor" strokeWidth={1.8} />
            </button>
            <span style={{ color: "var(--text-3)" }}>›</span>
          </div>
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
          <span className={`chip ${pSortBy !== "newest" ? "active" : ""}`} onClick={() => setPSortByOpen(!pSortOpen)}>
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
        <div className="quickadd" style={{ borderStyle: "solid", marginBottom: 16, flexDirection: "column", alignItems: "stretch", gap: 12, padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 10, width: "100%", alignItems: "center" }}>
            <span className="quickadd-plus">+</span>
            <input ref={newInputRef} value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Název projektu…" style={{ flex: 1 }} />
            <input value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Popis (volitelně)…" style={{ flex: 2 }} />
            <select value={nStatus} onChange={(e) => setNStatus(e.target.value)} style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border-soft)", borderRadius: 8, padding: "8px 10px", fontSize: 12.5 }}>
              {Object.entries(PROJ_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>Barva projektu:</span>
              <div style={{ display: "flex", gap: 6 }}>
                {PROJECT_COLORS.map((c) => (
                  <span
                    key={c}
                    onClick={() => setNColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: c,
                      cursor: "pointer",
                      display: "inline-block",
                      border: nColor === c ? "2px solid #ffffff" : "2px solid transparent",
                      boxShadow: nColor === c ? "0 0 0 2px var(--accent)" : "none",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={create}>Vytvořit</button>
              <button className="btn" onClick={() => { setShowNew(false); setNColor(null); }}>Zrušit</button>
            </div>
          </div>
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
                <span style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 17, fontWeight: 600 }}>Nový projekt</span>
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
              <span style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 19, fontWeight: 600 }}>Nový projekt</span>
            </div>
          ) : null}
        </div>
      )}

      {!sortedProjects.length && !showNew ? (
        <EmptyState
          type="projects"
          title={tab === "all" ? "Zatím žádné projekty" : `Žádné projekty ve stavu „${PROJ_STATUS[tab]?.label ?? tab}"`}
          description={tab === "all"
            ? "Vytvoř svůj první projekt a začni organizovat úkoly."
            : "V této kategorii nejsou žádné projekty."}
          action={tab === "all" ? openNew : undefined}
          actionLabel="Nový projekt"
        />
      ) : null}
    </div>
  );
}
