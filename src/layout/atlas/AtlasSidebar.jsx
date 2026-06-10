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

const MONTH_NAMES_CZ = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec"
];

function MiniCal() {
  const { setPage, timelineOffsetDays, setTimelineOffsetDays, tasks = [] } = useApp();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const cells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = firstDayOfMonth.getDay();
    const prevDaysCount = (dayOfWeek + 6) % 7; // offset for Monday-first week

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();

    const result = [];

    // Prev month's trailing days
    for (let i = prevDaysCount - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      result.push({ d, month: m, year: y, muted: true });
    }

    // Current month's days
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({ d, month: currentMonth, year: currentYear, muted: false });
    }

    // Next month's leading days to fill 42 cells
    const remaining = 42 - result.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      result.push({ d, month: m, year: y, muted: true });
    }

    return result;
  }, [currentYear, currentMonth]);

  const pad0 = (num) => String(num).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad0(today.getMonth() + 1)}-${pad0(today.getDate())}`;

  const selectedDateStr = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + (timelineOffsetDays || 0));
    return `${d.getFullYear()}-${pad0(d.getMonth() + 1)}-${pad0(d.getDate())}`;
  }, [today, timelineOffsetDays]);

  const cellsWithStatus = useMemo(() => {
    return cells.map((cell) => {
      const dateStr = `${cell.year}-${pad0(cell.month + 1)}-${pad0(cell.d)}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDateStr;

      // Filter active tasks
      const activeTasksOnDay = tasks.filter(
        (t) => t.dueDate === dateStr && t.status !== "done"
      );
      const has = activeTasksOnDay.length > 0;
      const overdue = has && activeTasksOnDay.some((t) => t.dueDate < todayStr);

      return {
        ...cell,
        isToday,
        isSelected,
        has,
        overdue,
      };
    });
  }, [cells, tasks, todayStr, selectedDateStr]);

  const handleClickDay = (c) => {
    const cellDate = new Date(c.year, c.month, c.d, 0, 0, 0, 0);
    const diffTime = cellDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / 86400000);

    setTimelineOffsetDays(diffDays);
    setPage("timeline");
  };

  return (
    <div className="sb-cal">
      <div className="sb-cal-head" onClick={() => setPage("timeline")} style={{ cursor: "pointer" }}>
        <span className="sb-cal-month">{MONTH_NAMES_CZ[currentMonth]} {currentYear}</span>
        <span className="sb-cal-nav">
          <span onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }} style={{ cursor: "pointer" }}>‹</span>
          <span onClick={(e) => { e.stopPropagation(); handleNextMonth(); }} style={{ cursor: "pointer" }}>›</span>
        </span>
      </div>
      <div className="sb-cal-grid">
        {["Po", "Út", "St", "Čt", "Pá", "So", "Ne"].map((d) => <div key={d} className="sb-cal-dh">{d}</div>)}
        {cellsWithStatus.map((c, i) => (
          <div
            key={i}
            className={`sb-cal-d ${c.muted ? "muted" : ""} ${c.isToday ? "today" : ""} ${c.isSelected ? "selected" : ""} ${c.has ? "has" : ""} ${c.overdue ? "overdue" : ""}`}
            style={{ cursor: "pointer" }}
            onClick={() => handleClickDay(c)}
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
    dk,
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

  const visibleNav = useMemo(() => {
    return NAV;
  }, []);

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

      <div className="sb-brand" onClick={() => setPage("dashboard")} style={{ cursor: "pointer" }}>
        <div className="sb-logo">Z</div>
        <div className="sb-brand-text">
          <div className="sb-brand-name">Zentero</div>
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
            Nastavení
          </button>
        </div>
      ) : null}

      <nav className="sb-nav">
        {visibleNav.map((n) => {
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
        <button style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, textAlign: "left", background: "none", border: "none" }} onClick={() => setUserOpen((v) => !v)}>
          <div className="sb-foot-av">{displayName.slice(0, 2).toUpperCase()}</div>
          <div className="sb-foot-meta">
            <div className="sb-foot-name">{displayName}</div>
            <div className="sb-foot-sub">v2 · {dk ? "tmavý" : "světlý"}</div>
          </div>
        </button>

        {userOpen && !collapsed ? (
          <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 6, right: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r)", padding: 6, zIndex: 30 }}>
            <button onClick={() => { setPage("user-profile"); setUserOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--text-2)", fontSize: 12.5 }}>Nastavení účtu</button>
            <button onClick={handleLogout} style={{ width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 7, color: "var(--red)", fontSize: 12.5 }}>Odhlásit se</button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
