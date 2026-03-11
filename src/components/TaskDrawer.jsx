import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from './Toast.jsx'
import { useConfirm } from './Confirm.jsx'
import Icon from './Icon.jsx'
import AttachmentsMiniList from './AttachmentsMiniList.jsx'
import NotesMiniList from './NotesMiniList.jsx'
import { STATUSES, PRIORITIES } from '../constants.js'

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#94a3b8" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

function Sec({ label, children }) {
  const { t } = useApp();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 7 }}>
        {label}
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
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, cursor: "pointer", fontSize: 12, width: "100%" }}
      >
        {currentAssigneeId ? (
          <>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
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
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 9, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
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
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.userId === currentAssigneeId ? t.accent : t.border, display: "flex", alignItems: "center", justifyContent: "center", color: m.userId === currentAssigneeId ? "#fff" : t.text2, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(m)}</div>
                </div>
                <span style={{ fontSize: 10, color: t.text3, flexShrink: 0 }}>{m.role}</span>
              </button>
            ))}
          </div>
        </>
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
  const [remindAtDraft, setRemindAtDraft] = useState(
    task?.remindAt ? new Date(task.remindAt).toISOString().slice(0, 16) : ""
  );

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDesc(task.description || "");
    setShowNewProject(false);
    setNpName("");
    setRemindAtDraft(task.remindAt ? new Date(task.remindAt).toISOString().slice(0, 16) : "");
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
      <div onClick={() => setTaskDetail(null)} style={{ position: "fixed", inset: 0, background: "#00000040", zIndex: 90 }} />
      <div
        className={isMobile ? "su" : "sr"}
        style={{
          position: "fixed",
          ...(isMobile
            ? { bottom: 0, left: 0, right: 0, top: "8vh", borderRadius: "16px 16px 0 0", borderTop: `1px solid ${t.border}` }
            : { top: 0, right: 0, bottom: 0, width: 440, maxWidth: "92vw", borderLeft: `1px solid ${t.border}` }
          ),
          background: t.bg2,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: isMobile ? "0 -8px 40px #0004" : "-8px 0 32px #0003",
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "10px 16px 12px" : "18px 20px", borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text2, fontFamily: "'Outfit',sans-serif" }}>Detail úkolu</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={async () => { if (await confirm("Smazat úkol?")) { setTaskDetail(null); deleteTask(task.id); } }} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11.5, padding: "4px 8px", borderRadius: 5 }}>
              Smazat
            </button>
            <button onClick={() => setTaskDetail(null)} style={{ background: t.input, border: `1px solid ${t.border}`, color: t.text2, fontSize: 14, padding: "2px 10px", borderRadius: 6 }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 18px 30px" }}>
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
              style={{ fontSize: 18, fontWeight: 700, border: "none", background: "transparent", color: t.text, outline: "none", width: "100%", fontFamily: "'Outfit',sans-serif" }}
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
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: `1.5px solid ${task.status === k ? v.color : t.border}`,
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
                  fontSize: 11.5,
                  fontWeight: 500,
                  border: `1.5px solid ${!task.priority ? t.accent : t.border}`,
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
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: `1.5px solid ${task.priority === k ? v.color : t.border}`,
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
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
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
                  style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
                />
                <button onClick={createProjectInline} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Vytvořit
                </button>
                <button onClick={() => setShowNewProject(false)} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}>
                  ✕
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
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
              />
              <span style={{ fontSize: 11.5, color: t.text3 }}>
                Založeno:{" "}
                {new Date(task.createdAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
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
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1.5px solid ${active ? tg.color : t.border}`,
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
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 13, resize: "vertical", lineHeight: 1.5 }}
            />
          </Sec>

          <Sec label="Průběh a fáze">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {(task.phases || []).slice().reverse().map((ph) => (
                <div
                  key={ph.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: t.input,
                    border: `1px solid ${t.border}`,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{ph.text}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: t.text3, marginTop: 4 }}>
                      {new Date(ph.date).toLocaleString("cs-CZ")}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = (task.phases || []).filter((x) => x.id !== ph.id);
                      s({ phases: next });
                    }}
                    style={{ border: "none", background: "transparent", color: t.text3, fontSize: 14, cursor: "pointer" }}
                    title="Smazat"
                  >
                    ✕
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
                  border: `1px solid ${t.border}`,
                  background: t.input,
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
                  background: t.accent,
                  color: "#fff",
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
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
              />
              <button
                onClick={() => {
                  const val = remindAtDraft ? new Date(remindAtDraft).toISOString() : null;
                  s({ remindAt: val });
                }}
                style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                Uložit
              </button>
              {task.remindAt && (
                <button
                  onClick={() => { setRemindAtDraft(""); s({ remindAt: null }); }}
                  style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: "#ef4444", fontSize: 12, cursor: "pointer" }}
                >
                  ✕ Zrušit
                </button>
              )}
            </div>
            {task.remindAt && (
              <div style={{ fontSize: 11, color: t.text3, marginTop: 5 }}>
                Nastaveno: {new Date(task.remindAt).toLocaleString("cs-CZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
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
                      border: `1px solid ${active ? t.accent : t.border}`,
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
              <div style={{ marginTop: 6, fontSize: 11, color: t.text3 }}>
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

          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 8, fontSize: 11, color: t.text3 }}>
            <div>Vytvořeno: {new Date(task.createdAt).toLocaleString("cs-CZ")}</div>
            <div>Upraveno: {new Date(task.updatedAt).toLocaleString("cs-CZ")}</div>
            {task.completedAt && <div style={{ color: "#22c55e" }}>Dokončeno: {new Date(task.completedAt).toLocaleString("cs-CZ")}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
