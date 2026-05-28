import React, { useMemo } from "react";
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
  "user-profile": "Profil",
};

export default function AtlasTopBar() {
  const { page, projects, selProject, setCmdOpen, setPage, setTaskDetail } = useApp();

  const crumbs = useMemo(() => {
    if (page === "project-detail") {
      const name = projects.find((p) => p.id === selProject)?.name;
      return ["Workspace", "Projekty", name || "Detail projektu"];
    }
    return ["Workspace", PAGE_LABELS[page] || "Přehled"];
  }, [page, projects, selProject]);

  return (
    <div className="tb">
      <div className="tb-crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            <span className={i === crumbs.length - 1 ? "active" : ""}>{c}</span>
            {i < crumbs.length - 1 ? <span className="sep">›</span> : null}
          </React.Fragment>
        ))}
      </div>

      <div className="tb-acts">
        <div className="tb-search" onClick={() => setCmdOpen(true)}>
          <Icon name="search" size={13} color="currentColor" strokeWidth={1.8} />
          <span>Hledat napříč workspace…</span>
          <kbd>⌘K</kbd>
        </div>
        <button className="tb-btn primary" onClick={() => { setPage("tasks"); setTaskDetail(null); }}>
          <Icon name="plus" size={13} color="currentColor" strokeWidth={2} />
          Nový úkol
        </button>
        <NotificationBell variant="atlas" />
      </div>
    </div>
  );
}
