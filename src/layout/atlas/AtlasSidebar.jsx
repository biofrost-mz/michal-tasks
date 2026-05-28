import React, { useMemo, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useConfirm } from "../../components/Confirm.jsx";
import { useToast } from "../../components/Toast.jsx";
import Icon from "../../components/Icon.jsx";
import { projectColor } from "../../utils.js";

const NAV = [
  { id: "dashboard", label: "Přehled", icon: "home" },
  { id: "quick-todos", label: "Rychlý seznam", icon: "zap", countKey: "quick" },
  { id: "projects", label: "Projekty", icon: "folder" },
  { id: "tasks", label: "Úkoly", icon: "check-square", countKey: "tasks" },
  { id: "timeline", label: "Plán", icon: "calendar" },
  { id: "tags", label: "Tagy", icon: "tag" },
  { id: "notes", label: "Poznámky", icon: "file-text" },
];

function MiniCal() {
  const weeks = [
    [{ d: 27, prev: true }, { d: 28, prev: true }, { d: 29, prev: true }, { d: 30, prev: true }, { d: 1 }, { d: 2 }, { d: 3 }],
    [{ d: 4 }, { d: 5 }, { d: 6 }, { d: 7 }, { d: 8 }, { d: 9 }, { d: 10 }],
    [{ d: 11 }, { d: 12 }, { d: 13 }, { d: 14 }, { d: 15 }, { d: 16 }, { d: 17 }],
    [{ d: 18 }, { d: 19 }, { d: 20 }, { d: 21 }, { d: 22 }, { d: 23 }, { d: 24 }],
    [{ d: 25 }, { d: 26, overdue: true }, { d: 27, today: true, has: true }, { d: 28, has: true }, { d: 29, has: true }, { d: 30 }, { d: 31 }],
  ];

  return (
    <div className="sb-cal">
      <div className="sb-cal-head">
        <span className="sb-cal-month">květen</span>
        <span className="sb-cal-nav"><span>‹</span><span>›</span></span>
      </div>
      <div className="sb-cal-grid">
        {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => <div key={d} className="sb-cal-dh">{d}</div>)}
        {weeks.flat().map((c, i) => (
          <div
            key={i}
            className={`sb-cal-d ${c.prev ? "muted" : ""} ${c.today ? "today" : ""} ${c.has ? "has" : ""} ${c.overdue ? "overdue" : ""}`}
          >
            {c.d}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AtlasSidebar({ collapsed, setCollapsed }) {
  const {
    page,
    setPage,
    openProject,
    projects,
    tasks,
    quickTodos,
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    createWorkspace,
    userEmail,
    workspaceMembers,
    userId,
    logout,
    setSelProject,
  } = useApp();

  const toast = useToast();
  const confirm = useConfirm();

  const [wsOpen, setWsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const me = workspaceMembers.find((m) => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";

  const counts = useMemo(() => ({
    quick: quickTodos.filter((q) => !q.done).length,
    tasks: tasks.filter((t) => t.status !== "done").length,
  }), [quickTodos, tasks]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "active"),
    [projects]
  );

  const handleCreateWorkspace = async () => {
    const name = window.prompt("Název nového workspace:");
    if (!name || !name.trim()) return;
    try {
      const ws = await createWorkspace(name.trim());
      await switchWorkspace(ws.id);
      toast("Workspace vytvořen", "success");
      setWsOpen(false);
    } catch (e) {
      toast(e.message || "Nepodařilo se vytvořit workspace", "error");
    }
  };

  const handleLogout = async () => {
    if (!(await confirm("Odhlásit se?"))) return;
    await logout();
  };

  const isProjectsActive = page === "projects" || page === "project-detail";

  return (
    <aside className="sb">
      <button className="sb-collapse" onClick={() => setCollapsed((v) => !v)} title={collapsed ? "Rozbalit" : "Sbalit"}>
        <Icon name="chevron-right" size={12} color="currentColor" strokeWidth={2} />
      </button>

      <div className="sb-brand">
        <div className="sb-logo">A</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Atlas</div>
          <div className="sb-brand-tag">personal OS · v2</div>
        </div>
      </div>

      <div className="sb-ws" onClick={() => setWsOpen((v) => !v)}>
        <div className="sb-ws-mono">{(activeWorkspace?.name || "A").slice(0, 1).toUpperCase()}</div>
        <span className="sb-ws-name">{activeWorkspace?.name || "Načítám…"}</span>
        <span className="sb-ws-arrow">▾</span>
      </div>

      {wsOpen && !collapsed ? (
        <div style={{ margin: "0 12px 8px", background: "var(--surface)", border: "1px solid var(--border-soft)", borderRadius: "var(--r)", padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                switchWorkspace(w.id);
                setWsOpen(false);
              }}
              style={{ textAlign: "left", padding: "7px 8px", borderRadius: 7, background: w.id === activeWorkspaceId ? "var(--accent-soft)" : "transparent", color: w.id === activeWorkspaceId ? "var(--accent)" : "var(--text-2)", fontSize: 12.5 }}
            >
              {w.name}
            </button>
          ))}
          <button onClick={handleCreateWorkspace} style={{ textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--text-2)", fontSize: 12.5 }}>
            + Nový workspace
          </button>
          <button onClick={() => { setPage("workspace-settings"); setWsOpen(false); }} style={{ textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--text-2)", fontSize: 12.5 }}>
            Správa workspace
          </button>
        </div>
      ) : null}

      <nav className="sb-nav">
        {NAV.map((n) => {
          const active = n.id === "projects" ? isProjectsActive : page === n.id;
          return (
            <div
              key={n.id}
              className={`sb-nav-item ${active ? "active" : ""}`}
              onClick={() => {
                setPage(n.id);
                if (n.id !== "project-detail") setSelProject?.(null);
              }}
              title={n.label}
            >
              <Icon name={n.icon} size={16} color="currentColor" strokeWidth={1.7} />
              <span className="sb-nav-label">{n.label}</span>
              {n.countKey ? <span className="sb-nav-count">{counts[n.countKey]}</span> : null}
            </div>
          );
        })}
      </nav>

      <MiniCal />

      <div className="sb-section">
        <span>Aktivní projekty</span>
        <a onClick={() => setPage("projects")} title="Nový projekt">+</a>
      </div>

      <div className="sb-projects">
        {activeProjects.map((p) => {
          const openCount = tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
          return (
            <div key={p.id} className="sb-proj" onClick={() => openProject(p.id)} title={p.name}>
              <span className="sb-proj-dot" style={{ background: projectColor(p.id) }} />
              <span className="sb-proj-name">{p.name}</span>
              <span className="sb-proj-count">{openCount}</span>
            </div>
          );
        })}
      </div>

      <div className="sb-foot" style={{ position: "relative" }}>
        <button style={{ display: "contents" }} onClick={() => setUserOpen((v) => !v)}>
          <div className="sb-foot-av">{displayName.slice(0, 2).toUpperCase()}</div>
          <div className="sb-foot-meta">
            <div className="sb-foot-name">{displayName}</div>
            <div className="sb-foot-sub">v2 · tmavý režim</div>
          </div>
          <div className="sb-foot-toggle" />
        </button>

        {userOpen && !collapsed ? (
          <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 6, right: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 6, zIndex: 30 }}>
            <button onClick={() => { setPage("user-profile"); setUserOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--text-2)", fontSize: 12.5 }}>Můj profil</button>
            <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--red)", fontSize: 12.5 }}>Odhlásit se</button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
