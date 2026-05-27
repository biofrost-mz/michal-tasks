import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'
import MZLogo from '../components/MZLogo.jsx'
import { projectColor } from '../utils.js'
import { APP_RELEASE_DATE, APP_VERSION } from '../appMeta.js'
import { formatDate } from '../locale.js'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

/* ─────────────────────────────────────────────
   Workspace Switcher
───────────────────────────────────────────── */
export function WorkspaceSwitcher() {
  const { t, workspaces, activeWorkspaceId, switchWorkspace, createWorkspace, generateInviteLink, workspaceRole, isMobile, setPage } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");

  const active = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ws = await createWorkspace(newName);
      await switchWorkspace(ws.id);
      setNewName("");
      setCreating(false);
      setOpen(false);
      toast("Workspace vytvořen", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = await generateInviteLink(inviteRole);
      setInviteLink(link);
      toast("Odkaz vygenerován", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.input,
          color: t.text,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 6, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          {active?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
          {active?.name ?? "Načítám…"}
        </span>
        <Icon name="chevron-down" size={13} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <div style={{ padding: "6px 6px 4px", fontSize: 12, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Workspace</div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "7px 8px", borderRadius: 7, border: "none",
                  background: ws.id === activeWorkspaceId ? t.accentBg : "transparent",
                  color: ws.id === activeWorkspaceId ? t.accent : t.text,
                  cursor: "pointer", fontSize: 13, fontWeight: ws.id === activeWorkspaceId ? 600 : 400,
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, background: ws.id === activeWorkspaceId ? t.accent : t.border, display: "flex", alignItems: "center", justifyContent: "center", color: ws.id === activeWorkspaceId ? "#fff" : t.text2, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {ws.name[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, textAlign: "left" }}>{ws.name}</span>
                <span style={{ fontSize: 12, color: t.text3 }}>{ws.role}</span>
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />
            {creating ? (
              <div style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="Název workspace…"
                  style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }}
                />
                <button onClick={handleCreate} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>OK</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
                <Icon name="plus" size={13} color={t.text3} strokeWidth={2} />
                Nový workspace
              </button>
            )}
            {(workspaceRole === "owner" || workspaceRole === "admin") && (
              <>
                <button onClick={() => { setInviteOpen(true); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
                  <Icon name="plus" size={13} color={t.text3} strokeWidth={2} />
                  Pozvat člena
                </button>
              </>
            )}
            <button onClick={() => { setPage("workspace-settings"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
              <Icon name="list" size={13} color={t.text3} strokeWidth={2} />
              Správa workspace
            </button>
          </div>
        </>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <>
          <div onClick={() => { setInviteOpen(false); setInviteLink(""); }} style={{ position: "fixed", inset: 0, background: "#0005", zIndex: 300 }} />
          <div className="pop" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: "24px 28px", zIndex: 301, width: 360, maxWidth: "calc(100vw - 32px)", boxShadow: t.shadow }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Pozvat do workspace</div>
            <div style={{ fontSize: 12, color: t.text2, marginBottom: 10 }}>Role pozvaného:</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {["member", "viewer", "admin"].map((r) => (
                <button key={r} onClick={() => setInviteRole(r)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${inviteRole === r ? t.accent : t.border}`, background: inviteRole === r ? t.accentBg : "transparent", color: inviteRole === r ? t.accent : t.text2, fontSize: 12, fontWeight: inviteRole === r ? 600 : 400, cursor: "pointer" }}>
                  {r}
                </button>
              ))}
            </div>
            {inviteLink ? (
              <>
                <div style={{ fontSize: 12, color: t.text2, marginBottom: 6 }}>Zkopíruj a pošli odkaz:</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={inviteLink} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }} onClick={(e) => e.target.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Zkopírováno", "success"); }} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Kopírovat
                  </button>
                </div>
                <div style={{ fontSize: 12, color: t.text3, marginTop: 6 }}>Platnost 7 dní</div>
              </>
            ) : (
              <button onClick={handleGenerateLink} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Vygenerovat odkaz
              </button>
            )}
            <button onClick={() => { setInviteOpen(false); setInviteLink(""); }} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}>
              <Icon name="x" size={16} color={t.text3} strokeWidth={2} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   User Bar (bottom of sidebar)
───────────────────────────────────────────── */
function UserBar({ setPage }) {
  const { t, userEmail, logout, workspaceMembers, userId } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  const me = workspaceMembers.find((m) => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
    await logout();
    toast("Odhlášeno", "success");
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, border: "none", background: "transparent", color: t.text, cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.displayName || displayName}</div>
          {me?.displayName && <div style={{ fontSize: 12, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>}
        </div>
        <Icon name="chevron-up" size={12} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <div style={{ padding: "8px 10px 6px", fontSize: 12, color: t.text3, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontWeight: 600, color: t.text, marginBottom: 1 }}>{me?.displayName || "—"}</div>
              <div>{userEmail}</div>
            </div>
            <button onClick={() => { setPage("user-profile"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "transparent", color: t.text, cursor: "pointer", fontSize: 13 }}>
              <Icon name="user" size={13} color={t.text3} strokeWidth={2} />
              Můj profil
            </button>
            <div style={{ borderTop: `1px solid ${t.border}` }} />
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
              <Icon name="x" size={13} color="#ef4444" strokeWidth={2} />
              Odhlásit se
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   Sortable Project Item
───────────────────────────────────────────── */
function SortableProjectItem({ p, tasks, t, openProject }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const [hovered, setHovered] = useState(false);
  const count = tasks.filter((tk) => tk.projectId === p.id && tk.status !== "done").length;

  return (
    <div
      ref={setNodeRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          color: t.text3,
          fontSize: 12,
          padding: "6px 4px 6px 10px",
          flexShrink: 0,
          opacity: hovered || isDragging ? 1 : 0,
          transition: "opacity 0.15s",
          userSelect: "none",
        }}
        title="Přetáhnout"
      >
        ⠿
      </span>
      <button
        onClick={() => openProject(p.id)}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px 6px 4px",
          borderRadius: 6,
          background: "transparent",
          border: "none",
          color: t.text2,
          fontSize: 13,
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: projectColor(p.id) || t.text3,
            flexShrink: 0,
          }}
        />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
        {count > 0 && <span className="mono" style={{ fontSize: 12, color: t.text3 }}>{count}</span>}
      </button>
    </div>
  );
}

export default function Sidebar({ toggleDk }) {
  const { t, dk, projects, tasks, quickTodos, page, setPage, openProject, search, setSearch, setTaskDetail, setCmdOpen, reorderProjects } = useApp();
  const active = projects.filter((p) => p.status === "active");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const searchRef = useRef(null);

  // Global keyboard shortcuts (desktop)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); window.dispatchEvent(new CustomEvent("focusQuickAdd")); }
      else if (e.key === "Escape") { setTaskDetail(null); }
      else if (e.key === "k" || e.key === "K") { window.dispatchEvent(new CustomEvent("toggleKanbanView")); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTaskDetail, setCmdOpen]);

  function handleProjectDragEnd({ active: dragActive, over }) {
    if (!over || dragActive.id === over.id) return;
    const oldIndex = active.findIndex((p) => p.id === dragActive.id);
    const newIndex = active.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderProjects(arrayMove(active, oldIndex, newIndex));
  }
  const nav = [
    { id: "dashboard",   label: "Přehled",       icon: "home"         },
    { id: "quick-todos", label: "Rychlý seznam",  icon: "zap",          count: quickTodos.filter((q) => !q.done).length || null },
    { id: "projects",    label: "Projekty",       icon: "folder"       },
    { id: "tasks",       label: "Úkoly",          icon: "check-square", count: tasks.filter((t) => t.status !== "done").length },
    { id: "timeline",    label: "Plán",           icon: "calendar"     },
    { id: "tags",        label: "Tagy",           icon: "tag"          },
    { id: "notes",       label: "Poznámky",       icon: "file-text",   count: null },
  ];

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        background: t.bg2,
        borderRight: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
      }}
    >
      <div style={{ padding: "20px 14px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <MZLogo size={30} />
        <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-0.5px" }}>
          Michal Tasks
        </span>
      </div>

      <div style={{ padding: "8px 10px 10px" }}>
        <WorkspaceSwitcher />
      </div>

      <div style={{ padding: "0 10px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "6px 10px",
            background: t.input,
            borderRadius: 8,
            border: `1px solid ${t.border}`,
          }}
        >
          <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ flexShrink: 0 }} />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setCmdOpen(true); } }}
            placeholder="Filtrovat… nebo Enter pro ⌘K"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              color: t.text,
              fontSize: 12.5,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      <nav style={{ padding: "4px 8px", flex: 1 }}>
        {nav.map((n) => {
          const act = page === n.id || (n.id === "projects" && page === "project-detail");
          return (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 10px",
                minHeight: 40,
                borderRadius: 7,
                marginBottom: 1,
                background: act ? t.accentBg : "transparent",
                border: "none",
                color: act ? t.accent : t.text2,
                fontSize: 14,
                fontWeight: act ? 600 : 400,
                transition: "all .12s",
              }}
            >
              <span style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.85 }}>
                <Icon name={n.icon} size={17} color={act ? t.accent : t.text2} strokeWidth={act ? 2.25 : 1.75} />
              </span>
              {n.label}
              {n.count > 0 && (
                <span
                  className="mono"
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    color: t.text3,
                    background: t.input,
                    padding: "1px 6px",
                    borderRadius: 8,
                  }}
                >
                  {n.count}
                </span>
              )}
            </button>
          );
        })}

        {active.length > 0 && (
          <div style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".08em",
                color: t.text3,
                padding: "0 10px",
                marginBottom: 6,
              }}
            >
              Aktivní projekty
            </div>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
              <SortableContext items={active.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                {active.map((p) => (
                  <SortableProjectItem key={p.id} p={p} tasks={tasks} t={t} openProject={openProject} />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </nav>

      <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12.5, color: t.text2, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name={dk ? "moon" : "sun"} size={14} color={t.text2} strokeWidth={1.75} />
            {dk ? "Tmavý" : "Světlý"}
          </div>
          <button
            onClick={toggleDk}
            style={{ width: 44, height: 24, borderRadius: 999, border: `1px solid ${t.border}`, background: dk ? t.accentBg : t.input, position: "relative", padding: 0 }}
            aria-label="Toggle theme"
          >
            <span style={{ position: "absolute", top: 2, left: dk ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: dk ? t.accent : t.card, transition: "left .15s ease", boxShadow: t.shadow }} />
          </button>
        </div>
        <a
          href="https://www.zichmichal.cz/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            textDecoration: "none", borderRadius: 8, padding: "5px 4px",
            transition: "background .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = t.input; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
          title="Autor: Michal Zich · zichmichal.cz"
        >
          <MZLogo size={24} />
          <div style={{ lineHeight: 1.3 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text2 }}>Michal Zich</div>
            <div style={{ fontSize: 12, color: t.text3 }}>v{APP_VERSION}</div>
          </div>
        </a>
      </div>
    </aside>
  );
}
