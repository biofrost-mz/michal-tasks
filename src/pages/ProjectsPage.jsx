import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useApp } from "../context/AppContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { useConfirm } from "../components/Confirm.jsx";
import Icon from "../components/Icon.jsx";
import NotesMiniList from "../components/NotesMiniList.jsx";
import ProjectChatPanel from "../components/ProjectChatPanel.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import { projectColor, parseYMD, startOfToday, PROJECT_COLORS, uuid4 } from "../utils.js";
import { supabase } from "../supabase.js";
import { PROJ_STATUS } from "../constants.js";
import EmptyState from "../components/EmptyState.jsx";
import { SkeletonCard, SkeletonLine } from "../components/Skeleton.jsx";
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
        {t.priority === "high" ? <span className="prio" style={{ "--prio-color": "var(--prio-high)" }}>↑ Vysoká</span> : null}
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
    loaded,
    selProject,
    setPage,
    addTask,
    updateTask,
    reorderTasks,
    updateProject,
    deleteProject,
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

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
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
                {activeTask.priority === "high" ? <span className="prio" style={{ "--prio-color": "var(--prio-high)" }}>↑ Vysoká</span> : null}
                {activeTask.dueDate ? <span className={`due ${taskOverdue(activeTask) ? "overdue" : ""}`}>{taskDue(activeTask)}</span> : null}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

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
  const { projects, tasks, addProject, openProject, updateProject, isMobile, loaded } = useApp();
  const toast = useToast();

  const [tab, setTab] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [showAIGen, setShowAIGen] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");
  const [nColor, setNColor] = useState(null);
  const newInputRef = useRef(null);

  const [pGroupBy, setPGroupBy] = useState("none"); // "none", "status"
  const [pSortBy] = useState("newest"); // "newest", "progress", "alphabetical", "tasksCount"
  const [pGroupOpen, setPGroupByOpen] = useState(false);

  const pGroupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pGroupRef.current && !pGroupRef.current.contains(e.target)) {
        setPGroupByOpen(false);
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

    return Object.entries(groups).filter(([, g]) => g.items.length > 0);
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

  const renderProjectCard = (p, idx = 0) => {
    const projectTasks = tasks.filter((t) => t.projectId === p.id);
    const done = projectTasks.filter((t) => t.status === "done").length;
    const doing = projectTasks.filter((t) => t.status === "doing").length;
    const wait = projectTasks.filter((t) => t.status === "waiting").length;
    const todo = projectTasks.filter((t) => t.status === "todo").length;
    const progress = projectTasks.length ? Math.round((done / projectTasks.length) * 100) : 0;
    const overdueCount = projectTasks.filter((t) => taskOverdue(t)).length;

    return (
      <div key={p.id} className="pcard list-item-enter" style={{ "--proj-color": projectColor(p.id), "--item-index": Math.min(idx, 7) }} onClick={() => openProject(p.id)}>
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
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn"
            style={{
              borderColor: "var(--accent)",
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(139, 92, 246, 0.06)"
            }}
            onClick={() => setShowAIGen(true)}
          >
            <Icon name="sparkles" size={13} color="currentColor" strokeWidth={2} />
            AI Generátor
          </button>
          <button className="btn primary" onClick={openNew}>
            <Icon name="plus" size={13} color="currentColor" strokeWidth={2} /> Nový projekt
          </button>
        </div>
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
        {!isMobile && (
          <>
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
          </>
        )}
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

      {!loaded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : pGroupBy === "status" ? (
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
                {group.items.map((p, idx) => renderProjectCard(p, idx))}
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
          {sortedProjects.map((p, idx) => renderProjectCard(p, idx))}
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

      {loaded && !sortedProjects.length && !showNew ? (
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

      {showAIGen && <AIProjectGeneratorModal onClose={() => setShowAIGen(false)} />}
    </div>
  );
}

function AIProjectGeneratorModal({ onClose }) {
  const { tags, addProject, addTask, addTag, openProject } = useApp();
  const toast = useToast();

  const [step, setStep] = useState("prompt"); // "prompt" | "loading" | "preview"
  const [promptText, setPromptText] = useState("");
  const [loadingText, setLoadingText] = useState("Analýza záměru a plánování...");

  // Preview States
  const [projectName, setProjectName] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectColor, setProjectColor] = useState("#3b82f6");
  const [tasksList, setTasksList] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [activeModel, setActiveModel] = useState("Gemini 1.5 Flash");

  // Loading text sequence
  useEffect(() => {
    if (step !== "loading") return;
    const texts = [
      "Analyzuji váš kreativní záměr...",
      "Sestavuji agilní fáze a milníky...",
      "Doplňuji detailní chronologické podúkoly...",
      "Přiřazuji optimální priority a štítky...",
      "Dokončuji finální úpravy vašeho plánu..."
    ];
    let idx = 0;
    setLoadingText(texts[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % texts.length;
      setLoadingText(texts[idx]);
    }, 2500);
    return () => clearInterval(timer);
  }, [step]);

  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setStep("loading");
    try {
      const { data, error } = await supabase.functions.invoke("ai-project-planner", {
        body: {
          userPrompt: promptText,
          availableTags: tags.map((t) => t.name),
        },
      });

      if (error || !data?.result) {
        throw new Error(error?.message || data?.error || "Generování selhalo");
      }

      const result = data.result;
      setProjectName(result.projectName || "");
      setProjectDesc(result.projectDescription || "");
      setProjectColor(result.projectColor || "#3b82f6");
      setTasksList(
        (result.tasks || []).map((t, idx) => ({
          ...t,
          id: `gen-task-${idx}`,
          selected: true, // defaults to checked
        }))
      );
      setActiveModel(data.meta?.model || "Gemini 1.5 Flash");
      setStep("preview");
    } catch (err) {
      console.error(err);
      toast(err.message || "Generování projektu selhalo", "error");
      setStep("prompt");
    }
  };

  const toggleTaskSelected = (id) => {
    setTasksList((prev) => prev.map((t) => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const toggleTaskExpanded = (id) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    try {
      const p = addProject({
        name: projectName.trim() || "Bez názvu",
        description: projectDesc.trim(),
        status: "active",
        color: projectColor,
      });

      for (const t of tasksList) {
        if (!t.selected) continue;

        // Map/Create Tags
        const tTagIds = [];
        if (Array.isArray(t.tags)) {
          for (const rawName of t.tags) {
            const cleanName = rawName.trim().toLowerCase();
            if (!cleanName) continue;
            const existing = tags.find((tg) => tg.name.toLowerCase() === cleanName);
            if (existing) {
              tTagIds.push(existing.id);
            } else {
              const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];
              const randomColor = colors[Math.floor(Math.random() * colors.length)];
              const newTg = addTag({ name: cleanName, color: randomColor });
              tTagIds.push(newTg.id);
            }
          }
        }

        // Map subtasks to checklists
        const formattedSubtasks = (t.subtasks || []).map((stText) => ({
          id: uuid4(),
          text: stText,
          done: false,
        }));

        addTask({
          title: t.title,
          description: t.description,
          status: "todo",
          priority: t.priority,
          projectId: p.id,
          tagIds: tTagIds,
          subtasks: formattedSubtasks,
        });
      }

      toast("Projekt a úkoly úspěšně vytvořeny s AI!", "success");
      openProject(p.id);
      onClose();
    } catch (err) {
      console.error(err);
      toast("Nepodařilo se uložit projekt", "error");
    }
  };

  const presets = [
    { label: "🚀 Spuštění e-shopu", prompt: "Spustit nový moderní e-shop s udržitelnou módou. Zahrnout přípravu marketingu, nastavení logistiky, testování webu a spuštění." },
    { label: "🤝 Onboarding zaměstnance", prompt: "Vytvořit hladký onboarding plán pro nového seniorního vývojáře. Od prvního dne (hardware, účty), přes seznámení s kódem, až po samostatný úkol." },
    { label: "🎪 Plánování eventu", prompt: "Naplánovat firemní letní teambuilding pro 50 lidí na téma sport a grilování. Zahrnout výběr lokace, rozpočet, catering, pozvánky a program." },
    { label: "🎯 Marketingová kampaň", prompt: "Marketingová kampaň na sociálních sítích pro uvedení nové výběrové kávy. Cílem je zvýšit povědomí o značce, vytvořit vizuály a spustit PPC reklamy." },
    { label: "📱 Vývoj mobilní aplikace", prompt: "Vytvořit MVP mobilní aplikace pro sledování osobních návyků. Od wireframů, přes vývoj v React Native, integraci databáze, až po testování." },
  ];

  return (
    <div className="ai-modal-overlay" onClick={onClose}>
      <style dangerouslySetInnerHTML={{ __html: `
        .ai-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 18, 25, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: fadeIn 0.3s ease-out;
        }

        .ai-modal-container {
          background: var(--bg-2);
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          border-radius: 20px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--text);
          animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(20px) scale(0.97); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-soft);
        }

        .ai-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          background: linear-gradient(135deg, #a78bfa, #f472b6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-modal-close {
          background: transparent;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .ai-modal-close:hover {
          background: var(--bg-3);
          color: var(--text);
        }

        .ai-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        /* Scrollbar styling */
        .ai-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .ai-modal-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-modal-body::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 3px;
        }

        /* Prompt View Styles */
        .ai-prompt-heading {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 8px;
          color: var(--text);
        }

        .ai-prompt-sub {
          color: var(--text-2);
          font-size: 0.925rem;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .ai-textarea {
          width: 100%;
          min-height: 120px;
          background: var(--bg-1);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 16px;
          color: var(--text);
          font-family: inherit;
          font-size: 0.95rem;
          line-height: 1.5;
          resize: vertical;
          transition: all 0.2s;
          outline: none;
          margin-bottom: 20px;
        }

        .ai-textarea:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-soft);
          background: var(--bg-1);
        }

        .ai-presets-title {
          font-size: 0.825rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-3);
          margin-bottom: 12px;
        }

        .ai-presets-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 32px;
        }

        .ai-preset-chip {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          border-radius: 20px;
          padding: 8px 14px;
          font-size: 0.85rem;
          color: var(--text-2);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ai-preset-chip:hover {
          background: var(--accent-soft);
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-1px);
        }

        .ai-btn-generate {
          background: linear-gradient(135deg, #7c3aed, #db2777);
          border: none;
          color: white;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.25);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ai-btn-generate:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(124, 58, 237, 0.4);
        }

        .ai-btn-generate:active {
          transform: translateY(0);
        }

        /* Loading View Styles */
        .ai-loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
        }

        .ai-loading-spinner {
          width: 64px;
          height: 64px;
          border: 4px solid var(--border-soft);
          border-left-color: var(--accent);
          border-top-color: #ec4899;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 32px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-loading-text {
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 12px;
          text-align: center;
          height: 24px;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        .ai-loading-hint {
          font-size: 0.85rem;
          color: var(--text-3);
          text-align: center;
        }

        /* Preview View Styles */
        .ai-preview-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 768px) {
          .ai-preview-grid {
            grid-template-columns: 280px 1fr;
          }
        }

        .ai-preview-sidebar {
          border-bottom: 1px solid var(--border-soft);
          padding-bottom: 20px;
        }

        @media (min-width: 768px) {
          .ai-preview-sidebar {
            border-bottom: none;
            border-right: 1px solid var(--border-soft);
            padding-bottom: 0;
            padding-right: 24px;
          }
        }

        .ai-preview-main {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ai-input-group {
          margin-bottom: 20px;
        }

        .ai-label {
          display: block;
          font-size: 0.825rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-2);
          margin-bottom: 8px;
        }

        .ai-input {
          width: 100%;
          background: var(--bg-1);
          border: 1px solid var(--border-soft);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text);
          font-size: 0.925rem;
          outline: none;
          transition: all 0.2s;
        }

        .ai-input:focus {
          border-color: var(--accent);
        }

        .ai-color-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
        }

        .ai-color-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.15s ease;
          border: 2px solid transparent;
        }

        .ai-color-dot:hover {
          transform: scale(1.15);
        }

        .ai-color-dot.active {
          border-color: var(--text);
          box-shadow: 0 0 0 2px var(--accent);
        }

        .ai-preview-card {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s;
        }

        .ai-preview-card:hover {
          background: var(--bg-1);
          border-color: var(--border);
        }

        .ai-preview-card-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .ai-preview-card-checkbox {
          margin-top: 4px;
          width: 16px;
          height: 16px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .ai-preview-card-info {
          flex: 1;
        }

        .ai-preview-card-title {
          font-size: 0.975rem;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }

        .ai-preview-card-desc {
          font-size: 0.85rem;
          color: var(--text-2);
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .ai-preview-card-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
        }

        .ai-badge {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 500;
        }

        .ai-badge.prio-high {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .ai-badge.prio-medium {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .ai-badge.prio-low {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .ai-badge.time {
          background: var(--bg-2);
          color: var(--text-2);
          border: 1px solid var(--border-soft);
        }

        .ai-badge.tag {
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid var(--accent);
        }

        .ai-subtasks-toggle {
          background: transparent;
          border: none;
          color: var(--text-2);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 12px;
        }

        .ai-subtasks-toggle:hover {
          color: var(--text);
        }

        .ai-preview-subtasks-list {
          margin-top: 8px;
          padding-left: 16px;
          border-left: 1px solid var(--border-soft);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .ai-preview-subtask-item {
          font-size: 0.825rem;
          color: var(--text-2);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-preview-subtask-bullet {
          width: 4px;
          height: 4px;
          background: var(--accent);
          border-radius: 50%;
        }

        .ai-modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid var(--border-soft);
        }

        .ai-btn-secondary {
          background: var(--bg-3);
          border: 1px solid var(--border-soft);
          color: var(--text-2);
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ai-btn-secondary:hover {
          background: var(--bg-1);
          color: var(--text);
        }

        .ai-btn-primary {
          background: linear-gradient(135deg, #8b5cf6, #ec4899);
          border: none;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(139, 92, 246, 0.3);
        }
      ` }} />

      <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="ai-modal-header">
          <div className="ai-modal-title">
            <Icon name="sparkles" size={18} color="currentColor" strokeWidth={2.5} />
            <span>AI Projektový Plánovač</span>
          </div>
          <button className="ai-modal-close" onClick={onClose}>
            <Icon name="x" size={16} color="currentColor" strokeWidth={2.5} />
          </button>
        </div>

        <div className="ai-modal-body">
          {step === "prompt" && (
            <div>
              <h2 className="ai-prompt-heading">Navrhněte nový projekt s AI</h2>
              <p className="ai-prompt-sub">
                Napište jakýkoliv záměr a umělá inteligence Zentero navrhne kompletní strukturovaný projekt,
                barvu, akční úkoly s prioritami, časovými odhady a chronologickými podúkoly.
              </p>

              <textarea
                className="ai-textarea"
                placeholder="Např.: Přestěhovat firmu do nových kanceláří do konce měsíce..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />

              <div className="ai-presets-title">Nebo začněte z rychlé šablony:</div>
              <div className="ai-presets-grid">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    className="ai-preset-chip"
                    onClick={() => setPromptText(p.prompt)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <button
                className="ai-btn-generate"
                onClick={handleGenerate}
                disabled={!promptText.trim()}
                style={{ opacity: promptText.trim() ? 1 : 0.6, cursor: promptText.trim() ? "pointer" : "not-allowed" }}
              >
                <Icon name="sparkles" size={16} color="currentColor" strokeWidth={2} />
                <span>Generovat projekt s AI</span>
              </button>
            </div>
          )}

          {step === "loading" && (
            <div className="ai-loading-container">
              <div className="ai-loading-spinner" />
              <div className="ai-loading-text">{loadingText}</div>
              <div className="ai-loading-hint">Tento proces obvykle trvá 5 až 10 sekund.</div>
            </div>
          )}

          {step === "preview" && (
            <div className="ai-preview-grid">
              <div className="ai-preview-sidebar">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "var(--text)" }}>Nastavení projektu</h3>

                <div className="ai-input-group">
                  <label className="ai-label">Název projektu</label>
                  <input
                    className="ai-input"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                  />
                </div>

                <div className="ai-input-group">
                  <label className="ai-label">Popis projektu</label>
                  <textarea
                    className="ai-input"
                    style={{ minHeight: 80, resize: "none" }}
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                  />
                </div>

                <div className="ai-input-group">
                  <label className="ai-label">Zvolit barvu</label>
                  <div className="ai-color-picker">
                    {PROJECT_COLORS.map((c) => (
                      <span
                        key={c}
                        className={`ai-color-dot ${projectColor === c ? "active" : ""}`}
                        style={{ background: c }}
                        onClick={() => setProjectColor(c)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="ai-preview-main">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>Navržený plán úkolů ({tasksList.filter((t) => t.selected).length})</h3>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>Generováno pomocí {activeModel}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "50vh", overflowY: "auto", paddingRight: "4px" }}>
                  {tasksList.map((t) => {
                    const isExpanded = !!expandedTasks[t.id];
                    return (
                      <div key={t.id} className="ai-preview-card" style={{ opacity: t.selected ? 1 : 0.5 }}>
                        <div className="ai-preview-card-header">
                          <input
                            type="checkbox"
                            className="ai-preview-card-checkbox"
                            checked={t.selected}
                            onChange={() => toggleTaskSelected(t.id)}
                          />
                          <div className="ai-preview-card-info" onClick={() => toggleTaskSelected(t.id)} style={{ cursor: "pointer" }}>
                            <div className="ai-preview-card-title">{t.title}</div>
                            <div className="ai-preview-card-desc">{t.description}</div>

                            <div className="ai-preview-card-meta">
                              <span className={`ai-badge prio-${t.priority}`}>
                                {t.priority === "high" ? "↑ Vysoká" : t.priority === "medium" ? "→ Střední" : "↓ Nízká"}
                              </span>
                              <span className="ai-badge time">
                                ⏱ {t.timeEstimate}
                              </span>
                              {(t.tags || []).map((tag, tIdx) => (
                                <span key={tIdx} className="ai-badge tag">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {t.subtasks && t.subtasks.length > 0 && (
                          <div>
                            <button
                              className="ai-subtasks-toggle"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTaskExpanded(t.id);
                              }}
                            >
                              <span>{isExpanded ? "Skrýt podúkoly" : `Zobrazit podúkoly (${t.subtasks.length})`}</span>
                              <span>{isExpanded ? "▴" : "▾"}</span>
                            </button>

                            {isExpanded && (
                              <div className="ai-preview-subtasks-list">
                                {t.subtasks.map((st, sIdx) => (
                                  <div key={sIdx} className="ai-preview-subtask-item">
                                    <div className="ai-preview-subtask-bullet" />
                                    <span>{st}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="ai-modal-footer">
          {step === "preview" ? (
            <>
              <button className="ai-btn-secondary" onClick={() => setStep("prompt")}>
                Zpět / Znovu
              </button>
              <button className="ai-btn-primary" onClick={handleSave}>
                <Icon name="check" size={15} color="currentColor" strokeWidth={2.5} />
                <span>Vytvořit projekt s AI</span>
              </button>
            </>
          ) : (
            <button className="ai-btn-secondary" onClick={onClose} disabled={step === "loading"}>
              Zavřít
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
