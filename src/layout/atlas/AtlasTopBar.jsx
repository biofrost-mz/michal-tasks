import React, {useMemo} from "react";
import { useApp } from "../../context/AppContext.jsx";
import Icon from "../../components/Icon.jsx";
import NotificationBell from "../../components/NotificationBell.jsx";

const PAGE_LABELS = {
  dashboard: "Přehled",
  "quick-todos": "Rychlý seznam",
  projects: "Projekty",
  "project-detail": "Detail projektu",
  tasks: "Úkoly",
  timeline: "Plán",
  tags: "Tagy",
  notes: "Poznámky",
  "workspace-settings": "Nastavení",
  "user-profile": "Nastavení",
};

export default function AtlasTopBar() {
  const { page, projects, selProject, setCmdOpen, setPage, dk, setDk, workspaceMembers, userId, userEmail} = useApp();
  const me = workspaceMembers?.find(m => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";
  const initials = displayName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || "?";

  const crumbs = useMemo(() => {
    if (page === "project-detail") {
      const name = projects.find((p) => p.id === selProject)?.name;
      return [
        { label: "Workspace", pageId: "dashboard" },
        { label: "Projekty", pageId: "projects" },
        { label: name || "Detail projektu", pageId: null }
      ];
    }
    return [
      { label: "Workspace", pageId: "dashboard" },
      { label: PAGE_LABELS[page] || "Přehled", pageId: null }
    ];
  }, [page, projects, selProject]);

  const openNewTaskModal = () => {
    const dispatchOpen = () => window.dispatchEvent(new CustomEvent("openQuickAddModal"));
    if (page === "dashboard" || page === "tasks") {
      dispatchOpen();
      return;
    }
    setPage("dashboard");
    window.setTimeout(dispatchOpen, 180);
  };

  return (
    <div className="tb">
      <div className="tb-crumbs" style={{ flex: 1 }}>
        {crumbs.map((c, i) => {
          const isLast = i === crumbs.length - 1;
          const isClickable = c.pageId && !isLast;
          return (
            <React.Fragment key={i}>
              <span
                className={isLast ? "active" : ""}
                style={{
                  cursor: isClickable ? "pointer" : "default",
                  transition: "color 0.15s ease",
                  userSelect: "none"
                }}
                onClick={isClickable ? () => setPage(c.pageId) : undefined}
                onMouseEnter={isClickable ? (e) => { e.currentTarget.style.color = "var(--accent)"; } : undefined}
                onMouseLeave={isClickable ? (e) => { e.currentTarget.style.color = ""; } : undefined}
              >
                {c.label}
              </span>
              {!isLast ? <span className="sep">›</span> : null}
            </React.Fragment>
          );
        })}
      </div>

      <div className="tb-center" style={{ display: "flex", justifyContent: "center", flex: 1 }}>
        <div className="tb-search" onClick={() => setCmdOpen(true)}>
          <Icon name="search" size={13} color="currentColor" strokeWidth={1.8} />
          <span>Hledat napříč workspace…</span>
          <kbd>⌘K</kbd>
        </div>
      </div>

      <div className="tb-acts" style={{ flex: 1, justifyContent: "flex-end" }}>
        <button className="tb-btn primary" onClick={openNewTaskModal}>
          <Icon name="plus" size={13} color="currentColor" strokeWidth={2} />
          Nový úkol
        </button>
        <NotificationBell variant="atlas" />
          {/* Sun/moon theme toggle */}
          <button
            className="tb-bell"
            onClick={() => setDk(!dk)}
            title={dk ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
            aria-label={dk ? "Světlý režim" : "Tmavý režim"}
          >
            <Icon name={dk ? "sun" : "moon"} size={16} color="currentColor" strokeWidth={1.75} />
          </button>
          {/* User chip — přímá navigace na Nastavení */}
          <button
            className="tb-user"
            onClick={() => setPage("user-profile")}
            title="Nastavení účtu"
          >
            <div className="tb-user-av">{initials}</div>
            <span className="tb-user-name">{displayName}</span>
          </button>
      </div>
    </div>
  );
}
