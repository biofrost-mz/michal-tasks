import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { useConfirm } from '../components/Confirm.jsx'
import Icon from '../components/Icon.jsx'
import { startOfToday } from '../utils.js'
import { WorkspaceSwitcher } from './Sidebar.jsx'
import { formatDateKey } from '../locale.js'

export default function MobileNav({ toggleDk }) {
  const { t, dk, page, setPage, tasks, projects, quickTodos, setCmdOpen, setTaskDetail, userEmail, workspaceMembers, userId, logout } = useApp();
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
    { id: "tasks",       label: "Úkoly",    icon: "check-square", count: tasks.filter((x) => x.status !== "done").length },
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
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleNav = (id) => {
    setPage(id);
    setMoreOpen(false);
    setTaskDetail(null);
    if (id === "dashboard") {
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
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
              background: t.bg2,
              overflowY: "auto",
              paddingBottom: "env(safe-area-inset-bottom,0px)",
            }}
          >
            {/* Header */}
            <div style={{
              position: "sticky", top: 0, zIndex: 1,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "calc(16px + env(safe-area-inset-top, 0px)) 16px 12px",
              background: t.bg2,
              borderBottom: `1px solid ${t.border}`,
            }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: t.text }}>Více</span>
              <button
                onClick={() => setMoreOpen(false)}
                style={{ background: t.input, border: `1px solid ${t.border}`, color: t.text2, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <Icon name="x" size={16} color={t.text2} strokeWidth={2} />
              </button>
            </div>
            <div style={{ padding: "12px 16px 80px" }}>

            {/* Search / Command Palette */}
            <button
              onClick={() => { setCmdOpen(true); setMoreOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`,
                background: t.input, color: t.text2, fontSize: 14, marginBottom: 8,
              }}
            >
              <Icon name="search" size={16} color={t.text3} />
              <span>Hledat… (⌘K)</span>
              <kbd style={{ marginLeft: "auto", fontSize: 12, color: t.text3, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>⌘K</kbd>
            </button>

            {/* More nav items */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {moreList.map((n) => {
                const act = page === n.id;
                return (
                  <button key={n.id} onClick={() => handleNav(n.id)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 8px", borderRadius: 10, border: `1px solid ${act ? t.accent + "50" : t.border}`,
                    background: act ? t.accentBg : t.card, color: act ? t.accent : t.text2,
                  }}>
                    <Icon name={n.icon} size={20} color={act ? t.accent : t.text2} strokeWidth={act ? 2.25 : 1.75} />
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
                padding: "10px 14px", borderRadius: 10, border: `1px solid ${t.border}`,
                background: t.card, color: t.text2, fontSize: 13, marginBottom: 8,
                textAlign: "left",
              }}
            >
              <Icon name="settings" size={16} color={t.text3} strokeWidth={1.75} />
              <span>Nastavení</span>
            </button>

            {/* Reminders inline panel */}
            {(overdue.length > 0 || dueToday.length > 0 || dueTomorrow.length > 0) && (
              <div style={{ marginBottom: 8, borderRadius: 10, border: `1px solid ${t.border}`, background: t.card, overflow: "hidden" }}>
                <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="bell" size={14} color={urgentCount > 0 ? "#f59e0b" : t.text3} strokeWidth={2} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>Připomínky</span>
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
                        onMouseEnter={(e) => { e.currentTarget.style.background = t.input; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {task.title || "Bez názvu"}
                        </span>
                        {proj && <span style={{ fontSize: 12, color: t.text3, flexShrink: 0 }}>{proj.name}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dark mode toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: t.card, border: `1px solid ${t.border}`, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name={dk ? "moon" : "sun"} size={16} color={t.text2} strokeWidth={1.75} />
                <span style={{ fontSize: 13, color: t.text2 }}>{dk ? "Tmavý režim" : "Světlý režim"}</span>
              </div>
              <button onClick={toggleDk} style={{
                width: 44, height: 24, borderRadius: 999, border: `1px solid ${t.border}`,
                background: dk ? t.accentBg : t.input, position: "relative", padding: 0, flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: dk ? 22 : 2, width: 20, height: 20,
                  borderRadius: "50%", background: dk ? t.accent : t.card,
                  transition: "left .15s ease", boxShadow: t.shadow,
                }} />
              </button>
            </div>

            {/* Account row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: t.card, border: `1px solid ${t.border}` }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 13, fontWeight: 700,
              }}>{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</div>
                <div style={{ fontSize: 12, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
              </div>
              <button onClick={() => handleNav("user-profile")} style={{
                padding: "6px 12px", borderRadius: 8, border: `1px solid ${t.border}`,
                background: t.input, color: t.text2, fontSize: 12, fontWeight: 500,
              }}>Nastavení</button>
              <button onClick={handleLogout} style={{
                padding: "6px 10px", borderRadius: 8, border: `1px solid ${t.border}`,
                background: t.input, color: t.text3, fontSize: 12,
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
          background: t.bg2, borderTop: `1px solid ${t.border}`,
          display: "flex", alignItems: "stretch",
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
                justifyContent: "center", gap: 3, padding: "8px 4px 8px",
                border: "none", background: "transparent",
                color: act ? t.accent : t.text3,
                position: "relative",
              }}
            >
              {n.count > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: "50%", transform: "translateX(10px)",
                  minWidth: 16, height: 16, borderRadius: 8, background: t.accent,
                  color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                  alignItems: "center", justifyContent: "center", padding: "0 3px",
                }}>{n.count > 99 ? "99+" : n.count}</span>
              )}
              <Icon name={n.icon} size={24} color={act ? t.accent : t.text3} strokeWidth={act ? 2.25 : 1.75} />
              <span style={{ fontSize: 12, fontWeight: act ? 600 : 400, letterSpacing: "0.01em" }}>{n.label}</span>
            </button>
          );
        })}

        {/* Více button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "8px 4px 8px",
            border: "none", background: "transparent",
            color: moreOpen ? t.accent : t.text3,
            position: "relative",
          }}
        >
          {urgentCount > 0 && (
            <span style={{
              position: "absolute", top: 6, right: "50%", transform: "translateX(10px)",
              minWidth: 16, height: 16, borderRadius: 8, background: "#ef4444",
              color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
              alignItems: "center", justifyContent: "center", padding: "0 3px",
            }}>{urgentCount > 99 ? "99+" : urgentCount}</span>
          )}
          <Icon name="list" size={24} color={moreOpen ? t.accent : t.text3} strokeWidth={moreOpen ? 2.25 : 1.75} />
          <span style={{ fontSize: 12, fontWeight: moreOpen ? 600 : 400 }}>Více</span>
        </button>
      </nav>
    </>
  );
}
