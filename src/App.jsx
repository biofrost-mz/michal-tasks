import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";

/**
 * Michal Tasks — single-file React app
 * - Storage adapter: window.storage (if exists) -> localStorage
 * - Task statuses: todo / doing / waiting / done
 * - Stable default IDs (no uid() for defaults)
 * - Date parsing fix (YYYY-MM-DD without timezone shift)
 * - Debounced saves
 * - openProject() instead of overriding setSelProject
 */

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

/* ─────────────────────────────────────────────
   Storage keys
───────────────────────────────────────────── */
const SK = {
  PROJECTS: "mt3:projects",
  TASKS: "mt3:tasks",
  TAGS: "mt3:tags",
  SETTINGS: "mt3:settings",
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// Storage adapter: optional window.storage -> localStorage
const storage = {
  async get(key) {
    if (typeof window !== "undefined" && window.storage?.get) {
      const r = await window.storage.get(key);
      return r?.value ?? null;
    }
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage?.set) {
      await window.storage.set(key, value);
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

async function load(key, fallback = null) {
  try {
    const raw = await storage.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function save(key, val) {
  try {
    await storage.set(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
}

// Avoid timezone shifts for YYYY-MM-DD (from <input type="date">)
function parseYMD(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0); // local midnight
}
function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

// Debounced effect helper (saves)
function useDebouncedEffect(effect, deps, delay = 350) {
  useEffect(() => {
    const id = setTimeout(() => effect(), delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ─────────────────────────────────────────────
   Config
───────────────────────────────────────────── */
const STATUSES = {
  todo: { label: "To do", color: "#8b95a5", icon: "◇", bg: "#8b95a515" },
  doing: { label: "Rozpracováno", color: "#3b82f6", icon: "▸", bg: "#3b82f615" },
  waiting: { label: "Waiting / Blocked", color: "#f59e0b", icon: "◷", bg: "#f59e0b15" },
  done: { label: "Hotovo", color: "#22c55e", icon: "✓", bg: "#22c55e15" },
};
const STATUS_KEYS = Object.keys(STATUSES);

const PRIORITIES = {
  low: { label: "Nízká", color: "#22c55e", bg: "#22c55e18", icon: "▽" },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18", icon: "◇" },
  high: { label: "Vysoká", color: "#ef4444", bg: "#ef444418", icon: "△" },
};

const PROJ_STATUS = {
  idea: { label: "Nápad", color: "#94a3b8" },
  active: { label: "Aktivní", color: "#3b82f6" },
  done: { label: "Hotový", color: "#22c55e" },
  archived: { label: "Archiv", color: "#64748b" },
};

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e", "#10b981",
  "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#78716c", "#64748b",
];

// Stable IDs for defaults
const SID = {
  TAG_URGENT: "tag-urgent",
  TAG_IT: "tag-it",
  TAG_CONTENT: "tag-content",
  TAG_HR: "tag-hr",
  TAG_DESIGN: "tag-design",
  PROJ_AVENIER: "proj-avenier-web",
  PROJ_IDEAS: "proj-ideas",
};

const DEF_TAGS = [
  { id: SID.TAG_URGENT, name: "urgent", color: "#ef4444" },
  { id: SID.TAG_IT, name: "IT", color: "#3b82f6" },
  { id: SID.TAG_CONTENT, name: "content", color: "#8b5cf6" },
  { id: SID.TAG_HR, name: "HR", color: "#f59e0b" },
  { id: SID.TAG_DESIGN, name: "design", color: "#ec4899" },
];

const DEF_PROJECTS = [
  {
    id: SID.PROJ_AVENIER,
    name: "Avenier Web",
    description: "Redesign a vývoj webu",
    status: "active",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: SID.PROJ_IDEAS,
    name: "Nápady na později",
    description: "Nápady k promyšlení a návratu",
    status: "idea",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

/* ─────────────────────────────────────────────
   Theme
───────────────────────────────────────────── */
const theme = (dk) =>
  dk
    ? {
        bg: "#0c0e14",
        bg2: "#12141d",
        card: "#181b28",
        cardH: "#1e2236",
        input: "#1a1d2c",
        accent: "#3b82f6",
        accentH: "#60a5fa",
        accentBg: "#3b82f615",
        text: "#e8ecf4",
        text2: "#8b95a5",
        text3: "#5a6375",
        border: "#242838",
        borderH: "#3b82f640",
        shadow: "0 2px 8px #0005",
        kanban: "#10121a",
        toast: "#1e2236",
      }
    : {
        bg: "#f5f6fa",
        bg2: "#ffffff",
        card: "#ffffff",
        cardH: "#f0f2f8",
        input: "#f0f2f8",
        accent: "#3b6ef6",
        accentH: "#5b8af8",
        accentBg: "#3b6ef610",
        text: "#1a1e2e",
        text2: "#6b7280",
        text3: "#9ca3af",
        border: "#e5e7ec",
        borderH: "#3b82f640",
        shadow: "0 2px 8px #0001",
        kanban: "#eceef4",
        toast: "#1a1e2e",
      };

/* ─────────────────────────────────────────────
   Toasts
───────────────────────────────────────────── */
const ToastCtx = createContext(() => {});
const useToast = () => useContext(ToastCtx);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "info") => {
    const id = uid();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <ToastList toasts={toasts} />
    </ToastCtx.Provider>
  );
}

function ToastList({ toasts }) {
  const ctx = useApp();
  if (!ctx) return null;
  const { t } = ctx;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: t.toast,
            color:
              toast.type === "success"
                ? "#22c55e"
                : toast.type === "error"
                ? "#ef4444"
                : t.text,
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            border: `1px solid ${t.border}`,
            boxShadow: "0 4px 20px #0003",
            animation: "toastIn .25s ease-out",
          }}
        >
          {toast.type === "success" && "✓ "}
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
export default function MichalTasks() {
  const [dk, setDk] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [selProject, setSelProject] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);

  const [loaded, setLoaded] = useState(false);

  const [taskDetail, setTaskDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [dashFilter, setDashFilter] = useState(null);

  // Load
  useEffect(() => {
    (async () => {
      const [p, tk, tg, s] = await Promise.all([
        load(SK.PROJECTS, DEF_PROJECTS),
        load(SK.TASKS, []),
        load(SK.TAGS, DEF_TAGS),
        load(SK.SETTINGS, { dk: true }),
      ]);

      const migrated = (tk || []).map((t) => {
        // old statuses -> new
        if (t.status === "prep") return { ...t, status: "todo" };
        if (t.status === "approval") return { ...t, status: "waiting" };
        if (t.status === "backlog") return { ...t, status: "todo" }; // rename
        if (!t.status || !STATUSES[t.status]) return { ...t, status: "todo" };
        return t;
      });

      setProjects(p || []);
      setTasks(migrated);
      setTags(tg || []);
      setDk(s?.dk ?? true);
      setLoaded(true);
    })();
  }, []);

  // Debounced saves
  useDebouncedEffect(() => {
    if (loaded) save(SK.PROJECTS, projects);
  }, [projects, loaded], 350);

  useDebouncedEffect(() => {
    if (loaded) save(SK.TASKS, tasks);
  }, [tasks, loaded], 350);

  useDebouncedEffect(() => {
    if (loaded) save(SK.TAGS, tags);
  }, [tags, loaded], 350);

  useDebouncedEffect(() => {
    if (loaded) save(SK.SETTINGS, { dk });
  }, [dk, loaded], 350);

  // CRUD — Projects
  const addProject = useCallback((p) => {
    const proj = {
      id: uid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [],
      description: "",
      status: "active",
      ...p,
    };
    setProjects((prev) => [...prev, proj]);
    return proj;
  }, []);

  const updateProject = useCallback(
    (id, u) =>
      setProjects((p) =>
        p.map((x) => (x.id === id ? { ...x, ...u, updatedAt: Date.now() } : x))
      ),
    []
  );

  const deleteProject = useCallback(
    (id) => {
      if (!confirm("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")) return;
      setProjects((p) => p.filter((x) => x.id !== id));
      setTasks((p) => p.map((x) => (x.projectId === id ? { ...x, projectId: null } : x)));
      if (selProject === id) {
        setPage("projects");
        setSelProject(null);
      }
    },
    [selProject]
  );

  // CRUD — Tasks
  const addTask = useCallback((task) => {
    const t = {
      id: uid(),
      title: "",
      description: "",
      status: "todo",
      priority: null,
      dueDate: null, // YYYY-MM-DD
      projectId: null,
      tagIds: [],
      position: Date.now(), // used for ordering inside columns
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      starred: false,
      ...task,
    };
    setTasks((p) => [...p, t]);
    return t;
  }, []);

  const updateTask = useCallback((id, u) => {
    setTasks((p) =>
      p.map((x) => {
        if (x.id !== id) return x;
        const up = { ...x, ...u, updatedAt: Date.now() };
        if (u.status === "done" && x.status !== "done") up.completedAt = Date.now();
        if (u.status && u.status !== "done") up.completedAt = null;
        return up;
      })
    );
  }, []);

  const deleteTask = useCallback(
    (id) => {
      if (!confirm("Smazat úkol?")) return;
      setTasks((p) => p.filter((x) => x.id !== id));
      if (taskDetail === id) setTaskDetail(null);
    },
    [taskDetail]
  );

  // CRUD — Tags
  const addTag = useCallback((tag) => {
    const t = { id: uid(), color: "#6366f1", ...tag };
    setTags((p) => [...p, t]);
    return t;
  }, []);

  const updateTag = useCallback((id, u) => {
    setTags((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
  }, []);

  const deleteTag = useCallback((id) => {
    setTags((p) => p.filter((x) => x.id !== id));
    setTasks((p) => p.map((x) => ({ ...x, tagIds: (x.tagIds || []).filter((tid) => tid !== id) })));
  }, []);

  const t = theme(dk);
  const openProject = (id) => {
    setSelProject(id);
    setPage("project-detail");
  };

  if (!loaded) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: dk ? "#0c0e14" : "#f5f6fa",
        }}
      >
        <div style={{ textAlign: "center", color: dk ? "#e8ecf4" : "#1a1e2e" }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-1px", fontFamily: "'Outfit',sans-serif" }}>
            Michal Tasks v1
          </div>
          <div style={{ marginTop: 8, opacity: 0.5, animation: "pulse 1.5s infinite", fontSize: 14 }}>
            Načítám data…
          </div>
        </div>
      </div>
    );
  }

  const ctx = {
    t,
    dk,
    projects,
    tasks,
    tags,
    addProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    deleteTask,
    addTag,
    updateTag,
    deleteTag,
    page,
    setPage,
    selProject,
    setSelProject,
    openProject,
    taskDetail,
    setTaskDetail,
    search,
    setSearch,
    dashFilter,
    setDashFilter,
  };

  return (
    <AppContext.Provider value={ctx}>
      <ToastProvider>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}
          html,body,#root{height:100%;font-family:'Figtree',sans-serif;background:${t.bg};color:${t.text}}
          h1,h2,h3{font-family:'Outfit',sans-serif}
          ::-webkit-scrollbar{width:5px;height:5px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:${t.border};border-radius:3px}
          ::selection{background:${t.accent}33}
          input,textarea,select{font-family:'Figtree',sans-serif}
          button{font-family:'Figtree',sans-serif;cursor:pointer}
          .mono{font-family:'JetBrains Mono',monospace}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
          @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
          @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
          .fi{animation:fadeIn .2s ease-out}
          .sr{animation:slideRight .2s ease-out}
          .pop{animation:pop .2s ease-out}
        `}</style>

        <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
          <Sidebar toggleDk={() => setDk(!dk)} />
          <main style={{ flex: 1, overflow: "auto", position: "relative" }}>
            {page === "dashboard" && <Dashboard />}
            {page === "projects" && <ProjectsPage />}
            {page === "project-detail" && <ProjectDetail />}
            {page === "tasks" && <AllTasksPage />}
            {page === "tags" && <TagsPage />}
          </main>
          {taskDetail && <TaskDrawer />}
        </div>
      </ToastProvider>
    </AppContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────── */
function Sidebar({ toggleDk }) {
  const { t, dk, projects, tasks, page, setPage, openProject, search, setSearch } = useApp();
  const active = projects.filter((p) => p.status === "active");
  const searchRef = useRef(null);

  // Ctrl+K focus
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const nav = [
    { id: "dashboard", label: "Přehled", icon: "⊞" },
    { id: "projects", label: "Projekty", icon: "◫" },
    {
      id: "tasks",
      label: "Úkoly",
      icon: "☰",
      count: tasks.filter((t) => t.status !== "done").length,
    },
    { id: "tags", label: "Tagy", icon: "◉" },
  ];

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: t.bg2,
        borderRight: `1px solid ${t.border}`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "20px 14px 14px", display: "flex", alignItems: "center", gap: 9 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 14,
            fontWeight: 800,
            fontFamily: "'Outfit',sans-serif",
          }}
        >
          M
        </div>
        <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 16, letterSpacing: "-0.5px" }}>
          Michal Tasks
        </span>
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
          <span style={{ color: t.text3, fontSize: 13 }}>⌕</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat… (Ctrl+K)"
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
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", color: t.text3, fontSize: 11 }}>
              ✕
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
                padding: "7px 10px",
                borderRadius: 7,
                marginBottom: 1,
                background: act ? t.accentBg : "transparent",
                border: "none",
                color: act ? t.accent : t.text2,
                fontSize: 13.5,
                fontWeight: act ? 600 : 400,
                transition: "all .12s",
              }}
            >
              <span style={{ fontSize: 15, width: 18, textAlign: "center", opacity: 0.85 }}>{n.icon}</span>
              {n.label}
              {n.count > 0 && (
                <span
                  className="mono"
                  style={{
                    marginLeft: "auto",
                    fontSize: 10,
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
                fontSize: 10,
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

            {active.map((p) => {
              const count = tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
              return (
                <button
                  key={p.id}
                  onClick={() => openProject(p.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 10px",
                    borderRadius: 6,
                    background: "transparent",
                    border: "none",
                    color: t.text2,
                    fontSize: 12.5,
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: PROJ_STATUS[p.status]?.color || t.text3,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.name}</span>
                  {count > 0 && <span className="mono" style={{ fontSize: 10, color: t.text3 }}>{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      <div style={{ padding: "10px 8px", borderTop: `1px solid ${t.border}` }}>
        <button
          onClick={toggleDk}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 10px",
            borderRadius: 7,
            background: "transparent",
            border: "none",
            color: t.text2,
            fontSize: 12.5,
          }}
        >
          <span style={{ fontSize: 14 }}>{dk ? "☀" : "☾"}</span>
          {dk ? "Světlý režim" : "Tmavý režim"}
        </button>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   QuickAdd
───────────────────────────────────────────── */
function QuickAdd({ defaultProjectId = null }) {
  const { t, tasks, addTask, updateTask, projects, tags, setTaskDetail } = useApp();
  const toast = useToast();

  const [val, setVal] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);

  const handleAdd = () => {
    const title = val.trim();
    if (!title) return;
    const task = addTask({ title, projectId: defaultProjectId });
    setLastTaskId(task.id);
    setVal("");
    setExpanded(true);
    toast("Úkol přidán", "success");
  };

  const task = lastTaskId ? tasks.find((x) => x.id === lastTaskId) : null;
  const upd = (u) => task && updateTask(task.id, u);

  const close = () => {
    setExpanded(false);
    setLastTaskId(null);
  };

  return (
    <div
      style={{
        background: t.card,
        border: `1px solid ${expanded ? t.accent + "40" : t.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: t.shadow,
        transition: "border-color .2s",
      }}
    >
      <div style={{ display: "flex", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", color: t.text3 }}>
          <span style={{ fontSize: 20, fontWeight: 300 }}>+</span>
        </div>

        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nový úkol… (Enter pro přidání)"
          style={{
            flex: 1,
            border: "none",
            background: "transparent",
            outline: "none",
            color: t.text,
            fontSize: 14,
            padding: "13px 0",
          }}
        />

        <button
          onClick={handleAdd}
          style={{
            padding: "0 20px",
            border: "none",
            background: val.trim() ? t.accent : "transparent",
            color: val.trim() ? "#fff" : t.text3,
            fontSize: 13,
            fontWeight: 600,
            transition: "all .15s",
          }}
        >
          Přidat
        </button>
      </div>

      {expanded && task && (
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "14px 16px", animation: "fadeIn .15s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
              <span style={{ color: "#22c55e", marginRight: 4 }}>✓</span>„{task.title}“
            </span>
            <button onClick={close} style={{ background: "none", border: "none", color: t.text3, fontSize: 13, padding: "0 2px" }}>
              ✕
            </button>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
              Status
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => upd({ status: k })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    border: `1.5px solid ${task.status === k ? v.color : t.border}`,
                    background: task.status === k ? v.bg : "transparent",
                    color: task.status === k ? v.color : t.text2,
                    transition: "all .1s",
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
              Priorita
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => upd({ priority: task.priority === k ? null : k })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    border: `1.5px solid ${task.priority === k ? v.color : t.border}`,
                    background: task.priority === k ? v.bg : "transparent",
                    color: task.priority === k ? v.color : t.text2,
                    transition: "all .1s",
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Projekt
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button
                  onClick={() => upd({ projectId: null })}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 500,
                    border: `1.5px solid ${!task.projectId ? t.accent : t.border}`,
                    background: !task.projectId ? t.accentBg : "transparent",
                    color: !task.projectId ? t.accent : t.text2,
                  }}
                >
                  Inbox
                </button>

                {projects
                  .filter((p) => p.status === "active")
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => upd({ projectId: p.id })}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        border: `1.5px solid ${task.projectId === p.id ? t.accent : t.border}`,
                        background: task.projectId === p.id ? t.accentBg : "transparent",
                        color: task.projectId === p.id ? t.accent : t.text2,
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Termín
              </div>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => upd({ dueDate: e.target.value || null })}
                style={{
                  padding: "5px 10px",
                  borderRadius: 7,
                  border: `1px solid ${t.border}`,
                  background: t.input,
                  color: t.text,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>
                Tagy
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {tags.map((tg) => {
                  const active = (task.tagIds || []).includes(tg.id);
                  return (
                    <button
                      key={tg.id}
                      onClick={() =>
                        upd({
                          tagIds: active ? task.tagIds.filter((id) => id !== tg.id) : [...(task.tagIds || []), tg.id],
                        })
                      }
                      style={{
                        padding: "3px 9px",
                        borderRadius: 5,
                        fontSize: 10.5,
                        fontWeight: 600,
                        border: `1.5px solid ${active ? tg.color : t.border}`,
                        background: active ? tg.color + "18" : "transparent",
                        color: active ? tg.color : t.text2,
                      }}
                    >
                      {tg.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, paddingTop: 4 }}>
            <button
              onClick={() => {
                setTaskDetail(task.id);
                close();
              }}
              style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11.5, fontWeight: 600, border: "none", background: t.accent, color: "#fff" }}
            >
              Otevřít detail →
            </button>
            <button onClick={close} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 11.5, border: `1px solid ${t.border}`, background: "transparent", color: t.text2 }}>
              Hotovo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────── */
function StatCard({ label, value, color, icon, active, onClick }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color + "12" : t.card,
        border: `1px solid ${active ? color + "40" : t.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        textAlign: "left",
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: t.shadow,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -8, right: -4, fontSize: 52, opacity: 0.06, fontWeight: 800, color, fontFamily: "'Outfit',sans-serif" }}>
        {icon}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text2, marginBottom: 8 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: "-1px" }}>
        {value}
      </div>
    </button>
  );
}

function Dashboard() {
  const { t, tasks, projects, dashFilter, setDashFilter, search, openProject } = useApp();

  const today = startOfToday();
  const tmrw = new Date(today);
  tmrw.setDate(tmrw.getDate() + 1);
  const dayAfter = new Date(tmrw);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const activeP = projects.filter((p) => p.status === "active").length;
  const totalT = tasks.length;
  const doneT = tasks.filter((x) => x.status === "done").length;
  const waitingT = tasks.filter((x) => x.status === "waiting").length;
  const starredT = tasks.filter((x) => x.starred && x.status !== "done");

  const doing = tasks.filter((x) => x.status === "doing");
  const waitingAll = tasks.filter((x) => x.status === "waiting");
  const todo = tasks.filter((x) => x.status === "todo");

  const overdue = tasks.filter((x) => {
    const d = parseYMD(x.dueDate);
    return d && x.status !== "done" && d < today;
  });

  const dueSoon = tasks.filter((x) => {
    if (!x.dueDate || x.status === "done") return false;
    const d = parseYMD(x.dueDate);
    return d && d >= today && d <= dayAfter;
  });

  const matchesSearch = (task) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (task.title || "").toLowerCase().includes(s) || (task.description || "").toLowerCase().includes(s);
  };

  let filterContent = null;

  if (dashFilter === "active-projects") {
    const ap = projects.filter((p) => p.status === "active");
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Aktivní projekty</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {ap.map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const done = pt.filter((x) => x.status === "done").length;
          return (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8, cursor: "pointer" }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: t.text2 }}>{pt.length} úkolů, {done} hotovo</div>
            </div>
          );
        })}
      </div>
    );
  } else if (dashFilter === "total") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>Všechny úkoly ({totalT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {tasks.filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "done") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#22c55e" }}>Hotové úkoly ({doneT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {tasks.filter((x) => x.status === "done").filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "waiting") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>Waiting / Blocked ({waitingT})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {waitingAll.filter(matchesSearch).map((task) => (
          <DashTaskCard key={task.id} task={task} />
        ))}
      </div>
    );
  } else if (dashFilter === "starred") {
    filterContent = (
      <div className="fi">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#eab308" }}>★ TOP úkoly ({starredT.length})</h2>
          <button onClick={() => setDashFilter(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 12 }}>
            ✕ Zavřít
          </button>
        </div>
        {starredT.length === 0 ? (
          <div style={{ color: t.text3, fontSize: 12.5, padding: "16px 0", fontStyle: "italic" }}>
            Označ úkoly hvězdičkou ★ a budou se zobrazovat zde
          </div>
        ) : (
          starredT.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} />)
        )}
      </div>
    );
  }

  const sections = [];
  if (overdue.length > 0) sections.push({ title: "Po termínu", color: "#ef4444", icon: "!", tasks: overdue });
  sections.push({ title: "Rozpracováno", color: "#3b82f6", icon: "▸", tasks: doing, empty: "Žádné rozpracované úkoly" });
  sections.push({ title: "Waiting / Blocked", color: "#f59e0b", icon: "◷", tasks: waitingAll, empty: "Nic neblokuje — skvělé!" });
  sections.push({ title: "Blížící se deadline", color: "#f97316", icon: "⏱", tasks: dueSoon, empty: "Žádné blízké termíny" });
  sections.push({ title: "To do", color: "#8b95a5", icon: "◇", tasks: todo, empty: "To do je prázdné" });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }} className="fi">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 3 }}>Přehled</h1>
        <p style={{ color: t.text2, fontSize: 13.5 }}>
          {new Date().toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <QuickAdd />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 28 }}>
        <StatCard
          label="Celkem úkolů"
          value={totalT}
          color="#8b5cf6"
          icon="☰"
          active={dashFilter === "total"}
          onClick={() => setDashFilter(dashFilter === "total" ? null : "total")}
        />
        <StatCard
          label="Aktivní projekty"
          value={activeP}
          color="#3b82f6"
          icon="◫"
          active={dashFilter === "active-projects"}
          onClick={() => setDashFilter(dashFilter === "active-projects" ? null : "active-projects")}
        />
        <StatCard
          label="Waiting"
          value={waitingT}
          color={waitingT > 0 ? "#f59e0b" : "#22c55e"}
          icon="◷"
          active={dashFilter === "waiting"}
          onClick={() => setDashFilter(dashFilter === "waiting" ? null : "waiting")}
        />
        <StatCard
          label="Hotovo"
          value={doneT}
          color="#22c55e"
          icon="✓"
          active={dashFilter === "done"}
          onClick={() => setDashFilter(dashFilter === "done" ? null : "done")}
        />
        <StatCard
          label="TOP úkoly"
          value={starredT.length}
          color="#eab308"
          icon="★"
          active={dashFilter === "starred"}
          onClick={() => setDashFilter(dashFilter === "starred" ? null : "starred")}
        />
      </div>

      {filterContent && <div style={{ marginBottom: 24 }}>{filterContent}</div>}

      {!dashFilter && starredT.length > 0 && (
        <div style={{ marginBottom: 24 }} className="fi">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: "#eab30818", display: "flex", alignItems: "center", justifyContent: "center", color: "#eab308", fontSize: 13, fontWeight: 700 }}>
              ★
            </span>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#eab308" }}>TOP úkoly</h2>
            <span className="mono" style={{ fontSize: 11, color: t.text3, background: t.input, padding: "2px 8px", borderRadius: 8 }}>
              {starredT.length}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {starredT.filter(matchesSearch).map((task) => (
              <DashTaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {!dashFilter &&
        sections.map((sec, i) => (
          <div key={i} style={{ marginBottom: 24 }} className="fi">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: sec.color + "18", display: "flex", alignItems: "center", justifyContent: "center", color: sec.color, fontSize: 12, fontWeight: 700 }}>
                {sec.icon}
              </span>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: sec.color }}>{sec.title}</h2>
              <span className="mono" style={{ fontSize: 11, color: t.text3, background: t.input, padding: "2px 8px", borderRadius: 8 }}>
                {sec.tasks.length}
              </span>
            </div>

            {sec.tasks.length === 0 ? (
              <div style={{ color: t.text3, fontSize: 12.5, padding: "6px 32px", fontStyle: "italic" }}>{sec.empty}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {sec.tasks.filter(matchesSearch).map((task) => (
                  <DashTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        ))}

      {!dashFilter && tasks.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px", color: t.text3 }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Zatím prázdno</div>
          <div style={{ fontSize: 13 }}>Přidej první úkol přes pole nahoře</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task Cards
───────────────────────────────────────────── */
function DashTaskCard({ task }) {
  const { t, projects, tags, updateTask, setTaskDetail } = useApp();
  const project = projects.find((p) => p.id === task.projectId);
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));

  const st = STATUSES[task.status] || STATUSES.todo;
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;

  return (
    <div
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "pointer",
        transition: "all .12s",
        position: "relative",
        borderLeft: `3px solid ${st.color}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = t.cardH;
        e.currentTarget.style.borderColor = t.borderH;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.card;
        e.currentTarget.style.borderColor = t.border;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const keys = STATUS_KEYS;
            const idx = keys.indexOf(task.status);
            updateTask(task.id, { status: keys[(idx + 1) % keys.length] });
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: 5,
            flexShrink: 0,
            border: `2px solid ${st.color}`,
            background: task.status === "done" ? st.color : "transparent",
            color: task.status === "done" ? "#fff" : st.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 700,
          }}
          title={st.label}
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
            fontSize: 15,
            cursor: "pointer",
            color: task.starred ? "#eab308" : t.text3,
            opacity: task.starred ? 1 : 0.35,
            transition: "all .15s",
            flexShrink: 0,
            padding: 0,
            lineHeight: 1,
          }}
          title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
        >
          {task.starred ? "★" : "☆"}
        </button>

        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: task.status === "done" ? "line-through" : "none",
            color: task.status === "done" ? t.text3 : t.text,
          }}
        >
          {task.title || "Bez názvu"}
        </span>

        <div style={{ display: "flex", gap: 3 }} onClick={(e) => e.stopPropagation()}>
          {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
            <button
              key={k}
              onClick={() => updateTask(task.id, { status: k })}
              title={STATUSES[k].label}
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                fontSize: 10,
                border: `1px solid ${t.border}`,
                background: "transparent",
                color: STATUSES[k].color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.6,
                transition: "opacity .1s",
              }}
              onMouseEnter={(e) => (e.target.style.opacity = 1)}
              onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
            >
              {STATUSES[k].icon}
            </button>
          ))}
        </div>
      </div>

      {pr && (
        <div style={{ marginBottom: 5, marginLeft: 28 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              color: pr.color,
              background: pr.bg,
              padding: "2px 8px",
              borderRadius: 5,
            }}
          >
            {pr.icon} {pr.label}
          </span>
        </div>
      )}

      {taskTags.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 5, marginLeft: 28 }}>
          {taskTags.map((tg) => (
            <span key={tg.id} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: tg.color + "18", color: tg.color }}>
              {tg.name}
            </span>
          ))}
        </div>
      )}

      {task.description && (
        <div
          style={{
            fontSize: 12,
            color: t.text2,
            marginLeft: 28,
            marginBottom: 5,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 500,
          }}
        >
          {task.description}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginLeft: 28, flexWrap: "wrap" }}>
        {project && (
          <span style={{ fontSize: 10.5, color: t.accent, background: t.accentBg, padding: "2px 7px", borderRadius: 4, fontWeight: 600 }}>
            {project.name}
          </span>
        )}

        {task.dueDate && (
          <span
            className="mono"
            style={{
              fontSize: 10.5,
              fontWeight: isOverdue ? 700 : 500,
              color: isOverdue ? "#ef4444" : t.text2,
              background: isOverdue ? "#ef444412" : t.input,
              padding: "2px 7px",
              borderRadius: 4,
            }}
          >
            ⏱{" "}
            {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" }) || task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   View Toggle + List View
───────────────────────────────────────────── */
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
                  padding: "9px 10px",
                  fontSize: 10.5,
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
                <td style={{ padding: "9px 10px" }}>
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
                        fontSize: 14,
                        cursor: "pointer",
                        color: task.starred ? "#eab308" : t.text3,
                        opacity: task.starred ? 1 : 0.3,
                        padding: 0,
                        lineHeight: 1,
                        flexShrink: 0,
                      }}
                    >
                      {task.starred ? "★" : "☆"}
                    </button>

                    <span
                      style={{
                        fontSize: 12.5,
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

                <td style={{ padding: "9px 10px" }}>
                  <span
                    style={{
                      fontSize: 10.5,
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
                    {st.icon} {st.label}
                  </span>
                </td>

                <td style={{ padding: "9px 10px" }}>
                  {pr ? (
                    <span
                      style={{
                        fontSize: 10.5,
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
                      {pr.icon} {pr.label}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10.5, color: t.text3 }}>—</span>
                  )}
                </td>

                {showProject && (
                  <td style={{ padding: "9px 10px" }}>
                    {proj ? (
                      <span style={{ fontSize: 10.5, color: t.accent, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {proj.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: 10.5, color: t.text3, fontStyle: "italic" }}>Inbox</span>
                    )}
                  </td>
                )}

                <td style={{ padding: "9px 10px" }}>
                  {task.dueDate ? (
                    <span
                      className="mono"
                      style={{
                        fontSize: 10.5,
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
                    <span style={{ fontSize: 10.5, color: t.text3 }}>—</span>
                  )}
                </td>

                <td style={{ padding: "9px 10px" }}>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {taskTags.map((tg) => (
                      <span key={tg.id} style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: tg.color + "18", color: tg.color, whiteSpace: "nowrap" }}>
                        {tg.name}
                      </span>
                    ))}
                  </div>
                </td>

                <td style={{ padding: "9px 10px" }}>
                  <span className="mono" style={{ fontSize: 10, color: t.text3 }}>
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

/* ─────────────────────────────────────────────
   All Tasks Page
───────────────────────────────────────────── */
function FilterBtn({ label, active, color, onClick }) {
  const { t } = useApp();
  return (
    <button
      onClick={onClick}
      style={{
        padding: "5px 11px",
        borderRadius: 6,
        fontSize: 11.5,
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

function AllTasksPage() {
  const { t, tasks, projects, search } = useApp();
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
    <div style={{ padding: "24px 28px", maxWidth: view === "list" ? 1200 : 960 }} className="fi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 3 }}>Úkoly</h1>
          <p style={{ color: t.text2, fontSize: 13 }}>Všechny úkoly napříč projekty</p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <QuickAdd />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 3 }}>
          <FilterBtn label="Vše" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
          {Object.entries(STATUSES).map(([k, v]) => (
            <FilterBtn key={k} label={v.label} active={statusFilter === k} color={v.color} onClick={() => setStatusFilter(k)} />
          ))}
        </div>

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, outline: "none" }}
        >
          <option value="all">Všechny projekty</option>
          <option value="inbox">Inbox</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="mono" style={{ fontSize: 12, color: t.text3, marginLeft: "auto" }}>
          {filtered.length} úkolů
        </span>
      </div>

      {view === "list" ? (
        <ListView taskList={filtered} showProject={true} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {filtered.map((task) => (
            <DashTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "50px", color: t.text3, fontSize: 13 }}>Žádné úkoly neodpovídají filtrům</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Projects Page
───────────────────────────────────────────── */
function ProjectsPage() {
  const { t, projects, tasks, addProject, openProject } = useApp();
  const toast = useToast();

  const [filter, setFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const create = () => {
    if (!nName.trim()) return;
    addProject({ name: nName.trim(), description: nDesc.trim(), status: nStatus });
    setNName("");
    setNDesc("");
    setShowNew(false);
    toast("Projekt vytvořen", "success");
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }} className="fi">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px" }}>Projekty</h1>
        <button onClick={() => setShowNew(!showNew)} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          + Nový projekt
        </button>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 20 }}>
        {[
          { k: "all", l: "Vše" },
          { k: "active", l: "Aktivní" },
          { k: "idea", l: "Nápady" },
          { k: "done", l: "Hotové" },
          { k: "archived", l: "Archiv" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 500,
              border: `1px solid ${filter === f.k ? t.accent : t.border}`,
              background: filter === f.k ? t.accentBg : "transparent",
              color: filter === f.k ? t.accent : t.text2,
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      {showNew && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: t.shadow }} className="pop">
          <input
            value={nName}
            onChange={(e) => setNName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            autoFocus
            placeholder="Název projektu"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 14, marginBottom: 10 }}
          />
          <textarea
            value={nDesc}
            onChange={(e) => setNDesc(e.target.value)}
            placeholder="Popis (volitelné)"
            rows={2}
            style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 13, resize: "vertical", marginBottom: 10 }}
          />
          <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
            {Object.entries(PROJ_STATUS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setNStatus(k)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 500,
                  border: `1px solid ${nStatus === k ? v.color : t.border}`,
                  background: nStatus === k ? v.color + "18" : "transparent",
                  color: nStatus === k ? v.color : t.text2,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button onClick={() => setShowNew(false)} style={{ padding: "7px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12.5 }}>
              Zrušit
            </button>
            <button onClick={create} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: nName.trim() ? 1 : 0.4 }}>
              Vytvořit
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
        {filtered.map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const doneC = pt.filter((x) => x.status === "done").length;
          const pct = pt.length > 0 ? Math.round((doneC / pt.length) * 100) : 0;

          return (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: 18,
                cursor: "pointer",
                transition: "all .15s",
                boxShadow: t.shadow,
                borderTop: `3px solid ${PROJ_STATUS[p.status]?.color || t.text3}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px #0002";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = t.shadow;
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 5,
                    background: (PROJ_STATUS[p.status]?.color || t.text3) + "18",
                    color: PROJ_STATUS[p.status]?.color || t.text3,
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                  }}
                >
                  {PROJ_STATUS[p.status]?.label || p.status}
                </span>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 5, fontFamily: "'Outfit',sans-serif" }}>{p.name}</h3>
              {p.description && <p style={{ fontSize: 12, color: t.text2, marginBottom: 10, lineHeight: 1.4 }}>{p.description}</p>}

              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: t.text3 }}>
                <span>{pt.length} úkolů</span>
                {pt.length > 0 && <span className="mono" style={{ color: "#22c55e", fontWeight: 600 }}>{pct}%</span>}
              </div>

              {pt.length > 0 && (
                <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: t.input }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #3b82f6, #22c55e)", borderRadius: 2, transition: "width .4s" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "50px", color: t.text3, fontSize: 13 }}>Žádné projekty v této kategorii</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Project Detail + Kanban
───────────────────────────────────────────── */
function ProjectDetail() {
  const { t, projects, tasks, updateProject, deleteProject, selProject, setPage } = useApp();
  const toast = useToast();
  const project = projects.find((p) => p.id === selProject);

  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [view, setView] = useState("kanban");

  if (!project) return <div style={{ padding: 40, color: t.text3 }}>Projekt nenalezen</div>;

  const pTasks = tasks.filter((x) => x.projectId === project.id);

  return (
    <div style={{ padding: "24px 28px" }} className="fi">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, fontSize: 12.5, color: t.text3 }}>
        <button onClick={() => setPage("projects")} style={{ background: "none", border: "none", color: t.text2, cursor: "pointer", fontSize: 12.5 }}>
          Projekty
        </button>
        <span>›</span>
        <span style={{ color: t.text, fontWeight: 600 }}>{project.name}</span>
      </div>

      {!editing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>{project.name}</h1>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: PROJ_STATUS[project.status].color + "18", color: PROJ_STATUS[project.status].color }}>
                {PROJ_STATUS[project.status].label}
              </span>
            </div>
            {project.description && <p style={{ color: t.text2, fontSize: 13 }}>{project.description}</p>}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                setEName(project.name);
                setEDesc(project.description || "");
                setEditing(true);
              }}
              style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}
            >
              Upravit
            </button>
            <button
              onClick={() => deleteProject(project.id)}
              style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid #ef444430`, background: "transparent", color: "#ef4444", fontSize: 12 }}
            >
              Smazat
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }} className="pop">
          <input
            value={eName}
            onChange={(e) => setEName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 16, fontWeight: 700, outline: "none", marginBottom: 8 }}
          />
          <textarea
            value={eDesc}
            onChange={(e) => setEDesc(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none", resize: "vertical", marginBottom: 8 }}
          />
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {Object.entries(PROJ_STATUS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => updateProject(project.id, { status: k })}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  border: `1px solid ${project.status === k ? v.color : t.border}`,
                  background: project.status === k ? v.color + "18" : "transparent",
                  color: project.status === k ? v.color : t.text2,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                updateProject(project.id, { name: eName, description: eDesc });
                setEditing(false);
                toast("Projekt uložen", "success");
              }}
              style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600 }}
            >
              Uložit
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}>
              Zrušit
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <QuickAdd defaultProjectId={project.id} />
        </div>
        <ViewToggle view={view} setView={setView} modes={[{ k: "kanban", label: "Kanban", icon: "▦" }, { k: "list", label: "Tabulka", icon: "☰" }]} />
      </div>

      {view === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_KEYS.length}, 1fr)`, gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {STATUS_KEYS.map((status) => {
            const col = pTasks.filter((x) => x.status === status).sort((a, b) => (a.position || 0) - (b.position || 0));
            const cfg = STATUSES[status];
            return (
              <div key={status} style={{ background: t.kanban, borderRadius: 10, padding: 8, minHeight: 160 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, padding: "0 4px" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color, fontSize: 10, fontWeight: 700 }}>
                    {cfg.icon}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span className="mono" style={{ fontSize: 10, color: t.text3, marginLeft: "auto" }}>
                    {col.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {col.map((task) => (
                    <KanbanCard key={task.id} task={task} />
                  ))}
                </div>

                {col.length === 0 && <div style={{ padding: "16px 6px", textAlign: "center", color: t.text3, fontSize: 11, fontStyle: "italic" }}>Prázdné</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <ListView taskList={pTasks} showProject={false} />
      )}
    </div>
  );
}

function KanbanCard({ task }) {
  const { t, tags, setTaskDetail, updateTask } = useApp();
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;

  return (
    <div
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        padding: "10px 11px",
        cursor: "pointer",
        transition: "all .12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = t.borderH;
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = t.border;
        e.currentTarget.style.transform = "none";
      }}
    >
      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          marginBottom: 6,
          lineHeight: 1.35,
          textDecoration: task.status === "done" ? "line-through" : "none",
          color: task.status === "done" ? t.text3 : t.text,
        }}
      >
        {task.title || "Bez názvu"}
      </div>

      {pr && (
        <div style={{ marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: pr.bg, padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
            {pr.icon} {pr.label}
          </span>
        </div>
      )}

      {taskTags.length > 0 && (
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 5 }}>
          {taskTags.map((tg) => (
            <span key={tg.id} style={{ fontSize: 9.5, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: tg.color + "18", color: tg.color }}>
              {tg.name}
            </span>
          ))}
        </div>
      )}

      {task.dueDate && (
        <div style={{ marginTop: 6 }}>
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: isOverdue ? 700 : 400,
              color: isOverdue ? "#ef4444" : t.text3,
              background: isOverdue ? "#ef444410" : "transparent",
              padding: isOverdue ? "1px 5px" : 0,
              borderRadius: 3,
            }}
          >
            📅 {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }) || task.dueDate}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
          <button
            key={k}
            onClick={() => updateTask(task.id, { status: k })}
            title={STATUSES[k].label}
            style={{
              flex: 1,
              padding: "5px 0",
              borderRadius: 5,
              fontSize: 14,
              border: `1px solid ${t.border}`,
              background: STATUSES[k].color + "08",
              color: STATUSES[k].color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.55,
              transition: "all .12s",
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              e.target.style.opacity = 1;
              e.target.style.background = STATUSES[k].color + "20";
            }}
            onMouseLeave={(e) => {
              e.target.style.opacity = 0.55;
              e.target.style.background = STATUSES[k].color + "08";
            }}
          >
            {STATUSES[k].icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task Drawer
───────────────────────────────────────────── */
function Sec({ label, children }) {
  const { t } = useApp();
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 7 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function TaskDrawer() {
  const { t, tasks, projects, tags, updateTask, deleteTask, addProject, taskDetail, setTaskDetail } = useApp();
  const toast = useToast();

  const task = tasks.find((x) => x.id === taskDetail);
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || "");
  const [showNewProject, setShowNewProject] = useState(false);
  const [npName, setNpName] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDesc(task.description || "");
    setShowNewProject(false);
    setNpName("");
  }, [task.id]);

  const s = (u) => updateTask(task.id, u);

  const createProjectInline = () => {
    if (!npName.trim()) return;
    const p = addProject({ name: npName.trim() });
    s({ projectId: p.id });
    setNpName("");
    setShowNewProject(false);
    toast("Projekt vytvořen a přiřazen", "success");
  };

  return (
    <>
      <div onClick={() => setTaskDetail(null)} style={{ position: "fixed", inset: 0, background: "#00000040", zIndex: 90 }} />
      <div
        className="sr"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          maxWidth: "92vw",
          background: t.bg2,
          borderLeft: `1px solid ${t.border}`,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px #0003",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text2, fontFamily: "'Outfit',sans-serif" }}>Detail úkolu</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => deleteTask(task.id)} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11.5, padding: "4px 8px", borderRadius: 5 }}>
              Smazat
            </button>
            <button onClick={() => setTaskDetail(null)} style={{ background: t.input, border: `1px solid ${t.border}`, color: t.text2, fontSize: 14, padding: "2px 10px", borderRadius: 6 }}>
              ✕
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "18px 18px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <button
              onClick={() => s({ starred: !task.starred })}
              style={{
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
                color: task.starred ? "#eab308" : t.text3,
                opacity: task.starred ? 1 : 0.35,
                transition: "all .15s",
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
              title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            >
              {task.starred ? "★" : "☆"}
            </button>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => s({ title })}
              placeholder="Název úkolu"
              style={{ fontSize: 18, fontWeight: 700, border: "none", background: "transparent", color: t.text, outline: "none", width: "100%", fontFamily: "'Outfit',sans-serif" }}
            />
          </div>

          <Sec label="Status">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {Object.entries(STATUSES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => s({ status: k })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: `1.5px solid ${task.status === k ? v.color : t.border}`,
                    background: task.status === k ? v.bg : "transparent",
                    color: task.status === k ? v.color : t.text2,
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </Sec>

          <Sec label="Priorita">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button
                onClick={() => s({ priority: null })}
                style={{
                  padding: "5px 11px",
                  borderRadius: 7,
                  fontSize: 11.5,
                  fontWeight: 500,
                  border: `1.5px solid ${!task.priority ? t.accent : t.border}`,
                  background: !task.priority ? t.accentBg : "transparent",
                  color: !task.priority ? t.accent : t.text3,
                }}
              >
                — Žádná
              </button>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => s({ priority: k })}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: `1.5px solid ${task.priority === k ? v.color : t.border}`,
                    background: task.priority === k ? v.bg : "transparent",
                    color: task.priority === k ? v.color : t.text2,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 14 }}>{v.icon}</span> {v.label}
                </button>
              ))}
            </div>
          </Sec>

          <Sec label="Projekt">
            <select
              value={task.projectId || ""}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setShowNewProject(true);
                  return;
                }
                s({ projectId: e.target.value || null });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
            >
              <option value="">Inbox (bez projektu)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({PROJ_STATUS[p.status]?.label || p.status})
                </option>
              ))}
              <option value="__new__">+ Vytvořit nový projekt…</option>
            </select>

            {showNewProject && (
              <div style={{ display: "flex", gap: 6, marginTop: 8 }} className="pop">
                <input
                  value={npName}
                  onChange={(e) => setNpName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createProjectInline()}
                  placeholder="Název nového projektu"
                  autoFocus
                  style={{ flex: 1, padding: "7px 12px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
                />
                <button onClick={createProjectInline} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600 }}>
                  Vytvořit
                </button>
                <button onClick={() => setShowNewProject(false)} style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12 }}>
                  ✕
                </button>
              </div>
            )}
          </Sec>

          <Sec label="Termín">
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="date"
                value={task.dueDate || ""}
                onChange={(e) => s({ dueDate: e.target.value || null })}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none" }}
              />
              <span style={{ fontSize: 11.5, color: t.text3 }}>
                Založeno:{" "}
                {new Date(task.createdAt).toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </Sec>

          <Sec label="Tagy">
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {tags.map((tg) => {
                const active = (task.tagIds || []).includes(tg.id);
                return (
                  <button
                    key={tg.id}
                    onClick={() =>
                      s({
                        tagIds: active ? task.tagIds.filter((id) => id !== tg.id) : [...(task.tagIds || []), tg.id],
                      })
                    }
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1.5px solid ${active ? tg.color : t.border}`,
                      background: active ? tg.color + "18" : "transparent",
                      color: active ? tg.color : t.text2,
                    }}
                  >
                    {tg.name}
                  </button>
                );
              })}
            </div>
          </Sec>

          <Sec label="Popis">
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={() => s({ description: desc })}
              rows={4}
              placeholder="Poznámky, kontext, odkazy…"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 13, resize: "vertical", lineHeight: 1.5 }}
            />
          </Sec>

          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 12, marginTop: 8, fontSize: 11, color: t.text3 }}>
            <div>Vytvořeno: {new Date(task.createdAt).toLocaleString("cs-CZ")}</div>
            <div>Upraveno: {new Date(task.updatedAt).toLocaleString("cs-CZ")}</div>
            {task.completedAt && <div style={{ color: "#22c55e" }}>Dokončeno: {new Date(task.completedAt).toLocaleString("cs-CZ")}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Tags Page
───────────────────────────────────────────── */
function TagsPage() {
  const { t, tags, tasks, addTag, updateTag, deleteTag } = useApp();
  const toast = useToast();

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");

  const create = () => {
    if (!newName.trim()) return;
    addTag({ name: newName.trim(), color: newColor });
    setNewName("");
    toast("Tag vytvořen", "success");
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 600 }} className="fi">
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 20 }}>Správa tagů</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Nový tag…"
          style={{ flex: 1, padding: "9px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
        />
        <button onClick={create} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600 }}>
          Přidat
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 24 }}>
        {TAG_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setNewColor(c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: c,
              border: newColor === c ? "2.5px solid #fff" : "2px solid transparent",
              boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
              transition: "all .1s",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tags.map((tag) => {
          const count = tasks.filter((x) => (x.tagIds || []).includes(tag.id)).length;
          const isEditing = editing === tag.id;

          return (
            <div
              key={tag.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 9,
                borderLeft: `4px solid ${tag.color}`,
              }}
            >
              {!isEditing ? (
                <>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1, color: tag.color }}>{tag.name}</span>
                  <span style={{ fontSize: 11, color: t.text3 }}>{count} úkolů</span>

                  <button
                    onClick={() => {
                      setEditing(tag.id);
                      setEditName(tag.name);
                    }}
                    style={{ background: "none", border: "none", color: t.text3, fontSize: 11, padding: "2px 6px" }}
                  >
                    Upravit
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Smazat tag "${tag.name}"?`)) deleteTag(tag.id);
                    }}
                    style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, padding: "2px 6px" }}
                  >
                    Smazat
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateTag(tag.id, { name: editName });
                        setEditing(null);
                        toast("Tag upraven", "success");
                      }
                    }}
                    style={{ flex: 1, padding: "4px 8px", borderRadius: 5, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none" }}
                  />

                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTag(tag.id, { color: c })}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          background: c,
                          border: tag.color === c ? "2px solid #fff" : "1px solid transparent",
                          boxShadow: tag.color === c ? `0 0 0 1px ${c}` : "none",
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      updateTag(tag.id, { name: editName });
                      setEditing(null);
                      toast("Tag upraven", "success");
                    }}
                    style={{ background: "none", border: "none", color: t.accent, fontSize: 11, fontWeight: 600, padding: "2px 6px" }}
                  >
                    Uložit
                  </button>

                  <button onClick={() => setEditing(null)} style={{ background: "none", border: "none", color: t.text3, fontSize: 11, padding: "2px 6px" }}>
                    ✕
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}