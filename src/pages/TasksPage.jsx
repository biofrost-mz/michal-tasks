import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import Icon from '../components/Icon.jsx'
import QuickAdd from '../components/QuickAdd.jsx'
import DashTaskCard from '../components/DashTaskCard.jsx'
import { STATUSES, STATUS_KEYS, STATUS_SHORT, PRIORITIES } from '../constants.js'
import { startOfToday, parseYMD } from '../utils.js'

function ViewToggle({ view, setView, modes }) {
  const { t } = useApp();
  const items = modes || [
    { k: "cards", label: "Karty", icon: "▦" },
    { k: "list", label: "Tabulka", icon: "☰" },
  ];
  return (
    <div style={{ display: "flex", background: t.input, borderRadius: 8, padding: 2, border: `1px solid ${t.border}` }}>
      {items.map((v) => (
        <button
          key={v.k}
          onClick={() => setView(v.k)}
          style={{
            padding: "5px 12px",
            borderRadius: 6,
            fontSize: 11.5,
            fontWeight: 600,
            border: "none",
            background: view === v.k ? t.card : "transparent",
            color: view === v.k ? t.accent : t.text3,
            boxShadow: view === v.k ? t.shadow : "none",
            display: "flex",
            alignItems: "center",
            gap: 5,
            transition: "all .12s",
          }}
        >
          <span style={{ fontSize: 13 }}>{v.icon}</span> {v.label}
        </button>
      ))}
    </div>
  );
}

function FilterBtn({ label, active, color, onClick }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 11px",
        borderRadius: 6,
        fontSize: 12.5,
        fontWeight: 500,
        border: `1px solid ${active ? (color || t.accent) : t.border}`,
        background: active ? (color || t.accent) + "15" : "transparent",
        color: active ? (color || t.accent) : t.text2,
      }}
    >
      {label}
    </button>
  );
}

function ListView({ taskList, showProject = true }) {
  const { t, projects, tags, updateTask, setTaskDetail } = useApp();
  const [sortCol, setSortCol] = useState("title");
  const [sortDir, setSortDir] = useState("asc");

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sorted = [...taskList].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "title") cmp = (a.title || "").localeCompare(b.title || "", "cs");
    else if (sortCol === "status") cmp = STATUS_KEYS.indexOf(a.status) - STATUS_KEYS.indexOf(b.status);
    else if (sortCol === "priority") {
      const o = { high: 0, medium: 1, low: 2 };
      cmp = (a.priority ? o[a.priority] ?? 3 : 3) - (b.priority ? o[b.priority] ?? 3 : 3);
    } else if (sortCol === "due") {
      const da = parseYMD(a.dueDate);
      const db = parseYMD(b.dueDate);
      if (!da && !db) cmp = 0;
      else if (!da) cmp = 1;
      else if (!db) cmp = -1;
      else cmp = da - db;
    } else if (sortCol === "project") {
      const pa = projects.find((p) => p.id === a.projectId)?.name || "zzz";
      const pb = projects.find((p) => p.id === b.projectId)?.name || "zzz";
      cmp = pa.localeCompare(pb, "cs");
    } else if (sortCol === "created") cmp = a.createdAt - b.createdAt;

    return sortDir === "asc" ? cmp : -cmp;
  });

  const cols = [
    { key: "title", label: "Název", width: showProject ? "30%" : "38%" },
    { key: "status", label: "Status", width: "14%" },
    { key: "priority", label: "Priorita", width: "12%" },
    ...(showProject ? [{ key: "project", label: "Projekt", width: "14%" }] : []),
    { key: "due", label: "Termín", width: "10%" },
    { key: "tags", label: "Tagy", width: "14%", noSort: true },
    { key: "created", label: "Vytvořeno", width: "10%" },
  ];

  const SortArrow = ({ col }) => {
    if (sortCol !== col) return <span style={{ opacity: 0.3, fontSize: 8, marginLeft: 4 }}>⇅</span>;
    return <span style={{ fontSize: 8, marginLeft: 4, color: t.accent }}>{sortDir === "asc" ? "▲" : "▼"}</span>;
  };

  const today = startOfToday();

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${t.border}`, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: t.kanban }}>
            {cols.map((col) => (
              <th
                key={col.key}
                onClick={() => !col.noSort && toggleSort(col.key)}
                style={{
                  width: col.width,
                  padding: "10px 10px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                  color: t.text3,
                  cursor: col.noSort ? "default" : "pointer",
                  userSelect: "none",
                  textAlign: "left",
                  borderBottom: `1px solid ${t.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
                {!col.noSort && <SortArrow col={col.key} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((task, i) => {
            const st = STATUSES[task.status] || STATUSES.todo;
            const pr = task.priority ? PRIORITIES[task.priority] : null;
            const proj = projects.find((p) => p.id === task.projectId);
            const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));
            const due = parseYMD(task.dueDate);
            const isOverdue = due && task.status !== "done" && due < today;

            return (
              <tr
                key={task.id}
                onClick={() => setTaskDetail(task.id)}
                style={{
                  cursor: "pointer",
                  transition: "background .1s",
                  background: i % 2 === 0 ? "transparent" : t.kanban + "60",
                  borderBottom: `1px solid ${t.border}15`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = t.cardH)}
                onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? "transparent" : t.kanban + "60")}
              >
                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const idx = STATUS_KEYS.indexOf(task.status);
                        updateTask(task.id, { status: STATUS_KEYS[(idx + 1) % STATUS_KEYS.length] });
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        flexShrink: 0,
                        border: `2px solid ${st.color}`,
                        background: task.status === "done" ? st.color : "transparent",
                        color: task.status === "done" ? "#fff" : st.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {task.status === "done" ? "✓" : ""}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateTask(task.id, { starred: !task.starred });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        opacity: task.starred ? 1 : 0.3,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="star" size={14} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
                    </button>

                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        textDecoration: task.status === "done" ? "line-through" : "none",
                        color: task.status === "done" ? t.text3 : t.text,
                      }}
                    >
                      {task.title || "Bez názvu"}
                    </span>
                  </div>
                </td>

                <td style={{ padding: "10px 10px" }}>
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: st.color,
                      background: st.bg,
                      padding: "3px 8px",
                      borderRadius: 5,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon name={st.icon} size={10} color={st.color} strokeWidth={2} />{st.label}
                  </span>
                </td>

                <td style={{ padding: "10px 10px" }}>
                  {pr ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: pr.color,
                        background: pr.bg,
                        padding: "3px 8px",
                        borderRadius: 5,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Icon name={pr.icon} size={10} color={pr.color} strokeWidth={2.5} />{pr.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: t.text3 }}>—</span>
                  )}
                </td>

                {showProject && (
                  <td style={{ padding: "10px 10px" }}>
                    {proj ? (
                      <span style={{ fontSize: 11.5, color: t.accent, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {proj.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: t.text3, fontStyle: "italic" }}>Inbox</span>
                    )}
                  </td>
                )}

                <td style={{ padding: "10px 10px" }}>
                  {task.dueDate ? (
                    <span
                      className="mono"
                      style={{
                        fontSize: 11.5,
                        fontWeight: isOverdue ? 700 : 400,
                        color: isOverdue ? "#ef4444" : t.text2,
                        background: isOverdue ? "#ef444412" : "transparent",
                        padding: isOverdue ? "2px 6px" : 0,
                        borderRadius: 4,
                      }}
                    >
                      {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }) || task.dueDate}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: t.text3 }}>—</span>
                  )}
                </td>

                <td style={{ padding: "10px 10px" }}>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {taskTags.map((tg) => (
                      <span key={tg.id} style={{ fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: tg.color + "18", color: tg.color, whiteSpace: "nowrap" }}>
                        {tg.name}
                      </span>
                    ))}
                  </div>
                </td>

                <td style={{ padding: "10px 10px" }}>
                  <span className="mono" style={{ fontSize: 11.5, color: t.text3 }}>
                    {new Date(task.createdAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {sorted.length === 0 && <div style={{ padding: "30px", textAlign: "center", color: t.text3, fontSize: 12.5 }}>Žádné úkoly</div>}
    </div>
  );
}

export { ViewToggle, FilterBtn, ListView };

export default function TasksPage() {
  const { t, tasks, projects, search, isMobile } = useApp();
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [view, setView] = useState("list");

  const matchesSearch = (task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (task.title || "").toLowerCase().includes(s) || (task.description || "").toLowerCase().includes(s);
  };

  let filtered = tasks.filter(matchesSearch);
  if (statusFilter !== "all") filtered = filtered.filter((x) => x.status === statusFilter);
  if (projectFilter !== "all") {
    if (projectFilter === "inbox") filtered = filtered.filter((x) => !x.projectId);
    else filtered = filtered.filter((x) => x.projectId === projectFilter);
  }

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px" }} className="fi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 14 : 20, gap: 10 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 2 }}>Úkoly</h1>
          {!isMobile && <p style={{ color: t.text2, fontSize: 13 }}>Všechny úkoly napříč projekty</p>}
        </div>
        {!isMobile && <ViewToggle view={view} setView={setView} />}
      </div>

      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <QuickAdd />
      </div>

      <div style={{ display: "flex", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 14 : 20, flexWrap: isMobile ? "nowrap" : "wrap", alignItems: "center", overflowX: isMobile ? "auto" : "visible", paddingBottom: isMobile ? 4 : 0 }}>
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          <FilterBtn label="Vše" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          {Object.entries(STATUSES).map(([k, v]) => (
            <FilterBtn key={k} label={v.label} active={statusFilter === k} color={v.color} onClick={() => setStatusFilter(k)} />
          ))}
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none", flexShrink: 0 }}
        >
          <option value="all">Všechny projekty</option>
          <option value="inbox">Inbox</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="mono" style={{ fontSize: 13, color: t.text3, marginLeft: "auto", flexShrink: 0 }}>
          {filtered.length} úkolů
        </span>
      </div>

      {filtered.length > 0 && (view === "list" && !isMobile) && <ListView taskList={filtered} showProject={true} />}
      {isMobile && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map((task) => <DashTaskCard key={task.id} task={task} />)}
        </div>
      )}
      {!isMobile && filtered.length > 0 && view !== "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {filtered.map((task) => (
            <DashTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3, background: t.card, borderRadius: 14, border: `1px dashed ${t.border}` }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 10 }}>{search || statusFilter !== "all" || projectFilter !== "all" ? "⌕" : "◇"}</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: t.text2 }}>
            {search || statusFilter !== "all" || projectFilter !== "all" ? "Žádné výsledky" : "Zatím žádné úkoly"}
          </div>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            {search ? `Zkus jiné hledání než „${search}"` : statusFilter !== "all" || projectFilter !== "all" ? "Zkus upravit filtry" : "Vytvoř svůj první úkol výše"}
          </div>
        </div>
      )}
    </div>
  );
}
