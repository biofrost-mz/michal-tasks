import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Icon from './Icon.jsx'
import AttachmentsMiniList from './AttachmentsMiniList.jsx'
import NotesMiniList from './NotesMiniList.jsx'
import AITaskAssist from './AITaskAssist.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'
import { formatDate, formatDateTime } from '../locale.js'
import { projectColor } from '../utils.js'
import { PrioChip } from './atlas/AtlasTaskCard.jsx'

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#94a3b8" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

/* ─────────────────────────────────────────────
   AssigneeSelector — unchanged production component
───────────────────────────────────────────── */
function AssigneeSelector({ currentAssigneeId, onChange }) {
  const { t, workspaceMembers } = useApp();
  const [open, setOpen] = useState(false);

  const currentMember = workspaceMembers.find((m) => m.userId === currentAssigneeId);
  const getLabel = (m) => m?.displayName || m?.email || `${m?.userId?.slice(0, 8)}…`;
  const getInitials = (m) => (m?.email || m?.userId || "?").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn"
        style={{ display: "flex", alignItems: "center", gap: 7, width: "100%" }}
      >
        {currentAssigneeId ? (
          <>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(currentMember)}
            </div>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(currentMember)}</span>
          </>
        ) : (
          <>
            <Icon name="plus" size={12} color="var(--text-3)" strokeWidth={2} />
            <span style={{ color: "var(--text-2)" }}>Nepřiřazeno</span>
          </>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200 }}>
            <button onClick={() => { onChange(null); setOpen(false); }} className="btn" style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", background: !currentAssigneeId ? "var(--accent-soft)" : undefined, color: !currentAssigneeId ? "var(--accent)" : undefined }}>
              <Icon name="x" size={12} color="var(--text-3)" strokeWidth={2} />
              Nepřiřazeno
            </button>
            {workspaceMembers.map((m) => (
              <button
                key={m.userId}
                onClick={() => { onChange(m.userId); setOpen(false); }}
                className="btn"
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", background: m.userId === currentAssigneeId ? "var(--accent-soft)" : undefined, color: m.userId === currentAssigneeId ? "var(--accent)" : undefined }}
              >
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.userId === currentAssigneeId ? "var(--accent)" : "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: m.userId === currentAssigneeId ? "var(--bg)" : "var(--text-2)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(m)}</div>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 0 }}>{m.role}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SubtasksSection — unchanged production logic
───────────────────────────────────────────── */
function SubtasksSection({ task, updateTask }) {
  const [input, setInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const inputRef = React.useRef(null);

  const subtasks = task.subtasks || [];
  const done = subtasks.filter((s) => s.done).length;

  const addSubtask = () => {
    const text = input.trim();
    if (!text) return;
    const next = [...subtasks, { id: crypto.randomUUID(), text, done: false }];
    updateTask(task.id, { subtasks: next });
    setInput("");
    inputRef.current?.focus();
  };

  const toggle = (id) => {
    const next = subtasks.map((s) => s.id === id ? { ...s, done: !s.done } : s);
    updateTask(task.id, { subtasks: next });
  };

  const remove = (id) => {
    const next = subtasks.filter((s) => s.id !== id);
    updateTask(task.id, { subtasks: next });
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditText(s.text);
  };

  const saveEdit = (id) => {
    const text = editText.trim();
    if (!text) { remove(id); setEditingId(null); return; }
    const next = subtasks.map((s) => s.id === id ? { ...s, text } : s);
    updateTask(task.id, { subtasks: next });
    setEditingId(null);
  };

  return (
    <>
      <div className="detail-h">
        <span>Podúkoly · {subtasks.length}</span>
        {subtasks.length > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-3)" }}>
            {done}/{subtasks.length}
            <span style={{ width: 60, height: 4, borderRadius: 2, background: "var(--border-soft)", overflow: "hidden", display: "inline-block" }}>
              <span style={{ display: "block", width: `${(done / subtasks.length) * 100}%`, height: "100%", background: "#22c55e", borderRadius: 2, transition: "width .2s" }} />
            </span>
          </span>
        )}
      </div>

      <div className="row" style={{ gap: 6 }}>
        <input
          ref={inputRef}
          className="detail-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
          placeholder="Přidat podúkol… (Enter)"
        />
        <button className="btn primary" onClick={addSubtask} style={{ flexShrink: 0 }}>
          <Icon name="plus" size={14} color="currentColor" strokeWidth={2.5} />
        </button>
      </div>

      {subtasks.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {subtasks.map((s) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              editingId={editingId}
              editText={editText}
              setEditText={setEditText}
              onToggle={toggle}
              onRemove={remove}
              onStartEdit={startEdit}
              onSaveEdit={saveEdit}
              onCancelEdit={() => setEditingId(null)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function SubtaskRow({ subtask, editingId, editText, setEditText, onToggle, onRemove, onStartEdit, onSaveEdit, onCancelEdit }) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingId === subtask.id;

  return (
    <label
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", gap: 10, padding: "10px 14px",
        background: "var(--bg-2)", borderRadius: "var(--r, 14px)",
        border: "1px solid var(--border-soft)", fontSize: 14,
        alignItems: "center", cursor: "default",
      }}
    >
      <input
        type="checkbox"
        checked={subtask.done}
        onChange={() => onToggle(subtask.id)}
        style={{ accentColor: "var(--accent)", cursor: "pointer" }}
      />

      {isEditing ? (
        <input
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSaveEdit(subtask.id);
            if (e.key === "Escape") onCancelEdit();
          }}
          onBlur={() => onSaveEdit(subtask.id)}
          style={{
            flex: 1, fontSize: 13, border: "none", background: "transparent",
            color: "var(--text)", outline: "none", padding: 0,
          }}
        />
      ) : (
        <span
          onDoubleClick={() => onStartEdit(subtask)}
          style={{
            flex: 1, fontSize: 13, color: subtask.done ? "var(--text-3)" : "var(--text)",
            textDecoration: subtask.done ? "line-through" : "none",
            cursor: "text", lineHeight: 1.4,
          }}
        >
          {subtask.text}
        </span>
      )}

      {!isEditing && (
        <button
          onClick={(e) => { e.preventDefault(); onRemove(subtask.id); }}
          className="icon-btn"
          style={{ opacity: hovered ? 0.6 : 0, transition: "opacity .1s" }}
        >
          <Icon name="x" size={12} color="var(--text-3)" strokeWidth={2} />
        </button>
      )}
    </label>
  );
}

/* ─────────────────────────────────────────────
   TaskDrawer — Atlas .overlay + .detail design
───────────────────────────────────────────── */
export default function TaskDrawer() {
  const { t, tasks, projects, tags, updateTask, deleteTask, addProject, taskDetail, setTaskDetail, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const task = tasks.find((x) => x.id === taskDetail) ?? null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.description ?? "");
  const [showNewProject, setShowNewProject] = useState(false);
  const [npName, setNpName] = useState("");
  const [newPhase, setNewPhase] = useState("");

  const toLocalDT = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [remindAtDraft, setRemindAtDraft] = useState(toLocalDT(task?.remindAt));

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDesc(task.description || "");
    setShowNewProject(false);
    setNpName("");
    setRemindAtDraft(toLocalDT(task?.remindAt));
  }, [task?.id, task?.title, task?.description, task?.remindAt]);

  if (!task) return null;

  const s = (u) => { updateTask(task.id, u); toast("Uloženo", "success"); };

  const createProjectInline = () => {
    if (!npName.trim()) return;
    const p = addProject({ name: npName.trim() });
    s({ projectId: p.id });
    setNpName("");
    setShowNewProject(false);
    toast("Projekt vytvořen a přiřazen", "success");
  };

  const taskNumber = String(task.id).padStart(4, "0");
  const projectObj = projects.find((p) => p.id === task.projectId);

  // Mobile swipe-to-dismiss
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef(null);
  const DISMISS_THRESHOLD = 150;

  const onDragStart = useCallback((e) => {
    if (!isMobile) return;
    dragStartRef.current = e.touches[0].clientY;
    setDragging(true);
  }, [isMobile]);

  const onDragMove = useCallback((e) => {
    if (dragStartRef.current === null) return;
    const dy = e.touches[0].clientY - dragStartRef.current;
    if (dy > 0) setDragY(dy); // only allow downward drag
  }, []);

  const onDragEnd = useCallback(() => {
    setDragging(false);
    if (dragY > DISMISS_THRESHOLD) {
      setTaskDetail(null);
    }
    setDragY(0);
    dragStartRef.current = null;
  }, [dragY, setTaskDetail]);

  return (
    <div className="overlay" onClick={() => setTaskDetail(null)}>
      <div
        className="detail"
        onClick={(e) => e.stopPropagation()}
        style={isMobile ? {
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform .3s cubic-bezier(.4,0,.2,1)",
          borderRadius: "16px 16px 0 0",
          top: "6vh",
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          width: "100%",
          maxWidth: "100%",
        } : undefined}
      >
        {/* Mobile drag handle */}
        {isMobile && (
          <div
            onTouchStart={onDragStart}
            onTouchMove={onDragMove}
            onTouchEnd={onDragEnd}
            style={{
              display: "flex", justifyContent: "center", padding: "10px 0 4px",
              cursor: "grab", touchAction: "none",
            }}
          >
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-soft)" }} />
          </div>
        )}

        {/* ── Header ── */}
        <div className="detail-top">
          <div className="detail-top-l">Detail úkolu · #{taskNumber}</div>
          <div className="row">
            <button
              className="btn danger"
              onClick={async () => {
                if (await confirm("Smazat úkol?")) {
                  setTaskDetail(null);
                  deleteTask(task.id);
                }
              }}
            >
              Smazat
            </button>
            <button className="icon-btn" onClick={() => setTaskDetail(null)}>
              <Icon name="x" size={14} color="var(--text-2)" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="detail-body">

          {/* Star + Project pill + Priority + Due (top row) */}
          <div className="row">
            <button
              className={`icon-btn star ${task.starred ? "on" : ""}`}
              onClick={() => s({ starred: !task.starred })}
              title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            >
              <Icon name="star" size={18} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
            </button>
            {projectObj && (
              <span className="proj-pill" style={{ "--proj-color": projectColor(projectObj.id) }}>
                <span className="pp-dot" />
                {projectObj.name}
              </span>
            )}
            <PrioChip priority={task.priority} />
            {task.dueDate && (
              <span className={`due ${task.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : ""}`}>
                {task.dueDate}
              </span>
            )}
          </div>

          {/* Title */}
          <input
            className="detail-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => s({ title })}
            placeholder="Název úkolu"
            style={{ border: "none", background: "transparent", outline: "none", width: "100%", cursor: "text", color: "var(--text)" }}
          />

          {/* ── Grid: Status, Priority, Due, Project, Tags, Assignee ── */}
          <div className="detail-grid">

            <div className="detail-k">Status</div>
            <div className="detail-v">
              {Object.entries(STATUSES).map(([k, v]) => (
                <span
                  key={k}
                  className={`chip ${task.status === k ? "active" : ""}`}
                  onClick={() => s({ status: k })}
                  style={task.status === k ? { borderColor: v.color, color: v.color, background: v.bg } : undefined}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2} />
                  {v.label}
                </span>
              ))}
            </div>

            <div className="detail-k">Priorita</div>
            <div className="detail-v">
              <span
                className={`chip ${!task.priority ? "active" : ""}`}
                onClick={() => s({ priority: null })}
              >
                — Žádná
              </span>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <span
                  key={k}
                  className={`chip ${task.priority === k ? "active" : ""}`}
                  onClick={() => s({ priority: k })}
                  style={task.priority === k ? { borderColor: v.color, color: v.color, background: v.bg } : undefined}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2.5} />
                  {v.label}
                </span>
              ))}
            </div>

            <div className="detail-k">Termín</div>
            <div className="detail-v">
              <input
                type="date"
                className="detail-input"
                value={task.dueDate || ""}
                onChange={(e) => s({ dueDate: e.target.value || null })}
                style={{ maxWidth: 180, width: "auto" }}
              />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>
                založeno {formatDate(task.createdAt, { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>

            <div className="detail-k">Projekt</div>
            <div className="detail-v" style={{ flexDirection: "column", alignItems: "stretch" }}>
              <select
                className="detail-input"
                value={task.projectId || ""}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setShowNewProject(true);
                    return;
                  }
                  s({ projectId: e.target.value || null });
                }}
                style={{ width: "100%" }}
              >
                <option value="">Inbox (bez projektu)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({PROJ_STATUS[p.status]?.label || p.status})
                  </option>
                ))}
                <option value="__new__">+ Vytvořit nový projekt…</option>
              </select>

              {showNewProject && (
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <input
                    className="detail-input"
                    value={npName}
                    onChange={(e) => setNpName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createProjectInline()}
                    placeholder="Název nového projektu"
                    autoFocus
                  />
                  <button className="btn primary" onClick={createProjectInline}>Vytvořit</button>
                  <button className="icon-btn" onClick={() => setShowNewProject(false)}>
                    <Icon name="x" size={13} color="var(--text-2)" strokeWidth={2} />
                  </button>
                </div>
              )}
            </div>

            <div className="detail-k">Tagy</div>
            <div className="detail-v">
              {tags.map((tg) => {
                const active = (task.tagIds || []).includes(tg.id);
                return (
                  <span
                    key={tg.id}
                    className="tag"
                    onClick={() =>
                      s({
                        tagIds: active ? task.tagIds.filter((id) => id !== tg.id) : [...(task.tagIds || []), tg.id],
                      })
                    }
                    style={{
                      cursor: "pointer",
                      background: active ? "var(--accent-soft)" : undefined,
                      color: active ? "var(--accent)" : undefined,
                      borderColor: active ? "color-mix(in srgb, var(--accent) 30%, transparent)" : undefined,
                    }}
                  >
                    {tg.name}
                  </span>
                );
              })}
            </div>

            <div className="detail-k">Přiřazeno</div>
            <div className="detail-v" style={{ flex: 1 }}>
              <AssigneeSelector currentAssigneeId={task.assigneeUserId} onChange={(uid) => s({ assigneeUserId: uid })} />
            </div>
          </div>

          {/* ── Description ── */}
          <div className="detail-sect">
            <div className="detail-h">Popis</div>
            <textarea
              className="detail-input"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => s({ description: desc })}
              rows={4}
              placeholder="Poznámky, kontext, odkazy…"
            />
          </div>

          {/* ── AI Assistant ── */}
          <div className="detail-sect">
            <AITaskAssist task={task} onTitleChange={setTitle} />
          </div>

          {/* ── Subtasks ── */}
          <div className="detail-sect">
            <SubtasksSection task={task} updateTask={updateTask} />
          </div>

          {/* ── Phases ── */}
          <div className="detail-sect">
            <div className="detail-h">Průběh a fáze</div>

            {(task.phases || []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {(task.phases || []).slice().reverse().map((ph) => (
                  <div
                    key={ph.id}
                    style={{
                      padding: "10px 14px",
                      background: "var(--bg-2)",
                      borderRadius: "var(--r, 14px)",
                      border: "1px solid var(--border-soft)",
                      display: "flex", gap: 10, alignItems: "flex-start",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, lineHeight: 1.4 }}>{ph.text}</div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-3)", marginTop: 4 }}>
                        {formatDateTime(ph.date)}
                      </div>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        const next = (task.phases || []).filter((x) => x.id !== ph.id);
                        s({ phases: next });
                      }}
                      title="Smazat"
                    >
                      <Icon name="x" size={14} color="var(--text-3)" strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="row" style={{ gap: 8 }}>
              <input
                className="detail-input"
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const text = newPhase.trim();
                    if (!text) return;
                    const next = [
                      ...(task.phases || []),
                      { id: crypto.randomUUID?.() || String(Date.now()), text, date: Date.now() },
                    ];
                    s({ phases: next });
                    setNewPhase("");
                  }
                }}
                placeholder="Nová fáze / záznam průběhu…"
              />
              <button
                className="btn primary"
                onClick={() => {
                  const text = newPhase.trim();
                  if (!text) return;
                  const next = [
                    ...(task.phases || []),
                    { id: crypto.randomUUID?.() || String(Date.now()), text, date: Date.now() },
                  ];
                  s({ phases: next });
                  setNewPhase("");
                }}
                style={{ flexShrink: 0 }}
              >
                +
              </button>
            </div>
          </div>

          {/* ── Reminder ── */}
          <div className="detail-sect">
            <div className="detail-h">Připomínka e-mailem</div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <input
                type="datetime-local"
                className="detail-input"
                value={remindAtDraft}
                onChange={(e) => setRemindAtDraft(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  if (val !== (task.remindAt ?? null)) s({ remindAt: val });
                }}
                style={{ width: "auto" }}
              />
              {task.remindAt && (
                <button
                  className="btn danger"
                  onClick={() => { setRemindAtDraft(""); s({ remindAt: null }); }}
                  style={{ fontSize: 12 }}
                >
                  <Icon name="x" size={12} color="currentColor" strokeWidth={2} /> Zrušit
                </button>
              )}
            </div>
            {task.remindAt && (
              <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 5 }}>
                Nastaveno: {formatDate(task.remindAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>

          {/* ── Recurrence ── */}
          <div className="detail-sect">
            <div className="detail-h">Opakování</div>
            <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
              {[
                { value: null, label: "Žádné" },
                { value: "daily", label: "Každý den" },
                { value: "weekly", label: "Každý týden" },
                { value: "monthly", label: "Každý měsíc" },
              ].map(({ value, label }) => {
                const active = (task.recurrence ?? null) === value;
                return (
                  <span
                    key={String(value)}
                    className={`chip ${active ? "active" : ""}`}
                    onClick={() => updateTask(task.id, { recurrence: value })}
                    style={{ cursor: "pointer" }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
            {task.recurrence && (
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-3)" }}>
                Po dokončení se automaticky vytvoří nový úkol.
              </div>
            )}
          </div>

          {/* ── Attachments ── */}
          <div className="detail-sect">
            <div className="detail-h">Přílohy</div>
            <AttachmentsMiniList taskId={task.id} />
          </div>

          {/* ── Notes ── */}
          <div className="detail-sect">
            <div className="detail-h">Poznámky</div>
            <NotesMiniList taskId={task.id} />
          </div>

          {/* ── Footer metadata ── */}
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12, marginTop: 28, fontSize: 12, color: "var(--text-3)", fontFamily: "var(--mono)" }}>
            <div>Vytvořeno: {formatDateTime(task.createdAt)}</div>
            <div>Upraveno: {formatDateTime(task.updatedAt)}</div>
            {task.completedAt && <div style={{ color: "#22c55e" }}>Dokončeno: {formatDateTime(task.completedAt)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
