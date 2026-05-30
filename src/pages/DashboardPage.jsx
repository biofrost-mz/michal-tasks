import React, { useMemo, useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "../components/Icon.jsx";
import AIDailyPlan from "../components/AIDailyPlan.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import { formatDate, formatDateKey } from "../locale.js";
import { parseYMD, projectColor, startOfToday } from "../utils.js";
import { getNamedayInfo } from "../data/czechNamedays.js";
import { getSunTimes, getGreeting, getDayPhaseIcon } from "../data/sunCalc.js";
import { fetchWeather, hasWeatherApiKey } from "../data/weather.js";

const STATUS_TO_CLASS = { todo: "todo", doing: "doing", waiting: "wait", done: "done" };
const CLASS_TO_STATUS = { todo: "todo", doing: "doing", wait: "waiting", done: "done" };
const STATUS_SHORT = { todo: "Todo", doing: "Doing", wait: "Wait", done: "Done" };

const PRIORITY_META = {
  low: { label: "Nízká", glyph: "↓", color: "#60a5fa" },
  medium: { label: "Střední", glyph: "—", color: "#fbbf24" },
  high: { label: "Vysoká", glyph: "↑", color: "#f87171" },
};

function formatShortDue(dueDate) {
  if (!dueDate) return null;
  const d = parseYMD(dueDate);
  if (!d) return null;
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function mapTask(task, projectsById, tagsById, today) {
  const due = parseYMD(task.dueDate);
  const overdue = !!due && task.status !== "done" && due < today;
  const tagNames = (task.tagIds || [])
    .map((id) => tagsById.get(id)?.name)
    .filter(Boolean);

  return {
    id: task.id,
    title: task.title || "Bez názvu",
    desc: task.description || "",
    statusClass: STATUS_TO_CLASS[task.status] || "todo",
    status: task.status,
    priority: task.priority || "medium",
    due: formatShortDue(task.dueDate),
    overdue,
    tags: tagNames,
    starred: !!task.starred,
    hasSubtasks: Array.isArray(task.subtasks) ? task.subtasks.length : 0,
    project: task.projectId,
    projectName: task.projectId ? projectsById.get(task.projectId)?.name : null,
  };
}

function ProjectPill({ projectId, projectsById }) {
  if (!projectId) return null;
  const p = projectsById.get(projectId);
  if (!p) return null;
  return (
    <span className="proj-pill" style={{ "--proj-color": projectColor(projectId) }}>
      <span className="pp-dot" />
      {p.name}
    </span>
  );
}

function Tag({ name }) {
  return <span className="tag">{name}</span>;
}

function PrioChip({ priority }) {
  if (!priority || priority === "medium") return null;
  const m = PRIORITY_META[priority];
  if (!m) return null;
  return <span className="prio" style={{ "--prio-color": m.color }}>{m.glyph} {m.label}</span>;
}

function Stepper({ statusClass, onChange }) {
  const keys = ["todo", "doing", "wait", "done"];
  return (
    <div className="stepper">
      {keys.map((k) => (
        <button
          key={k}
          className={statusClass === k ? `cur ${k}` : ""}
          onClick={(e) => {
            e.stopPropagation();
            onChange(CLASS_TO_STATUS[k]);
          }}
          title={STATUS_SHORT[k]}
        >
          {STATUS_SHORT[k]}
        </button>
      ))}
    </div>
  );
}

function TaskCard({ task, onOpen, onStatusChange, onStar, projectsById }) {
  return (
    <div className={`tcard ${task.statusClass} ${task.overdue ? "alert" : ""}`} onClick={() => onOpen(task.id)}>
      <div
        className="tcard-state"
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(task.id, task.status === "done" ? "todo" : "done");
        }}
        title="Toggle hotovo"
      />
      <div className="tcard-body">
        <div className="tcard-title">{task.title}</div>
        {task.desc ? <div className="tcard-desc">{task.desc}</div> : null}
        <div className="tcard-meta">
          <ProjectPill projectId={task.project} projectsById={projectsById} />
          <PrioChip priority={task.priority} />
          {task.due ? <span className={`due ${task.overdue ? "overdue" : ""}`}>{task.overdue ? "⚠ " : ""}{task.due}</span> : null}
          {task.tags.map((tg) => <Tag key={tg} name={tg} />)}
          {task.hasSubtasks > 0 ? <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-3)" }}>≡ {task.hasSubtasks}</span> : null}
        </div>
      </div>
      <div className="tcard-acts" onClick={(e) => e.stopPropagation()}>
        <Stepper statusClass={task.statusClass} onChange={(s) => onStatusChange(task.id, s)} />
        <button className={`icon-btn star ${task.starred ? "on" : ""}`} onClick={() => onStar(task.id)} title="Top úkol">
          <Icon name="star" size={15} color="currentColor" strokeWidth={1.6} fill={task.starred ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

function Headline({ overdueCount, activeCount, totalCount, doneWeek, doneWeekAvg, addedToday, activeProjectsCount, doneProjectsCount, totalProjectsCount, streak }) {
  const now = new Date();
  const dayName = new Intl.DateTimeFormat("cs-CZ", { weekday: "long" }).format(now);
  const monthYear = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(now);
  const cw = getWeekNumber(now);

  // Dynamic data
  const { name: namedayName, isHoliday } = getNamedayInfo(now);
  const sunTimes = getSunTimes(now);
  const greeting = getGreeting();
  const dayPhase = getDayPhaseIcon(now);

  // Weather
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!hasWeatherApiKey()) return;
    fetchWeather().then(setWeather);
    const iv = setInterval(() => fetchWeather().then(setWeather), 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // Week comparison: percentage above/below average
  const weekDiff = doneWeekAvg > 0 ? Math.round(((doneWeek - doneWeekAvg) / doneWeekAvg) * 100) : 0;
  const weekDiffLabel = weekDiff > 0
    ? `+${weekDiff} % nad průměr`
    : weekDiff < 0
      ? `${weekDiff} % pod průměr`
      : "na průměru";

  // Timezone abbreviation
  const tzName = Intl.DateTimeFormat("cs-CZ", { timeZoneName: "short" }).formatToParts(now)
    .find((p) => p.type === "timeZoneName")?.value || "CET";

  return (
    <div className="headline">
      <div className="headline-top">
        <div>
          <div className="hl-greet">{greeting}, Michale</div>
          <div className="hl-row">
            <div className="hl-daynum">
              <div className="hl-day">{dayName}</div>
              <div className="hl-num">{now.getDate()}</div>
            </div>
            <div className="hl-meta">
              <span className="m-month">{monthYear}</span>
              <div>týden K{String(cw).padStart(2, "0")} · CW{String(cw).padStart(2, "0")}</div>
              <div>
                <span className="accent">{isHoliday ? "svátek:" : "jmeniny:"}</span> {namedayName}
              </div>
              {sunTimes && (
                <div className="m-row">
                  <Icon name="sunrise" size={11} color="currentColor" strokeWidth={1.5} /> svítání {sunTimes.sunrise}
                  <span style={{ margin: "0 6px", color: "var(--text-4)" }}>·</span>
                  <Icon name="sunset" size={11} color="currentColor" strokeWidth={1.5} /> soumrak {sunTimes.sunset}
                </div>
              )}
              {weather ? (
                <div className="m-row" style={{ marginTop: 4 }}>
                  <Icon name={weather.icon} size={11} color="var(--accent)" strokeWidth={1.5} />
                  <span>Počasí: {weather.temp} °C ({weather.label})</span>
                  <span style={{ margin: "0 6px", color: "var(--text-4)" }}>·</span>
                  <Icon name="wind" size={11} color="currentColor" strokeWidth={1.5} />
                  <span>{weather.wind} km/h</span>
                </div>
              ) : (
                <div className="m-row" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: "10.5px", color: "var(--text-4)" }}>Načítání počasí...</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hl-aside">
          <div className="hl-aside-row"><span className="hl-live-dot" />sync · právě teď</div>
          <div>{weather ? weather.city : "Brno"} · {tzName}{weather ? ` · ${weather.temp} °C` : ""}</div>
          <div>
            <span className="hl-svatek">
              {weather ? (
                <><Icon name={weather.icon} size={11} color="currentColor" strokeWidth={1.5} /> {weather.label}</>
              ) : (
                <><Icon name={dayPhase.icon} size={11} color="currentColor" strokeWidth={1.5} /> {dayPhase.label}</>
              )}
              {sunTimes ? ` · délka dne ${sunTimes.dayLength}` : ""}
            </span>
          </div>
        </div>
        {/* Mobile compact strip (visible only on mobile via CSS) */}
        <div className="hl-mob-strip">
          {weather && <span>{weather.temp}°C {weather.label}</span>}
          <span>{namedayName}</span>
          {sunTimes && <span>☀ {sunTimes.sunrise}–{sunTimes.sunset}</span>}
        </div>
      </div>

      <div className="hl-stats">
        <div className="hl-stat">
          <div className="hl-stat-l">Aktivní</div>
          <div className="hl-stat-v">{activeCount}</div>
          <div className="hl-stat-u">z {totalCount}{addedToday > 0 ? ` · ↗ +${addedToday} dnes` : ""}</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Po termínu</div>
          <div className="hl-stat-v" style={{ color: "var(--red)" }}>{overdueCount}</div>
          <div className="hl-stat-u" style={{ color: "var(--red)" }}>{overdueCount > 0 ? "⚠ vyřeš dnes" : "✓ vše ok"}</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Hotovo · týden</div>
          <div className="hl-stat-v" style={{ color: "var(--green)" }}>{doneWeek}</div>
          <div className="hl-stat-u" style={{ color: weekDiff >= 0 ? "var(--green)" : "var(--red)" }}>{weekDiffLabel}</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Streak 🔥</div>
          <div className="hl-stat-v" style={{ color: "var(--accent)" }}>{streak.current}</div>
          <div className="hl-stat-u">dní · best {streak.best}</div>
        </div>
        <div className="hl-stat">
          <div className="hl-stat-l">Projekty</div>
          <div className="hl-stat-v" style={{ color: "var(--blue)" }}>{activeProjectsCount}</div>
          <div className="hl-stat-u">z {totalProjectsCount} · {doneProjectsCount} hotový</div>
        </div>
      </div>
    </div>
  );
}

/** Local date → "YYYY-MM-DD" (timezone-safe, no UTC shift) */
function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildStreak(tasks) {
  const done = tasks.filter((t) => t.status === "done" && t.updatedAt);
  const dayMap = new Map();

  done.forEach((t) => {
    const d = new Date(t.updatedAt);
    d.setHours(0, 0, 0, 0);
    const key = localDateKey(d);
    dayMap.set(key, (dayMap.get(key) || 0) + 1);
  });

  const today = startOfToday();
  let current = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = localDateKey(d);
    if ((dayMap.get(key) || 0) > 0) current += 1;
    else break;
  }

  let best = 0;
  let run = 0;
  const days = [...dayMap.keys()].sort();
  if (days.length) {
    const start = new Date(days[0]);
    const end = today;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = localDateKey(d);
      if ((dayMap.get(key) || 0) > 0) {
        run += 1;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }
  }

  const weeks = [];
  const end = new Date(today);
  end.setDate(end.getDate() - ((end.getDay() + 6) % 7)); // Monday of current week
  for (let w = 11; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(end);
      dt.setDate(end.getDate() - w * 7 + d);
      const key = localDateKey(dt);
      const c = dayMap.get(key) || 0;
      const level = c >= 4 ? 4 : c >= 3 ? 3 : c >= 2 ? 2 : c >= 1 ? 1 : 0;
      week.push(level);
    }
    weeks.push(week);
  }

  return { current, best: Math.max(best, current), weeks };
}

function railSuggestion(task) {
  if (task.overdue) return "Prošvihl jsi termín a má rozjednané subtasky";
  if (task.priority === "high") return "Vysoká priorita, blokuje důležité navazující věci";
  if (task.status === "doing") return "Už je rozpracovaný, dokončení je nejrychlejší výhra";
  return "Má dobrý poměr dopad / čas, ideální na dnešní fokus";
}

function railWeight(task) {
  if (task.overdue) return "Akce dnes";
  if (task.priority === "high") return "Vysoká priorita";
  if (task.status === "doing") return "Focus";
  return "Momentum";
}

function scoreTask(task) {
  let s = 0;
  if (task.overdue) s += 100;
  if (task.priority === "high") s += 40;
  if (task.status === "doing") s += 20;
  if (task.starred) s += 15;
  if (task.hasSubtasks > 0) s += 5;
  return s;
}

const GROUP_LABELS = {
  status: "Výchozí (Stav)",
  project: "Projektu",
  priority: "Priority",
  dueDate: "Termínu",
};

const SORT_LABELS = {
  default: "Výchozí",
  dueDate: "Termínu",
  priority: "Priority",
  title: "Názvu",
};

export default function DashboardPage() {
  const {
    tasks,
    projects,
    notes,
    tags,
    addTask,
    updateTask,
    setTaskDetail,
    openProject,
    setPage,
    search,
    isMobile,
  } = useApp();

  const [filter, setFilter] = useState("all");
  const [quickText, setQuickText] = useState("");
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const [groupBy, setGroupBy] = useState("status"); // "status", "project", "priority", "dueDate"
  const [sortBy, setSortBy] = useState("default"); // "default", "dueDate", "priority", "title"
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [sortByOpen, setSortByOpen] = useState(false);

  const groupRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (groupRef.current && !groupRef.current.contains(e.target)) {
        setGroupByOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortByOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = startOfToday();
  const weekAgo = Date.now() - 7 * 86400000;

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsById = useMemo(() => new Map(tags.map((tg) => [tg.id, tg])), [tags]);

  const mappedTasks = useMemo(() => tasks.map((t) => mapTask(t, projectsById, tagsById, today)), [tasks, projectsById, tagsById, today]);

  const matchesSearch = (task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return task.title.toLowerCase().includes(s) || task.desc.toLowerCase().includes(s);
  };

  const activeTasks = mappedTasks.filter((t) => t.status !== "done");
  const overdue = activeTasks.filter((t) => t.overdue && matchesSearch(t));
  const doing = activeTasks.filter((t) => t.status === "doing" && !t.overdue && matchesSearch(t));
  const wait = activeTasks.filter((t) => t.status === "waiting" && matchesSearch(t));
  const todo = activeTasks.filter((t) => t.status === "todo" && matchesSearch(t));
  const starred = activeTasks.filter((t) => t.starred && matchesSearch(t));

  const streak = useMemo(() => buildStreak(tasks), [tasks]);
  const doneWeek = tasks.filter((t) => t.status === "done" && t.updatedAt > weekAgo).length;
  const activeProjects = projects.filter((p) => p.status === "active");
  const doneProjects = projects.filter((p) => p.status === "done");

  // Average weekly done over last 4 weeks (excluding current)
  const doneWeekAvg = useMemo(() => {
    const weeks = [1, 2, 3, 4].map((w) => {
      const from = Date.now() - (w + 1) * 7 * 86400000;
      const to = Date.now() - w * 7 * 86400000;
      return tasks.filter((t) => t.status === "done" && t.updatedAt > from && t.updatedAt <= to).length;
    });
    const sum = weeks.reduce((a, b) => a + b, 0);
    return sum / weeks.length;
  }, [tasks]);

  // Tasks added today
  const todayStart = today.getTime();
  const addedToday = tasks.filter((t) => t.createdAt && t.createdAt >= todayStart).length;

  const aiSuggestions = useMemo(
    () => activeTasks
      .filter(matchesSearch)
      .sort((a, b) => scoreTask(b) - scoreTask(a))
      .slice(0, 4),
    [activeTasks, search]
  );

  const counts = {
    todo: activeTasks.filter((t) => t.status === "todo").length,
    doing: activeTasks.filter((t) => t.status === "doing").length,
    waiting: activeTasks.filter((t) => t.status === "waiting").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const setStatus = (id, status) => updateTask(id, { status });
  const toggleStar = (id) => {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;
    updateTask(id, { starred: !current.starred });
  };

  const show = (k) => groupBy !== "status" || filter === "all" || filter === "starred" || filter === k;

  const tasksToDisplay = useMemo(() => {
    let list = [...activeTasks];

    // Apply main filter
    if (filter === "overdue") {
      list = list.filter((t) => t.overdue);
    } else if (filter === "doing") {
      list = list.filter((t) => t.status === "doing" && !t.overdue);
    } else if (filter === "wait") {
      list = list.filter((t) => t.status === "waiting");
    } else if (filter === "todo") {
      list = list.filter((t) => t.status === "todo");
    } else if (filter === "starred") {
      list = list.filter((t) => t.starred);
    }

    // Apply Search filter
    list = list.filter(matchesSearch);

    // Apply Sorting
    if (sortBy === "dueDate") {
      list.sort((a, b) => {
        if (!a.due && !b.due) return 0;
        if (!a.due) return 1;
        if (!b.due) return -1;
        const dA = parseYMD(tasks.find(tk => tk.id === a.id)?.dueDate);
        const dB = parseYMD(tasks.find(tk => tk.id === b.id)?.dueDate);
        if (!dA && !dB) return 0;
        if (!dA) return 1;
        if (!dB) return -1;
        return dA - dB;
      });
    } else if (sortBy === "priority") {
      const prioWeight = { high: 3, medium: 2, low: 1 };
      list.sort((a, b) => (prioWeight[b.priority] || 2) - (prioWeight[a.priority] || 2));
    } else if (sortBy === "title") {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      list.sort((a, b) => scoreTask(b) - scoreTask(a));
    }

    return list;
  }, [activeTasks, filter, sortBy, search, tasks]);

  const groupedByProject = useMemo(() => {
    const groups = {};
    const noProjectTasks = [];

    tasksToDisplay.forEach((t) => {
      if (t.project) {
        if (!groups[t.project]) groups[t.project] = [];
        groups[t.project].push(t);
      } else {
        noProjectTasks.push(t);
      }
    });

    const result = [];
    projects.forEach((proj) => {
      if (groups[proj.id] && groups[proj.id].length > 0) {
        result.push({
          id: proj.id,
          title: proj.name,
          items: groups[proj.id],
          marker: "doing",
          customColor: projectColor(proj.id)
        });
      }
    });

    if (noProjectTasks.length > 0) {
      result.push({
        id: "no-project",
        title: "Bez projektu",
        items: noProjectTasks,
        marker: "todo",
        customColor: "var(--text-3)"
      });
    }

    return result;
  }, [tasksToDisplay, projects]);

  const groupedByPriority = useMemo(() => {
    const groups = { high: [], medium: [], low: [] };
    tasksToDisplay.forEach((t) => {
      const p = t.priority || "medium";
      if (groups[p]) groups[p].push(t);
    });

    return [
      { id: "high", title: "Vysoká priorita", items: groups.high, marker: "alert", customColor: "#f87171" },
      { id: "medium", title: "Střední priorita", items: groups.medium, marker: "wait", customColor: "#fbbf24" },
      { id: "low", title: "Nízká priorita", items: groups.low, marker: "todo", customColor: "#60a5fa" }
    ].filter(g => g.items.length > 0);
  }, [tasksToDisplay]);

  const groupedByDueDate = useMemo(() => {
    const today = startOfToday();
    const todayStr = formatDateKey(today);
    const tomorrow = new Date(today.getTime() + 86400000);
    const tomorrowStr = formatDateKey(tomorrow);
    
    const sunday = new Date(today);
    const currentDay = today.getDay();
    const daysToSunday = currentDay === 0 ? 0 : 7 - currentDay;
    sunday.setDate(today.getDate() + daysToSunday);
    sunday.setHours(23, 59, 59, 999);

    const groups = {
      overdue: [],
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      noDue: []
    };

    tasksToDisplay.forEach((t) => {
      if (!t.due) {
        groups.noDue.push(t);
        return;
      }
      
      const d = parseYMD(tasks.find(tk => tk.id === t.id)?.dueDate);
      if (!d) {
        groups.noDue.push(t);
        return;
      }

      const dStr = formatDateKey(d);
      if (t.overdue) {
        groups.overdue.push(t);
      } else if (dStr === todayStr) {
        groups.today.push(t);
      } else if (dStr === tomorrowStr) {
        groups.tomorrow.push(t);
      } else if (d <= sunday) {
        groups.thisWeek.push(t);
      } else {
        groups.later.push(t);
      }
    });

    return [
      { id: "overdue", title: "Po termínu", items: groups.overdue, marker: "alert", customColor: "var(--red)" },
      { id: "today", title: "Dnes", items: groups.today, marker: "doing", customColor: "var(--blue)" },
      { id: "tomorrow", title: "Zítra", items: groups.tomorrow, marker: "wait", customColor: "var(--orange)" },
      { id: "thisWeek", title: "Tento týden", items: groups.thisWeek, marker: "todo", customColor: "#8b5cf6" },
      { id: "later", title: "Později", items: groups.later, marker: "todo", customColor: "var(--text-3)" },
      { id: "noDue", title: "Bez termínu", items: groups.noDue, marker: "todo", customColor: "var(--text-4)" }
    ].filter(g => g.items.length > 0);
  }, [tasksToDisplay, tasks]);

  const sec = (key, title, items, marker, alert = false, customColor = null) => {
    let displayItems = items;
    if (groupBy === "status" && filter === "starred") {
      displayItems = items.filter((t) => t.starred);
    }
    if (!displayItems.length || !show(key)) return null;

    const isExpanded = !!expandedSections[key];
    const visibleItems = isExpanded ? displayItems : displayItems.slice(0, 3);
    const hasMore = displayItems.length > 3;

    return (
      <section className="sec" key={key}>
        <div className="sec-head">
          <span className={`sec-marker ${marker}`} />
          <span className={`sec-title ${alert ? "alert" : ""}`}>{title}</span>
          <span className="sec-count">{displayItems.length}</span>
          <span className="sec-sep" />
          {hasMore ? (
            <span
              className="sec-act"
              style={{ cursor: "pointer", userSelect: "none" }}
              onClick={() => setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))}
            >
              {isExpanded ? "Zobrazit méně ▴" : `+${displayItems.length - 3} dalších ▾`}
            </span>
          ) : null}
        </div>
        <div className="tcards">
          {visibleItems.map((t) => (
            <TaskCard key={t.id} task={t} onOpen={setTaskDetail} onStatusChange={setStatus} onStar={toggleStar} projectsById={projectsById} />
          ))}
        </div>
      </section>
    );
  };

  const onQuickAdd = (e) => {
    if (e.key !== "Enter") return;
    const title = quickText.trim();
    if (!title) return;
    addTask({ title });
    setQuickText("");
  };

  const recentNotes = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 4);

  const total = counts.todo + counts.doing + counts.waiting + counts.done;
  const donutSegs = [
    { k: "doing", color: "#3b82f6", v: counts.doing, lab: "Rozpracováno" },
    { k: "wait", color: "#fb923c", v: counts.waiting, lab: "Čekám" },
    { k: "todo", color: "#8b8f9c", v: counts.todo, lab: "To do" },
    { k: "done", color: "#22c55e", v: counts.done, lab: "Hotovo" },
  ];

  let donutAcc = 0;
  const donutR = 40;
  const donutC = 2 * Math.PI * donutR;

  return (
    <div className="content">
      <Headline
        overdueCount={overdue.length}
        activeCount={activeTasks.length}
        totalCount={tasks.length}
        doneWeek={doneWeek}
        doneWeekAvg={doneWeekAvg}
        addedToday={addedToday}
        activeProjectsCount={activeProjects.length}
        doneProjectsCount={doneProjects.length}
        totalProjectsCount={projects.length}
        streak={streak}
      />

      <div className="work">
        <div>
          {/* AI hero — collapsible on mobile */}
          {isMobile && !aiExpanded ? (
            <button
              className="ai-hero"
              onClick={() => setAiExpanded(true)}
              style={{ cursor: "pointer", width: "100%", textAlign: "left" }}
            >
              <div className="ai-orb" style={{ fontSize: 16 }}>✦</div>
              <div style={{ flex: 1 }}>
                <div className="ai-text-h" style={{ fontSize: 14 }}>
                  <span className="num">{aiSuggestions.length}</span> návrhů pro dnešek
                </div>
                <div className="ai-text-sub" style={{ fontSize: 11 }}>
                  {activeTasks.length} aktivních · {overdue.length} po termínu · tap pro detail
                </div>
              </div>
              <Icon name="chevron-down" size={16} color="var(--text-3)" strokeWidth={2} />
            </button>
          ) : (
            <>
              <div className="ai-hero">
                <div className="ai-orb">✦</div>
                <div>
                  <div className="ai-text-h">
                    Mám pro tebe <span className="num">{aiSuggestions.length}</span> návrhů, jak začít dnešní den.
                  </div>
                  <div className="ai-text-sub">
                    {activeTasks.length} aktivních · {overdue.length} po termínu · streak {streak.current} dní · Gemini 2.0
                  </div>
                </div>
                <button className="ai-act" onClick={() => setShowDailyPlan((p) => !p)}>
                  <Icon name="zap" size={13} color="currentColor" strokeWidth={1.9} />
                  {showDailyPlan ? "Skrýt plán" : "Vygenerovat plán"}
                </button>
                {isMobile && (
                  <button onClick={() => setAiExpanded(false)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--text-3)", padding: 4 }}>
                    <Icon name="chevron-up" size={14} color="currentColor" strokeWidth={2} />
                  </button>
                )}
              </div>

              {showDailyPlan && (
                <div className="fi" style={{ marginBottom: 18 }}>
                  <AIDailyPlan />
                </div>
              )}

              <div className="aisug">
                {aiSuggestions.map((t, i) => (
                  <div key={t.id} className="aisug-card" onClick={() => setTaskDetail(t.id)}>
                    <span className="aisug-num">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <div className="aisug-title">{t.title}</div>
                      <div className="aisug-reason">{railSuggestion(t)}</div>
                    </div>
                    <span className="aisug-tag">{railWeight(t)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginBottom: 18 }}>
            <QuickAdd />
          </div>

          <div className="chips">
            <span className={`chip ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
              <span className="chip-dot" style={{ background: "var(--text-2)" }} /> Vše <span className="chip-count">{activeTasks.length}</span>
            </span>
            <span className={`chip ${filter === "overdue" ? "active" : ""}`} onClick={() => setFilter("overdue")}>
              <span className="chip-dot" style={{ background: "var(--red)" }} /> Po termínu <span className="chip-count">{overdue.length}</span>
            </span>
            <span className={`chip ${filter === "doing" ? "active" : ""}`} onClick={() => setFilter("doing")}>
              <span className="chip-dot" style={{ background: "var(--blue)" }} /> Rozpracováno <span className="chip-count">{doing.length}</span>
            </span>
            <span className={`chip ${filter === "wait" ? "active" : ""}`} onClick={() => setFilter("wait")}>
              <span className="chip-dot" style={{ background: "var(--orange)" }} /> Čekám <span className="chip-count">{wait.length}</span>
            </span>
            <span className={`chip ${filter === "todo" ? "active" : ""}`} onClick={() => setFilter("todo")}>
              <span className="chip-dot" style={{ background: "var(--gray)" }} /> To do <span className="chip-count">{todo.length}</span>
            </span>
            <span className={`chip ${filter === "starred" ? "active" : ""}`} onClick={() => setFilter("starred")} style={{ cursor: "pointer" }}>
              <span className="chip-dot" style={{ background: "var(--accent)" }} /> Top úkoly <span className="chip-count">{starred.length}</span>
            </span>
            <span style={{ position: "relative" }} ref={groupRef}>
              <span className={`chip ${groupBy !== "status" ? "active" : ""}`} onClick={() => setGroupByOpen(!groupByOpen)}>
                Seskupit: {GROUP_LABELS[groupBy]} ▾
              </span>
              {groupByOpen && (
                <div className="pop" style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow)",
                  zIndex: 200,
                  minWidth: 180,
                  padding: "6px"
                }}>
                  {Object.entries(GROUP_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => { setGroupBy(k); setGroupByOpen(false); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: groupBy === k ? "var(--accent-soft)" : "transparent",
                        color: groupBy === k ? "var(--accent)" : "var(--text-2)",
                        fontSize: 13,
                        fontWeight: groupBy === k ? 600 : 400,
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => { if (groupBy !== k) e.currentTarget.style.background = "var(--card-h)"; }}
                      onMouseLeave={(e) => { if (groupBy !== k) e.currentTarget.style.background = "transparent"; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </span>

            <span style={{ position: "relative" }} ref={sortRef}>
              <span className={`chip ${sortBy !== "default" ? "active" : ""}`} onClick={() => setSortByOpen(!sortByOpen)}>
                Řadit podle: {SORT_LABELS[sortBy]} ▾
              </span>
              {sortByOpen && (
                <div className="pop" style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow)",
                  zIndex: 200,
                  minWidth: 180,
                  padding: "6px"
                }}>
                  {Object.entries(SORT_LABELS).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => { setSortBy(k); setSortByOpen(false); }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        border: "none",
                        background: sortBy === k ? "var(--accent-soft)" : "transparent",
                        color: sortBy === k ? "var(--accent)" : "var(--text-2)",
                        fontSize: 13,
                        fontWeight: sortBy === k ? 600 : 400,
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                      onMouseEnter={(e) => { if (sortBy !== k) e.currentTarget.style.background = "var(--card-h)"; }}
                      onMouseLeave={(e) => { if (sortBy !== k) e.currentTarget.style.background = "transparent"; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </span>
          </div>

          {groupBy === "status" && (
            <>
              {sec("overdue", "Po termínu", tasksToDisplay.filter(t => t.overdue), "alert", true)}
              {sec("doing", "Rozpracováno", tasksToDisplay.filter(t => t.status === "doing" && !t.overdue), "doing")}
              {sec("wait", "Čekám", tasksToDisplay.filter(t => t.status === "waiting"), "wait")}
              {sec("todo", "To do", tasksToDisplay.filter(t => t.status === "todo"), "todo")}
            </>
          )}

          {groupBy === "project" && (
            <>
              {groupedByProject.map((g) => sec(g.id, g.title, g.items, g.marker, false, g.customColor))}
            </>
          )}

          {groupBy === "priority" && (
            <>
              {groupedByPriority.map((g) => sec(g.id, g.title, g.items, g.marker, false, g.customColor))}
            </>
          )}

          {groupBy === "dueDate" && (
            <>
              {groupedByDueDate.map((g) => sec(g.id, g.title, g.items, g.marker, g.id === "overdue", g.customColor))}
            </>
          )}
        </div>

        <aside className="rail">
          <div className="rail-card">
            <div className="rail-h"><span className="rail-h-t">Stav úkolů</span><span className="rail-h-a">{total} celkem</span></div>
            <div className="donut-block">
              <div className="donut">
                <svg width="96" height="96">
                  <circle cx="48" cy="48" r={donutR} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
                  {donutSegs.map((s) => {
                    const frac = total ? s.v / total : 0;
                    const dasharray = `${frac * donutC} ${donutC}`;
                    const dashoffset = -donutAcc * donutC;
                    donutAcc += frac;
                    return (
                      <circle
                        key={s.k}
                        cx="48"
                        cy="48"
                        r={donutR}
                        fill="none"
                        stroke={s.color}
                        strokeWidth="9"
                        strokeDasharray={dasharray}
                        strokeDashoffset={dashoffset}
                        strokeLinecap="butt"
                      />
                    );
                  })}
                </svg>
                <div className="donut-center">
                  <div className="donut-num">{activeTasks.length}</div>
                  <div className="donut-sub">aktivních</div>
                </div>
              </div>
              <div className="donut-legend">
                {donutSegs.map((s) => (
                  <div key={s.k} className="donut-leg-row">
                    <span className="donut-leg-dot" style={{ background: s.color }} />
                    <span className="donut-leg-label">{s.lab}</span>
                    <span className="donut-leg-val">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rail-card">
            <div className="rail-h"><span className="rail-h-t">Streak</span><span className="rail-h-a">{Math.floor(streak.current / 7)} týdnů ↓</span></div>
            <div className="streak-ring">
              <div className="streak-circle">
                <svg width="96" height="96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--surface-3)" strokeWidth="6" />
                  <circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray={`${(Math.min(streak.current, 7) / 7) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`} strokeLinecap="round" />
                </svg>
                <div className="streak-center">
                  <div className="streak-c-num">{streak.current}</div>
                  <div className="streak-c-sub">dní</div>
                </div>
              </div>
              <div className="streak-meta-col">
                <div className="streak-meta-r"><span className="streak-meta-r-k">best</span><span className="streak-meta-r-v gold">{streak.best} 🔥</span></div>
                <div className="streak-meta-r"><span className="streak-meta-r-k">týden</span><span className="streak-meta-r-v">{Math.min(streak.current, 7)} / 7</span></div>
                <div className="streak-meta-r"><span className="streak-meta-r-k">měsíc</span><span className="streak-meta-r-v">{Math.min(streak.current, 31)}</span></div>
              </div>
            </div>
            <div className="streak-grid">
              {streak.weeks.map((w, i) => (
                <div key={i} className="streak-col">
                  {w.map((d, j) => <div key={j} className={`streak-cell ${d ? `l${d}` : ""}`} />)}
                </div>
              ))}
            </div>
          </div>

          <div className="rail-card">
            <div className="rail-h"><span className="rail-h-t">Progres projektů</span><span className="rail-h-a" onClick={() => setPage("projects")}>vše →</span></div>
            {activeProjects.slice(0, 8).map((p) => {
              const pTasks = tasks.filter((t) => t.projectId === p.id);
              const openCount = pTasks.filter((t) => t.status !== "done").length;
              const doneCount = pTasks.filter((t) => t.status === "done").length;
              const progress = pTasks.length ? Math.round((doneCount / pTasks.length) * 100) : 0;
              const color = projectColor(p.id);
              return (
                <div key={p.id} className="pr-row" onClick={() => openProject(p.id)}>
                  <div className="pr-top">
                    <span className="pr-dot" style={{ background: color }} />
                    <span className="pr-name">{p.name}</span>
                    <span className="pr-pct">{progress}%</span>
                  </div>
                  <div className="pr-bar"><div className="pr-bar-fill" style={{ width: `${progress}%`, background: color }} /></div>
                  <div className="pr-sub">{openCount} otev. · {doneCount} hot.</div>
                </div>
              );
            })}
          </div>

          <div className="rail-card">
            <div className="rail-h"><span className="rail-h-t">Nedávné poznámky</span><span className="rail-h-a" onClick={() => setPage("notes")}>vše →</span></div>
            {recentNotes.map((n) => {
              const excerpt = (n.content || "").replace(/[#*_`\n-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
              return (
                <div key={n.id} className="note-row" onClick={() => { setPage("notes"); }}>
                  <div className="note-t">{n.title || "Bez názvu"}</div>
                  <div className="note-x">{excerpt || "Bez textu"}</div>
                  <div className="note-m">
                    {formatDate(n.updatedAt, { day: "numeric", month: "numeric" })}
                    {n.primaryProjectId ? ` · ${projectsById.get(n.primaryProjectId)?.name || ""}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
