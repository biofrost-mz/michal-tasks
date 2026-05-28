import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Icon from './Icon.jsx'
import AttachmentsMiniList from './AttachmentsMiniList.jsx'
import NotesMiniList from './NotesMiniList.jsx'
import AITaskAssist from './AITaskAssist.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'
import { formatDate, formatDateTime } from '../locale.js'

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#94a3b8" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

function Sec({ label, children }) {
  const { t } = useApp();
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 3, height: 14, borderRadius: 3, background: t.accent, boxShadow: `0 0 10px ${t.accent}55` }} />
        <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".11em", color: t.text3, fontFamily: "'Geist Mono', ui-monospace, monospace" }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

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
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 7, border: "1px solid var(--border-soft)", background: "var(--bg-2)", color: t.text, cursor: "pointer", fontSize: 12, width: "100%" }}
      >
        {currentAssigneeId ? (
          <>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--bg)", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(currentMember)}
            </div>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(currentMember)}</span>
          </>
        ) : (
          <>
            <Icon name="plus" size={12} color={t.text3} strokeWidth={2} />
            <span style={{ color: t.text2 }}>Nepřiřazeno</span>
          </>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.bg2, border: "1px solid var(--border-soft)", borderRadius: 9, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <button onClick={() => { onChange(null); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", border: "none", background: !currentAssigneeId ? t.accentBg : "transparent", color: !currentAssigneeId ? t.accent : t.text2, cursor: "pointer", fontSize: 12 }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
              Nepřiřazeno
            </button>
            {workspaceMembers.map((m) => (
              <button
                key={m.userId}
                onClick={() => { onChange(m.userId); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", border: "none", background: m.userId === currentAssigneeId ? t.accentBg : "transparent", color: m.userId === currentAssigneeId ? t.accent : t.text, cursor: "pointer", fontSize: 12 }}
              >
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.userId === currentAssigneeId ? t.accent : "var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: m.userId === currentAssigneeId ? "var(--bg)" : t.text2, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(m)}</div>
                </div>
                <span style={{ fontSize: 12, color: t.text3, flexShrink: 0 }}>{m.role}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SubtasksSection({ task, updateTask, t }) {
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
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3 }}>
          Podúkoly
        </div>
        {subtasks.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, color: t.text3 }}>{done}/{subtasks.length}</div>
            <div style={{ width: 60, height: 4, borderRadius: 2, background: "var(--border-soft)", overflow: "hidden" }}>
              <div style={{ width: `${(done / subtasks.length) * 100}%`, height: "100%", background: "#22c55e", borderRadius: 2, transition: "width .2s" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: subtasks.length ? 8 : 0 }}>
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
            t={t}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
          placeholder="Přidat podúkol…"
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8,
            border: "1px solid var(--border-soft)", background: "var(--bg-2)",
            color: t.text, fontSize: 12.5, outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = t.accent; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-soft)"; }}
        />
        <button
          onClick={addSubtask}
          disabled={!input.trim()}
          style={{
            width: 36, borderRadius: 8, border: "none", flexShrink: 0,
            background: input.trim() ? t.accent : "var(--bg-2)",
            color: input.trim() ? "var(--bg)" : t.text3,
            cursor: input.trim() ? "pointer" : "default",
            transition: "background .15s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Icon name="plus" size={16} color={input.trim() ? "var(--bg)" : t.text3} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function SubtaskRow({ subtask, editingId, editText, setEditText, onToggle, onRemove, onStartEdit, onSaveEdit, onCancelEdit, t }) {
  const [hovered, setHovered] = useState(false);
  const isEditing = editingId === subtask.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 4px", borderRadius: 7, background: hovered ? "var(--bg-2)" : "transparent", transition: "background .1s" }}
    >
      <button
        onClick={() => onToggle(subtask.id)}
        style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, border: `2px solid ${subtask.done ? "#22c55e" : "var(--border-soft)"}`,
          background: subtask.done ? "#22c55e" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all .15s",
        }}
      >
        {subtask.done && <Icon name="check" size={10} color="var(--bg)" strokeWidth={3} />}
      </button>

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
            color: t.text, outline: "none", padding: 0,
          }}
        />
      ) : (
        <span
          onDoubleClick={() => onStartEdit(subtask)}
          style={{
            flex: 1, fontSize: 13, color: subtask.done ? t.text3 : t.text,
            textDecoration: subtask.done ? "line-through" : "none",
            cursor: "text", lineHeight: 1.4,
          }}
        >
          {subtask.text}
        </span>
      )}

      {!isEditing && (
        <button
          onClick={() => onRemove(subtask.id)}
          style={{
            opacity: hovered ? 0.6 : 0, transition: "opacity .1s",
            background: "none", border: "none", color: t.text3,
            cursor: "pointer", padding: "2px 3px", display: "flex", alignItems: "center", flexShrink: 0,
          }}
        >
          <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

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
  const inputBg = "var(--bg-2)";
  const panelBorder = "var(--border-soft)";
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

  return (
    <>
      <div onClick={() => setTaskDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", backdropFilter: "blur(5px)", zIndex: 90 }} />
      <div
        className={isMobile ? "su" : "sr"}
        style={{
          position: "fixed",
          ...(isMobile
            ? { bottom: 0, left: 0, right: 0, top: "8vh", borderRadius: "16px 16px 0 0", borderTop: `1px solid ${panelBorder}` }
            : { top: 0, right: 0, bottom: 0, width: 540, maxWidth: "95vw", borderLeft: `1px solid ${panelBorder}` }
          ),
          background: isMobile ? t.bg2 : "var(--surface)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: isMobile ? "0 -8px 40px #0004" : "-16px 0 52px rgba(0,0,0,0.42)",
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: panelBorder }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "10px 16px 12px" : "16px 24px", borderBottom: `1px solid ${panelBorder}` }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: t.text3, fontFamily: "'Geist Mono', ui-monospace, monospace", letterSpacing: ".11em", textTransform: "uppercase" }}>Detail úkolu</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={async () => { if (await confirm("Smazat úkol?")) { setTaskDetail(null); deleteTask(task.id); } }} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 12, padding: "4px 8px", borderRadius: 5 }}>
              Smazat
            </button>
            <button onClick={() => setTaskDetail(null)} style={{ background: inputBg, border: `1px solid ${panelBorder}`, color: t.text2, padding: "5px 8px", borderRadius: 6, display: "flex", alignItems: "center" }}>
              <Icon name="x" size={14} color={t.text2} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "18px 18px 30px" : "22px 24px 48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => s({ starred: !task.starred })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                opacity: task.starred ? 1 : 0.35,
                transition: "all .15s",
                padding: 0,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
              title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            >
              <Icon name="star" size={20} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
            </button>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => s({ title })}
              placeholder="Název úkolu"
              style={{
                fontSize: isMobile ? 22 : 34,
                fontWeight: 400,
                border: "none",
                background: "transparent",
                color: t.text,
                outline: "none",
                width: "100%",
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontStyle: "italic",
                letterSpacing: "-0.015em",
                lineHeight: 1.08,
              }}
            />
          </div>

          <Sec label="Status">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => s({ status: k })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1.5px solid ${task.status === k ? v.color : "var(--border-soft)"}`,
                    background: task.status === k ? v.bg : "transparent",
                    color: task.status === k ? v.color : t.text2,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2} />
                  {v.label}
                </button>
              ))}
            </div>
          </Sec>

          <Sec label="Priorita">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                onClick={() => s({ priority: null })}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 500,
                  border: `1.5px solid ${!task.priority ? t.accent : "var(--border-soft)"}`,
                  background: !task.priority ? t.accentBg : "transparent",
                  color: !task.priority ? t.accent : t.text3,
                }}
              >
                — Žádná
              </button>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => s({ priority: k })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 7,
                    fontSize: 12,
                    fontWeight: 700,
                    border: `1.5px solid ${task.priority === k ? v.color : "var(--border-soft)"}`,
                    background: task.priority === k ? v.bg : "transparent",
                    color: task.priority === k ? v.color : t.text2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2.5} />
                  {v.label}
                </button>
              ))}
            </div>
          </Sec>

          <Sec label="Projekt">
            <select
              value={task.projectId || ""}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewProject(true);
                  return;
                }
                s({ projectId: e.target.value || null });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: inputBg, color: t.text, fontSize: 13, outline: "none" }}
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
              <div style={{ display: "flex", gap: 6, marginTop: 8 }} className="pop">
                <input
                  value={npName}
                  onChange={(e) => setNpName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createProjectInline()}
                  placeholder="Název nového projektu"
                  autoFocus
                  style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: `1px solid ${panelBorder}`, background: inputBg, color: t.text, fontSize: 12.5, outline: "none" }}
                />
                <button onClick={createProjectInline} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: "var(--accent)", color: "var(--bg)", fontSize: 12, fontWeight: 600 }}>
                  Vytvořit
                </button>
                <button onClick={() => setShowNewProject(false)} style={{ padding: "7px 8px", borderRadius: 7, border: `1px solid ${panelBorder}`, background: "transparent", color: t.text2, display: "flex", alignItems: "center" }}>
                  <Icon name="x" size={13} color={t.text2} strokeWidth={2} />
                </button>
              </div>
            )}
          </Sec>

          <Sec label="Termín">
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => s({ dueDate: e.target.value || null })}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: inputBg, color: t.text, fontSize: 12.5, outline: "none", colorScheme: t.bg === "#0c0e14" ? "dark" : "light" }}
              />
              <span style={{ fontSize: 12, color: t.text3 }}>
                Založeno:{" "}
                {formatDate(task.createdAt, { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </Sec>

          <Sec label="Tagy">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.map((tg) => {
                const active = (task.tagIds || []).includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    onClick={() =>
                      s({
                        tagIds: active ? task.tagIds.filter((id) => id !== tg.id) : [...(task.tagIds || []), tg.id],
                      })
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1.5px solid ${active ? tg.color : "var(--border-soft)"}`,
                      background: active ? tg.color + "18" : "transparent",
                      color: active ? tg.color : t.text2,
                    }}
                  >
                    {tg.name}
                  </button>
                );
              })}
            </div>
          </Sec>

          <Sec label="Popis">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => s({ description: desc })}
              rows={4}
              placeholder="Poznámky, kontext, odkazy…"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: inputBg, color: t.text, outline: "none", fontSize: 13, resize: "vertical", lineHeight: 1.5 }}
            />
          </Sec>

          <AITaskAssist task={task} onTitleChange={setTitle} />

          <SubtasksSection task={task} updateTask={updateTask} t={t} />

          <Sec label="Průběh a fáze">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {(task.phases || []).slice().reverse().map((ph) => (
                <div
                  key={ph.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: inputBg,
                    border: `1px solid ${panelBorder}`,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{ph.text}</div>
                    <div className="mono" style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>
                      {formatDateTime(ph.date)}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = (task.phases || []).filter((x) => x.id !== ph.id);
                      s({ phases: next });
                    }}
                    style={{ border: "none", background: "transparent", color: t.text3, cursor: "pointer", display: "flex", alignItems: "center", padding: "2px 4px" }}
                    title="Smazat"
                  >
                    <Icon name="x" size={14} color={t.text3} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
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
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${panelBorder}`,
                  background: inputBg,
                  color: t.text,
                  outline: "none",
                  fontSize: 13,
                }}
              />
              <button
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
                style={{
                  width: 44,
                  borderRadius: 10,
                  border: "none",
                  background: "var(--accent)",
                  color: "var(--bg)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                title="Přidat"
              >
                +
              </button>
            </div>
          </Sec>

          <Sec label="Připomínka e-mailem">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="datetime-local"
                value={remindAtDraft}
                onChange={(e) => setRemindAtDraft(e.target.value)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  if (val !== (task.remindAt ?? null)) s({ remindAt: val });
                }}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${panelBorder}`, background: inputBg, color: t.text, fontSize: 12.5, outline: "none", colorScheme: t.bg === "#0c0e14" ? "dark" : "light" }}
              />
              {task.remindAt && (
                <button
                  onClick={() => { setRemindAtDraft(""); s({ remindAt: null }); }}
                  style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${panelBorder}`, background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <Icon name="x" size={12} color="#ef4444" strokeWidth={2} /> Zrušit
                </button>
              )}
            </div>
            {task.remindAt && (
              <div style={{ fontSize: 12, color: t.text3, marginTop: 5 }}>
                Nastaveno: {formatDate(task.remindAt, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </Sec>

          <Sec label="Opakování">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { value: null, label: "Žádné" },
                { value: "daily", label: "Každý den" },
                { value: "weekly", label: "Každý týden" },
                { value: "monthly", label: "Každý měsíc" },
              ].map(({ value, label }) => {
                const active = (task.recurrence ?? null) === value;
                return (
                  <button
                    key={String(value)}
                    onClick={() => updateTask(task.id, { recurrence: value })}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      border: `1px solid ${active ? t.accent : "var(--border-soft)"}`,
                      background: active ? t.accentBg : "transparent",
                      color: active ? t.accent : t.text2,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {task.recurrence && (
              <div style={{ marginTop: 6, fontSize: 12, color: t.text3 }}>
                Po dokončení se automaticky vytvoří nový úkol.
              </div>
            )}
          </Sec>

          <Sec label="Přiřazeno">
            <AssigneeSelector taskId={task.id} currentAssigneeId={task.assigneeUserId} onChange={(uid) => s({ assigneeUserId: uid })} />
          </Sec>

          <Sec label="Přílohy">
            <AttachmentsMiniList taskId={task.id} />
          </Sec>

          <Sec label="Poznámky">
            <NotesMiniList taskId={task.id} />
          </Sec>

          <div style={{ borderTop: `1px solid ${panelBorder}`, paddingTop: 12, marginTop: 8, fontSize: 12, color: t.text3 }}>
            <div>Vytvořeno: {formatDateTime(task.createdAt)}</div>
            <div>Upraveno: {formatDateTime(task.updatedAt)}</div>
            {task.completedAt && <div style={{ color: "#22c55e" }}>Dokončeno: {formatDateTime(task.completedAt)}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
