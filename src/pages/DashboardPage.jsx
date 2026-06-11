import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useApp } from "../context/AppContext.jsx";
import Icon from "../components/Icon.jsx";
import AIDailyPlan from "../components/AIDailyPlan.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import GettingStartedCard from "../components/GettingStartedCard.jsx";
import { formatDate, formatDateKey } from "../locale.js";
import { parseYMD, projectColor, startOfToday, triggerConfettiBurst } from "../utils.js";
import { getNamedayInfo } from "../data/czechNamedays.js";
import { getSunTimes, getGreeting } from "../data/sunCalc.js";
import { fetchWeather } from "../data/weather.js";
import { useCountUp } from "../hooks/useCountUp.js";
import {
  mapTaskForAtlas,
  ProjectPill,
  PrioChip,
  Stepper,
  TagPill,
} from "../components/atlas/AtlasTaskCard.jsx";

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}


function TaskCard({ task, onOpen, onStatusChange, onStar, projectsById }) {
  return (
    <div className={`tcard ${task.statusClass} ${task.overdue ? "alert" : ""}`} onClick={() => onOpen(task.id)}>
      <div
        className="tcard-state"
        onClick={(e) => {
          e.stopPropagation();
          const nextStatus = task.status === "done" ? "todo" : "done";
          if (nextStatus === "done") triggerConfettiBurst(e);
          onStatusChange(task.id, nextStatus);
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
          {task.tags.map((tg) => <TagPill key={tg} name={tg} />)}
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

function Headline({ userName, overdueCount, activeCount, totalCount, doneWeek, doneWeekAvg, addedToday, activeProjectsCount, doneProjectsCount, totalProjectsCount, streak, navigateToTasks, setPage, doneTodayCount }) {
  const activeCountAnim = useCountUp(activeCount);
  const overdueCountAnim = useCountUp(overdueCount);
  const doneWeekAnim = useCountUp(doneWeek);
  const streakCurrentAnim = useCountUp(streak.current);
  const activeProjectsCountAnim = useCountUp(activeProjectsCount);
  const doneTodayCountAnim = useCountUp(doneTodayCount);
  const now = new Date();
  const dayName = new Intl.DateTimeFormat("cs-CZ", { weekday: "long" }).format(now);
  const monthYear = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(now);
  const cw = getWeekNumber(now);

  // Dynamic data
  const { name: namedayName } = getNamedayInfo(now);
  const sunTimes = getSunTimes(now);
  const greeting = getGreeting();

  // Weather — podle polohy uživatele (s opt-in geolokací), fallback Brno.
  // Open-Meteo funguje i bez API klíče, takže počasí naběhne vždy.
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const load = (lat, lng) =>
      fetchWeather(lat, lng).then((w) => { if (!cancelled) setWeather(w); }).catch(() => {});
    const readCoords = () => {
      try { return JSON.parse(localStorage.getItem("mt:coords") || "null"); } catch { return null; }
    };

    const saved = readCoords();
    if (saved && typeof saved.lat === "number") {
      load(saved.lat, saved.lng);
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          try { localStorage.setItem("mt:coords", JSON.stringify(c)); } catch { /* ignore */ }
          load(c.lat, c.lng);
        },
        () => load(),                       // odmítnuto / chyba → výchozí poloha
        { timeout: 8000, maximumAge: 30 * 60 * 1000 }
      );
    } else {
      load();
    }

    const iv = setInterval(() => {
      const c = readCoords();
      if (c && typeof c.lat === "number") load(c.lat, c.lng); else load();
    }, 15 * 60 * 1000);
    return () => { cancelled = true; clearInterval(iv); };
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
          <div className="hl-greet">{greeting}{userName ? `, ${userName}` : ""}</div>
          <div className="hl-row">
            <div className="hl-daynum">
              <div className="hl-day">{dayName}</div>
              <div className="hl-num">{now.getDate()}</div>
            </div>
            <div className="hl-meta">
              <span className="m-month">{monthYear}</span>
              <div>týden K{String(cw).padStart(2, "0")} · CW{String(cw).padStart(2, "0")}</div>
              <div>
                <span className="accent">Svátek:</span> {namedayName}
              </div>
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
          <div className="hl-aside-row" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}><span className="hl-live-dot" />sync · právě teď</div>
          <div style={{ color: "var(--text-2)" }}>{weather ? weather.city : "Brno"} · {tzName}{weather ? ` · ${weather.temp} °C` : ""}</div>
          {sunTimes && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
              color: "var(--text-3)",
              fontSize: 11,
              marginTop: 8
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="sunrise" size={11} color="var(--accent)" strokeWidth={1.5} />
                <span>Svítání: {sunTimes.sunrise}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="sunset" size={11} color="var(--accent)" strokeWidth={1.5} />
                <span>Soumrak: {sunTimes.sunset}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="sun" size={11} color="var(--accent)" strokeWidth={1.5} />
                <span>Délka dne: {sunTimes.dayLength}</span>
              </div>
            </div>
          )}
        </div>
        {/* Mobile compact strip (visible only on mobile via CSS) */}
        <div className="hl-mob-strip">
          {weather && <span>{weather.temp}°C {weather.label}</span>}
          {weather && <span>💨 {weather.wind} km/h</span>}
          <span>{namedayName}</span>
          {sunTimes && <span>☀ {sunTimes.sunrise}–{sunTimes.sunset}</span>}
        </div>
      </div>

      <div className="hl-stats">
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{ "--i": 0 }}
          title="Zobrazit úkoly"
        >
          <div className="hl-stat-l">Aktivní</div>
          <div className="hl-stat-v">{activeCountAnim}</div>
          <div className="hl-stat-u">z {totalCount}{addedToday > 0 ? ` · ↗ +${addedToday} dnes` : ""}</div>
        </div>
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("all")}
          style={{ "--i": 1 }}
          title="Zobrazit úkoly po termínu"
        >
          <div className="hl-stat-l">Po termínu</div>
          <div className="hl-stat-v" style={{ color: "var(--red)" }}>{overdueCountAnim}</div>
          <div className="hl-stat-u" style={{ display: "flex", alignItems: "center", gap: 4, color: overdueCount > 0 ? "var(--red)" : "var(--green)" }}>
            {overdueCount > 0 ? (
              <>
                <span className="hl-live-dot-red" />
                <Icon name="alert-triangle" size={11} color="var(--red)" strokeWidth={2} />
                <span>vyřeš dnes</span>
              </>
            ) : (
              <>
                <Icon name="check-circle" size={11} color="var(--green)" strokeWidth={2} />
                <span>vše ok</span>
              </>
            )}
          </div>
        </div>
        <div
          className="hl-stat"
          onClick={() => navigateToTasks("done")}
          style={{ "--i": 2 }}
          title="Zobrazit dokončené úkoly"
        >
          <div className="hl-stat-l">Hotovo · týden</div>
          <div className="hl-stat-v" style={{ color: "var(--green)" }}>{doneWeekAnim}</div>
          <div className="hl-stat-u" style={{ color: weekDiff >= 0 ? "var(--green)" : "var(--red)" }}>{weekDiffLabel}</div>
        </div>
        <div className="hl-stat" style={{ "--i": 3, cursor: "default" }}>
          <div className="hl-stat-l">Streak 🔥</div>
          <div className="hl-stat-v" style={{ color: "var(--accent)" }}>{streakCurrentAnim}</div>
          <div className="hl-stat-u">dní · best {streak.best}</div>
        </div>
        <div className="hl-stat" onClick={() => setPage("projects")} style={{ "--i": 4 }} title="Přejít na projekty">
          <div className="hl-stat-l">Projekty</div>
          <div className="hl-stat-v" style={{ color: "var(--blue)" }}>{activeProjectsCountAnim}</div>
          <div className="hl-stat-u">z {totalProjectsCount} · {doneProjectsCount} hotový</div>
        </div>
        <div className="hl-stat" style={{ "--i": 5, cursor: "default" }} title="Úkoly dokončené dnes">
          <div className="hl-stat-l">Dnes hotovo</div>
          <div className="hl-stat-v" style={{ color: "var(--green)" }}>{doneTodayCountAnim}</div>
          <div className="hl-stat-u">dnes{doneTodayCount > 0 ? " ↑" : ""}</div>
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
  // Počítáme den DOKONČENÍ (completedAt), ne poslední úpravy — editace starého
  // hotového úkolu jinak omylem posunula sérii. Fallback na updatedAt kvůli
  // starším úkolům bez completedAt.
  const done = tasks.filter((t) => t.status === "done" && (t.completedAt || t.updatedAt));
  const dayMap = new Map();

  done.forEach((t) => {
    const d = new Date(t.completedAt || t.updatedAt);
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
      week.push({ level, date: dt, count: c });
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
    updateTask,
    setTaskDetail,
    openProject,
    setPage,
    search,
    isMobile,
    setTasksPageFilter,
    userId,
    workspaceMembers,
  } = useApp();

  // Jméno přihlášeného uživatele pro pozdrav (ne natvrdo)
  const firstName = useMemo(() => {
    const me = workspaceMembers?.find((m) => m.userId === userId);
    const raw = (me?.displayName || me?.email || "").trim();
    if (!raw) return "";
    const first = raw.split(/[\s@.]+/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  }, [workspaceMembers, userId]);

  const [filter, setFilter] = useState("all");
  const [showDailyPlan, setShowDailyPlan] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [hoveredDay, setHoveredDay] = useState(null);
  const [showAiTasks, setShowAiTasks] = useState(!isMobile);

  const groupBy = "status";
  const [sortBy, setSortBy] = useState("default"); // "default", "dueDate", "priority", "title"
  const [sortByOpen, setSortByOpen] = useState(false);

  const sortRef = useRef(null);

  const navigateToTasks = (statusFilter) => {
    setTasksPageFilter(statusFilter);
    setPage("tasks");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortByOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [metricsNow] = useState(() => Date.now());
  const today = startOfToday();
  const weekAgo = metricsNow - 7 * 86400000;

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const tagsById = useMemo(() => new Map(tags.map((tg) => [tg.id, tg])), [tags]);

  const mappedTasks = useMemo(() => tasks.map((t) => mapTaskForAtlas(t, projectsById, tagsById, today)), [tasks, projectsById, tagsById, today]);

  const matchesSearch = useCallback((task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return task.title.toLowerCase().includes(s) || task.desc.toLowerCase().includes(s);
  }, [search]);

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
      const from = metricsNow - (w + 1) * 7 * 86400000;
      const to = metricsNow - w * 7 * 86400000;
      return tasks.filter((t) => t.status === "done" && t.updatedAt > from && t.updatedAt <= to).length;
    });
    const sum = weeks.reduce((a, b) => a + b, 0);
    return sum / weeks.length;
  }, [tasks, metricsNow]);

  // Tasks added today
  const todayStart = today.getTime();
  const addedToday = tasks.filter((t) => t.createdAt && t.createdAt >= todayStart).length;
  const doneTodayCount = tasks.filter((t) => t.status === "done" && t.updatedAt >= todayStart).length;

  const aiSuggestions = useMemo(
    () => activeTasks
      .filter(matchesSearch)
      .sort((a, b) => scoreTask(b) - scoreTask(a))
      .slice(0, 4),
    [activeTasks, matchesSearch]
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
  }, [activeTasks, filter, sortBy, matchesSearch, tasks]);

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
          <span className={`sec-marker ${marker}`} style={customColor ? { background: customColor } : undefined} />
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
    <div className="content dashboard-content">
      <Headline
        userName={firstName}
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
        navigateToTasks={navigateToTasks}
        setPage={setPage}
        doneTodayCount={doneTodayCount}
      />

      {tasks.length === 0 && projects.length === 0 && (
        <div
          style={{
            margin: "4px 0 18px", padding: "22px 24px",
            background: "linear-gradient(135deg, var(--accent-soft), var(--bg-2))",
            border: "1px solid var(--border)", borderRadius: 16,
          }}
        >
          <div style={{ fontFamily: "var(--font-display, inherit)", fontSize: 19, fontWeight: 700, marginBottom: 4 }}>
            Vítej{firstName ? `, ${firstName}` : ""}! Pojďme to rozjet 👋
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 18, maxWidth: 560 }}>
            Appka funguje nejlíp, když má s čím pracovat. Stačí tři kroky a Přehled se zaplní životem.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
            {[
              ["01", "Založ projekt", "Seskup související úkoly pod jeden cíl."],
              ["02", "Přidej úkoly", "Termín, priorita, podúkoly — nebo ⌘K."],
              ["03", "Nech AI naplánovat den", "Doporučí, čím začít podle priorit."],
            ].map(([n, h, d]) => (
              <div key={n} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)", fontSize: 13, marginBottom: 6 }}>{n}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{h}</div>
                <div style={{ color: "var(--text-3)", fontSize: 12.5, lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ai-act" onClick={() => setPage("projects")}>Vytvořit první projekt</button>
            <button
              className="ai-act"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text)" }}
              onClick={() => setPage("tasks")}
            >
              Přidat úkol
            </button>
          </div>
        </div>
      )}

      <div className="work">
        <div>
          <GettingStartedCard />
          {/* AI hero — desktop and mobile */}
          <div className="ai-hero">
            <div className="ai-orb">✦</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ai-text-h">
                {aiSuggestions.length === 0
                  ? <>Žádné akutní úkoly — užij si klidný den. ✨</>
                  : <>Mám pro tebe <span className="num">{aiSuggestions.length}</span> {aiSuggestions.length === 1 ? "návrh" : aiSuggestions.length <= 4 ? "návrhy" : "návrhů"}, jak začít dnešní den.</>}
              </div>
              <div className="ai-text-sub">
                {activeTasks.length} aktivních · {overdue.length} po termínu · streak {streak.current} dní · Gemini 2.0
              </div>
            </div>
            <div style={{ gridColumn: isMobile ? "1 / -1" : "auto", display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, width: isMobile ? "100%" : "auto" }}>
              <button className="ai-act" onClick={() => setShowDailyPlan((p) => !p)} style={isMobile ? { width: "100%", margin: 0, justifyContent: "center" } : undefined}>
                <Icon name="zap" size={13} color="currentColor" strokeWidth={1.9} />
                {showDailyPlan ? "Skrýt plán" : "Vygenerovat plán"}
              </button>
              {isMobile && aiSuggestions.length > 0 && (
                <button className="ai-act" onClick={() => setShowAiTasks((p) => !p)} style={{ width: "100%", margin: 0, justifyContent: "center", background: "var(--surface)", border: "1px solid var(--border-soft)", color: "var(--text-2)" }}>
                  <Icon name={showAiTasks ? "eye-off" : "eye"} size={13} color="currentColor" strokeWidth={1.9} />
                  {showAiTasks ? "Skrýt návrhy úkolů" : `Zobrazit návrhy úkolů (${aiSuggestions.length})`}
                </button>
              )}
            </div>
          </div>

          {showDailyPlan && (
            <div className="fi" style={{ marginBottom: 18 }}>
              <AIDailyPlan />
            </div>
          )}

          {aiSuggestions.length > 0 && showAiTasks && (
            <div className="aisug" style={{ marginBottom: isMobile ? 12 : 22 }}>
              {aiSuggestions.map((t, i) => (
                <div key={t.id} className="aisug-card" onClick={() => setTaskDetail(t.id)}>
                  <span className={`aisug-num${i === 0 ? " aisug-num-top" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <div className="aisug-title">{t.title}</div>
                    <div className="aisug-reason">{railSuggestion(t)}</div>
                  </div>
                  <span className="aisug-tag">{railWeight(t)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="dashboard-quickadd-host" style={{ marginBottom: 18 }}>
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

            {isMobile ? (
              <span className={`chip ${sortBy !== "default" ? "active" : ""}`} style={{ position: "relative", padding: 0, overflow: "hidden" }}>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    width: "100%",
                    height: "100%",
                    cursor: "pointer",
                    appearance: "none",
                    WebkitAppearance: "none",
                    zIndex: 10,
                  }}
                >
                  {Object.entries(SORT_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <span style={{ padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
                  Řadit podle: {SORT_LABELS[sortBy]} ▾
                </span>
              </span>
            ) : (
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
            )}
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
            <div className="rail-h">
              <span className="rail-h-t">Stav úkolů</span>
              <span
                className="rail-h-a"
                onClick={() => navigateToTasks("all")}
                style={{ cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "var(--accent)"}
                onMouseLeave={(e) => e.currentTarget.style.color = ""}
              >
                {total} celkem
              </span>
            </div>
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
                  <div
                    key={s.k}
                    className="donut-leg-row"
                    onClick={() => navigateToTasks(s.k)}
                    style={{
                      cursor: "pointer",
                      padding: "2px 4px",
                      borderRadius: 4,
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--surface-hover)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = ""}
                  >
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
                  {w.map((d, j) => (
                    <div
                      key={j}
                      className={`streak-cell ${d.level ? `l${d.level}` : ""}`}
                      onMouseEnter={() => setHoveredDay(d)}
                      onMouseLeave={() => setHoveredDay(null)}
                      style={{
                        cursor: "pointer",
                        transform: hoveredDay?.date?.getTime() === d.date?.getTime() ? "scale(1.2)" : "scale(1)",
                        transition: "transform 0.15s ease, background 0.15s ease",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {hoveredDay ? (
              <div style={{
                marginTop: 12,
                padding: "8px 12px",
                background: "rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(8px)",
    minHeight: 56,
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: 12,
                color: "var(--text-2)",
                animation: "fadeIn 0.2s ease-out"
              }}>
                <div style={{ fontWeight: 600, color: "var(--text-1)", textTransform: "capitalize", marginBottom: 2 }}>
                  {formatDate(hoveredDay.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div>
                  {hoveredDay.count === 0 && "Žádné dokončené úkoly."}
                  {hoveredDay.count === 1 && "🪄 1 dokončený úkol. Skvělý začátek!"}
                  {hoveredDay.count >= 2 && hoveredDay.count <= 4 && `🔥 ${hoveredDay.count} dokončené úkoly. Výborné tempo!`}
                  {hoveredDay.count >= 5 && `🚀 ${hoveredDay.count} dokončených úkolů. Neuvěřitelný výkon!`}
                </div>
              </div>
            ) : (
              <div style={{
                marginTop: 12,
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid transparent",
                fontSize: 12,
                color: "var(--text-4)",
                fontStyle: "italic",
                textAlign: "center"
              }}>
                Přejeď myší nad čtverečky pro detaily aktivity
              </div>
            )}
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
              const excerpt = (n.content || "").replace(/<[^>]+>/g, " ").replace(/[#*_`\n-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 90);
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
