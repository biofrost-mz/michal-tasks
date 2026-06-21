import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { startOfToday } from '../utils.js'
import { WorkspaceSwitcher } from './Sidebar.jsx'
import { formatDateKey } from '../locale.js'

export default function MobileNav({ toggleDk }) {
  const { dk, page, setPage, tasks, projects, quickTodos, setCmdOpen, setTaskDetail, userEmail, workspaceMembers, userId, logout } = useApp();
  const confirm = useConfirm();
  const [moreOpen, setMoreOpen] = useState(false);

  const today = startOfToday();
  const todayStr = formatDateKey(today);
  const tomorrowStr = formatDateKey(new Date(today.getTime() + 86400000));
  const active = tasks.filter((x) => x.status !== "done");
  const overdue = active.filter((x) => x.dueDate && x.dueDate < todayStr);
  const dueToday = active.filter((x) => x.dueDate === todayStr);
  const dueTomorrow = active.filter((x) => x.dueDate === tomorrowStr);
  const urgentCount = overdue.length + dueToday.length;
  const primary = [
    { id: "dashboard",   label: "Přehled",  icon: "home"         },
    { id: "quick-todos", label: "Seznam",   icon: "zap",          count: quickTodos.filter((q) => !q.done).length || null },
    { id: "tasks",       label: "Úkoly",    icon: "check-square", count: tasks.filter((x) => x.status !== "done").length, urgent: overdue.length > 0 },
    { id: "projects",    label: "Projekty", icon: "folder"       },
  ];

  const moreList = React.useMemo(() => {
    return [
      { id: "notes",     label: "Poznámky", icon: "file-text"    },
      { id: "timeline",  label: "Plán",     icon: "calendar"     },
      { id: "tags",      label: "Tagy",     icon: "tag"          },
    ];
  }, []);

  const me = workspaceMembers.find((m) => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";
  const parts = displayName.trim().split(/\s+/)
  const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.slice(0, 2).toUpperCase();

  const handleNav = (id) => {
    const isCurrentlyActive = id === "projects" ? (page === "projects" || page === "project-detail") : page === id;
    if (isCurrentlyActive) {
      const scrollEl = document.querySelector(window.innerWidth < 768 ? "main" : ".main");
      scrollEl?.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPage(id);
    }
    setMoreOpen(false);
    setTaskDetail(null);
  };

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?", { confirmLabel: "Odhlásit", confirmColor: "#3b82f6" })) return;
    await logout();
  };

  return (
    <>
      {/* "Více" drawer overlay */}
      {moreOpen && (
        <>
          <div
            className="su"
            style={{
              position: "fixed", inset: 0, zIndex: 196,
              background: "var(--bg-2)",
              overflowY: "auto",
              paddingBottom: "var(--safe-area-inset-bottom,0px)",
            }}
          >
            {/* Header */}
            <div style={{
              position: "sticky", top: 0, zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "calc(16px + env(safe-area-inset-top, 0px)) 16px 12px",
              background: "var(--bg-2)",
              borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>Více</span>
              <button
                onClick={() => setMoreOpen(false)}
                style={{ background: "var(--input)", border: "1px solid var(--border)", color: "var(--text-2)", borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Icon name="x" size={16} color="var(--text-2)" strokeWidth={2} />
              </button>
            </div>
            <div style={{ padding: "12px 16px 80px" }}>

            {/* Search / Command Palette */}
            <button
              onClick={() => { setCmdOpen(true); setMoreOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--input)", color: "var(--text-2)", fontSize: 14, marginBottom: 8,
              }}
            >
              <Icon name="search" size={16} color="var(--text-3)" />
              <span>Hledat… (⌘K)</span>
              <kbd style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-3)", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px" }}>⌘K</kbd>
            </button>

            {/* More nav items */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {moreList.map((n) => {
                const act = page === n.id;
                return (
                  <button key={n.id} onClick={() => handleNav(n.id)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 8px", borderRadius: 10, border: act ? "1px solid rgba(var(--accent-rgb),0.31)" : "1px solid var(--border)",
                    background: act ? "var(--accent-soft)" : "var(--surface)", color: act ? "var(--accent)" : "var(--text-2)",
                  }}>
                    <Icon name={n.icon} size={20} color={act ? "var(--accent)" : "var(--text-2)"} strokeWidth={act ? 2.25 : 1.75} />
                    <span style={{ fontSize: 12, fontWeight: act ? 600 : 400 }}>{n.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Workspace switcher */}
            <div style={{ marginBottom: 4 }}>
              <WorkspaceSwitcher />
            </div>

            {/* Settings */}
            <button
              onClick={() => handleNav("workspace-settings")}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text-2)", fontSize: 13, marginBottom: 8,
                textAlign: "left",
              }}
            >
              <Icon name="settings" size={16} color="var(--text-3)" strokeWidth={1.75} />
              <span>Nastavení</span>
            </button>

            {/* Reminders inline panel */}
            {(overdue.length > 0 || dueToday.length > 0 || dueTomorrow.length > 0) && (
              <div style={{ marginBottom: 8, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden" }}>
                <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="bell" size={14} color={urgentCount > 0 ? "#f59e0b" : "var(--text-3)"} strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Připomínky</span>
                  {urgentCount > 0 && <span style={{ fontSize: 12, fontWeight: 700, background: "#ef4444", color: "#fff", borderRadius: 8, padding: "1px 6px" }}>{urgentCount}</span>}
                </div>
                <div style={{ padding: "2px 8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {[
                    ...overdue.map((t2) => ({ ...t2, _cat: "overdue" })),
                    ...dueToday.map((t2) => ({ ...t2, _cat: "today" })),
                    ...dueTomorrow.map((t2) => ({ ...t2, _cat: "tomorrow" })),
                  ].slice(0, 5).map((task) => {
                    const color = task._cat === "overdue" ? "#ef4444" : task._cat === "today" ? "#f59e0b" : "#3b82f6";
                    const proj = projects.find((p) => p.id === task.projectId);
                    return (
                      <button
                        key={task.id}
                        onClick={() => { setTaskDetail(task.id); setMoreOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%",
                          padding: "10px 8px", borderRadius: 7, border: "none", background: "transparent",
                          cursor: "pointer", textAlign: "left",
                          minHeight: 44,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--input)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.title || "Bez názvu"}
                        </span>
                        {proj && <span style={{ fontSize: 12, color: "var(--text-3)", flexShrink: 1, maxWidth: "40%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{proj.name}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dark mode toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name={dk ? "moon" : "sun"} size={16} color="var(--text-2)" strokeWidth={1.75} />
                <span style={{ fontSize: 13, color: "var(--text-2)" }}>{dk ? "Tmavý režim" : "Světlý režim"}</span>
              </div>
              <button onClick={toggleDk} style={{
                width: 44, height: 24, borderRadius: 999, border: "1px solid var(--border)",
                background: dk ? "var(--accent-soft)" : "var(--input)", position: "relative", padding: 0, flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: dk ? 22 : 2, width: 20, height: 20,
                  borderRadius: "50%", background: dk ? "var(--accent)" : "var(--surface)",
                  transition: "left .15s ease", boxShadow: "var(--shadow-sm)",
                }} />
              </button>
            </div>

            {/* Account row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
              </div>
              <button onClick={() => handleNav("user-profile")} style={{
                padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--input)", color: "var(--text-2)", fontSize: 12, fontWeight: 500,
              }}>Nastavení</button>
              <button onClick={handleLogout} style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--input)", color: "var(--text-3)", fontSize: 12,
              }}>Odhlásit</button>
            </div>
            </div>{/* end inner padding div */}
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav
        className="mobile-nav-bar"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: "var(--bg-2)", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "flex-end",
          boxSizing: "border-box",
          boxShadow: "0 -4px 20px #0002",
        }}
      >
        {primary.map((n) => {
          const act = page === n.id || (n.id === "projects" && page === "project-detail");
          return (
            <button
              key={n.id}
              onClick={() => handleNav(n.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "flex-end", gap: 2,
                paddingTop: 6,
                paddingLeft: 2, paddingRight: 2,
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7px)",
                border: "none", background: "transparent",
                color: act ? "var(--accent)" : "var(--text-3)",
                position: "relative", minHeight: 44,
              }}
            >
              <div style={{ position: "relative", display: "inline-flex" }}>
                <Icon name={n.icon} size={22} color={act ? "var(--accent)" : "var(--text-3)"} strokeWidth={act ? 2.25 : 1.75} />
                {n.count > 0 && (
                  <span style={{
                    position: "absolute", top: -5, right: -9,
                    minWidth: 16, height: 16, borderRadius: 8, background: n.urgent ? "#ef4444" : "var(--accent)",
                    color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                    alignItems: "center", justifyContent: "center", padding: "0 3px",
                    boxShadow: "0 0 0 2px var(--bg-2)",
                  }}>{n.urgent ? overdue.length : (n.count > 99 ? "99+" : n.count)}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: act ? 600 : 400, letterSpacing: "0.01em" }}>{n.label}</span>
            </button>
          );
        })}

        {/* Více button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "flex-end", gap: 2,
            paddingTop: 6,
            paddingLeft: 2, paddingRight: 2,
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7px)",
            border: "none", background: "transparent",
            color: moreOpen ? "var(--accent)" : "var(--text-3)",
            position: "relative", minHeight: 44,
          }}
        >
          <div style={{ position: "relative", display: "inline-flex" }}>
            <Icon name="more-horizontal" size={22} color={moreOpen ? "var(--accent)" : "var(--text-3)"} strokeWidth={moreOpen ? 2.25 : 1.75} />
            {urgentCount > 0 && (
              <span style={{
                position: "absolute", top: -5, right: -9,
                minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444",
                color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", padding: "0 3px",
                boxShadow: "0 0 0 2px var(--bg-2)",
              }}>{urgentCount > 99 ? "99+" : urgentCount}</span>
            )}
          </div>
          <span style={{ fontSize: 10, fontWeight: moreOpen ? 600 : 400 }}>Více</span>
        </button>
      </nav>
    </>
  );
}
