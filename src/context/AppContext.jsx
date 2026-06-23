import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";

import { supabase } from "../supabase.js";
import theme from "../theme.js";
import { uuid4, parseYMD, useDebouncedEffect, setGlobalProjects } from "../utils.js";
import { runOptimisticMutation } from "../utils/optimistic.js";
import { useQuickTodoMutations } from "./mutations/useQuickTodoMutations.js";
import { useTagMutations } from "./mutations/useTagMutations.js";
import * as taskService from "../services/taskService.js";
import * as noteService from "../services/noteService.js";
import * as projectService from "../services/projectService.js";
import * as tagService from "../services/tagService.js";
import * as workspaceService from "../services/workspaceService.js";
import * as attachmentService from "../services/attachmentService.js";
import { useToast } from "../components/Toast.jsx";
import { STATUSES, PRIORITIES } from "../constants.js";

/* ─────────────────────────────────────────────
   Context
───────────────────────────────────────────── */
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/* ─────────────────────────────────────────────
   Storage keys
───────────────────────────────────────────── */
const SK = {
  SETTINGS: "mt3:settings",
};

const DEFAULT_UI_SETTINGS = {
  themeMode: "dark",
  accent: "amber",
  density: "comfortable",
  reducedMotion: false,
  defaultPage: "dashboard",
};

const ACCENT_THEMES = {
  amber: {
    label: "Amber",
    dark: { accent: "#e3a850", accent2: "#d4923a", rgb: "227, 168, 80", soft: "rgba(227, 168, 80, 0.10)", glow: "rgba(227, 168, 80, 0.25)" },
    light: { accent: "#c58a36", accent2: "#b07a2d", rgb: "197, 138, 54", soft: "rgba(197, 138, 54, 0.08)", glow: "rgba(197, 138, 54, 0.20)" },
  },
  emerald: {
    label: "Emerald",
    dark: { accent: "#34d399", accent2: "#10b981", rgb: "52, 211, 153", soft: "rgba(52, 211, 153, 0.11)", glow: "rgba(52, 211, 153, 0.24)" },
    light: { accent: "#059669", accent2: "#047857", rgb: "5, 150, 105", soft: "rgba(5, 150, 105, 0.09)", glow: "rgba(5, 150, 105, 0.18)" },
  },
  sky: {
    label: "Sky",
    dark: { accent: "#38bdf8", accent2: "#0ea5e9", rgb: "56, 189, 248", soft: "rgba(56, 189, 248, 0.12)", glow: "rgba(56, 189, 248, 0.24)" },
    light: { accent: "#0284c7", accent2: "#0369a1", rgb: "2, 132, 199", soft: "rgba(2, 132, 199, 0.09)", glow: "rgba(2, 132, 199, 0.18)" },
  },
  rose: {
    label: "Rose",
    dark: { accent: "#fb7185", accent2: "#f43f5e", rgb: "251, 113, 133", soft: "rgba(251, 113, 133, 0.11)", glow: "rgba(251, 113, 133, 0.23)" },
    light: { accent: "#e11d48", accent2: "#be123c", rgb: "225, 29, 72", soft: "rgba(225, 29, 72, 0.08)", glow: "rgba(225, 29, 72, 0.16)" },
  },
  violet: {
    label: "Violet",
    dark: { accent: "#a78bfa", accent2: "#8b5cf6", rgb: "167, 139, 250", soft: "rgba(167, 139, 250, 0.11)", glow: "rgba(167, 139, 250, 0.22)" },
    light: { accent: "#7c3aed", accent2: "#6d28d9", rgb: "124, 58, 237", soft: "rgba(124, 58, 237, 0.08)", glow: "rgba(124, 58, 237, 0.16)" },
  },
  slate: {
    label: "Slate",
    dark: { accent: "#cbd5e1", accent2: "#94a3b8", rgb: "203, 213, 225", soft: "rgba(203, 213, 225, 0.10)", glow: "rgba(203, 213, 225, 0.16)" },
    light: { accent: "#475569", accent2: "#334155", rgb: "71, 85, 105", soft: "rgba(71, 85, 105, 0.08)", glow: "rgba(71, 85, 105, 0.12)" },
  },
};

const VALID_PAGES = new Set(["dashboard", "tasks", "quick-todos", "projects", "timeline", "notes"]);

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeUiSettings(raw) {
  const migratedTheme = raw?.themeMode || (typeof raw?.dk === "boolean" ? (raw.dk ? "dark" : "light") : DEFAULT_UI_SETTINGS.themeMode);
  return {
    ...DEFAULT_UI_SETTINGS,
    ...raw,
    themeMode: ["dark", "light", "system"].includes(migratedTheme) ? migratedTheme : DEFAULT_UI_SETTINGS.themeMode,
    accent: ACCENT_THEMES[raw?.accent] ? raw.accent : DEFAULT_UI_SETTINGS.accent,
    density: ["comfortable", "compact"].includes(raw?.density) ? raw.density : DEFAULT_UI_SETTINGS.density,
    reducedMotion: !!raw?.reducedMotion,
    defaultPage: VALID_PAGES.has(raw?.defaultPage) ? raw.defaultPage : DEFAULT_UI_SETTINGS.defaultPage,
  };
}

function systemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveThemeMode(mode) {
  return mode === "system" ? systemPrefersDark() : mode !== "light";
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object ?? {}, key);
}

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
    } catch {
      // Storage can be unavailable in private/sandboxed browser contexts.
    }
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

/* ─────────────────────────────────────────────
   Mobile detection hook
───────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ─────────────────────────────────────────────
   DB fetch all (uses service normalizers)
───────────────────────────────────────────── */
async function dbFetchAll(userId, workspaceId) {
  const [
    { data: projects, error: pErr },
    rawTasks,
    { data: tags, error: gErr },
    { data: notes, error: nErr },
    { data: atts, error: aErr },
    { data: qts, error: qtErr },
  ] = await Promise.all([
    supabase.from("projects").select("*").eq("workspace_id", workspaceId).order("position", { ascending: true, nullsFirst: false }),
    taskService.fetchTasks(workspaceId),
    supabase.from("tags").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: true }),
    supabase.from("notes").select("*").eq("workspace_id", workspaceId).order("updated_at", { ascending: false }),
    supabase.from("attachments").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("quick_todos").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
  ]);

  if (pErr) throw pErr;
  if (gErr) throw gErr;
  if (nErr) console.warn("notes table:", nErr.message);
  if (aErr) console.warn("attachments table:", aErr.message);
  if (qtErr) console.warn("quick_todos table:", qtErr.message);

  const taskIds = rawTasks.map((t) => t.id);
  const rawTaskTags = await taskService.fetchTaskTags(taskIds);

  const tagMap = new Map();
  rawTaskTags.forEach((x) => {
    if (!tagMap.has(x.task_id)) tagMap.set(x.task_id, []);
    tagMap.get(x.task_id).push(x.tag_id);
  });

  return {
    projects: (projects || []).map((p, i) => projectService.normalizeProject(p, i)),
    tasks: rawTasks.map((t) => taskService.normalizeTask(t, tagMap.get(t.id) || [])),
    tags: (tags || []).map(tagService.normalizeTag),
    notes: (notes || []).map(noteService.normalizeNote),
    attachments: (atts || []).map((a) => ({
      id: a.id,
      taskId: a.task_id ?? null,
      projectId: a.project_id ?? null,
      noteId: a.note_id ?? null,
      name: a.name,
      size: a.size ?? null,
      mimeType: a.mime_type ?? null,
      storagePath: a.storage_path,
      createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
    })),
    quickTodos: (qts || []).map((q) => ({
      id: q.id,
      text: q.text || "",
      done: !!q.done,
      createdAt: q.created_at ? new Date(q.created_at).getTime() : Date.now(),
      priority: q.priority ?? null,
      dueDate: q.due_date ?? null,
      tags: q.tags ?? null,
      description: q.description ?? null,
    })),
  };
}

function isSystemAdminEmail(email) {
  const raw = import.meta.env.VITE_SYSTEM_ADMIN_EMAILS || "";
  if (!email || !raw.trim()) return false;
  const allowed = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

function parseHash() {
  if (typeof window === "undefined") return { page: null, selProject: null };
  const hash = window.location.hash || "";
  if (!hash || hash === "#") {
    return { page: null, selProject: null };
  }
  
  const hashContent = hash.substring(1); // remove '#'
  const [routePart, queryPart] = hashContent.split("?");
  
  const page = routePart || null;
  let selProject = null;
  
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    selProject = params.get("id") || null;
  }
  
  return { page, selProject };
}

/* ─────────────────────────────────────────────
   AppProvider
───────────────────────────────────────────── */
export function AppProvider({ children }) {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email ?? null;
  const userDisplayName = session?.user?.user_metadata?.display_name ?? null;
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [dk, setDkRaw] = useState(true);
  const [page, setPageRaw] = useState(() => {
    const parsed = parseHash();
    return parsed.page || "dashboard";
  });
  const pageRef = useRef(page);
  pageRef.current = page;
  const prevPageRef = useRef("dashboard");
  const setPage = useCallback((newPage) => {
    prevPageRef.current = pageRef.current;
    setPageRaw(newPage);
  }, []);
  const [timelineOffsetDays, setTimelineOffsetDays] = useState(0);
  const isMobile = useIsMobile();
  const [selProject, setSelProject] = useState(() => {
    const parsed = parseHash();
    return parsed.selProject;
  });

  const [projects, setProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const tasksRef = useRef([]);
  tasksRef.current = tasks;
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState([]);
  const [deletedNotes, setDeletedNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [quickTodos, setQuickTodos] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdRaw] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [tasksPageFilter, setTasksPageFilter] = useState("active");

  useEffect(() => {
    setGlobalProjects(projects);
  }, [projects]);

  // Error queue for displaying DB errors as toasts
  const [errorQueue, setErrorQueue] = useState([]);
  const reportError = useCallback((msg) => setErrorQueue((prev) => [...prev, msg]), []);
  const clearErrors = useCallback(() => setErrorQueue([]), []);

  const switchingToWsRef = useRef(null);
  const setActiveWorkspaceId = useCallback(async (wsId) => {
    setActiveWorkspaceIdRaw(wsId);
    if (wsId) {
      localStorage.setItem("lastWorkspaceId", wsId);
      switchingToWsRef.current = wsId;
      const normalized = await workspaceService.fetchMembers(wsId);
      if (switchingToWsRef.current === wsId) {
        setWorkspaceMembers(normalized);
      }
    } else {
      switchingToWsRef.current = null;
      setWorkspaceMembers([]);
    }
  }, []);

  const [openNoteId, setOpenNoteId] = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const refetchAll = useCallback(() => setRefreshCount((c) => c + 1), []);

  const [taskDetail, setTaskDetail] = useState(null);
  const [search, setSearch] = useState("");
  const [dashFilter, setDashFilter] = useState(null);

  // Auth session (Supabase)
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        // Invalid/expired refresh token — clear storage and force re-login
        supabase.auth.signOut();
        return;
      }
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setSession(newSession ?? null);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (!userId) {
      setIsSystemAdmin(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("current_user_is_system_admin");
      if (cancelled) return;
      if (error) {
        setIsSystemAdmin(isSystemAdminEmail(userEmail));
        return;
      }
      setIsSystemAdmin(Boolean(data));
    })();
    return () => { cancelled = true; };
  }, [userId, userEmail]);

  const updateUiSettings = useCallback((patch) => {
    setUiSettings((prev) => normalizeUiSettings({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));
  }, []);

  const setDk = useCallback((next) => {
    setDkRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      setUiSettings((current) => normalizeUiSettings({
        ...current,
        themeMode: resolved ? "dark" : "light",
      }));
      return resolved;
    });
  }, []);

  // Load UI settings
  useEffect(() => {
    (async () => {
      const s = normalizeUiSettings(await load(SK.SETTINGS, DEFAULT_UI_SETTINGS));
      setUiSettings(s);
      setDkRaw(resolveThemeMode(s.themeMode));
      if (s.defaultPage !== "dashboard") {
        const parsed = parseHash();
        if (!parsed.page) {
          setPage(s.defaultPage);
        }
      }
      setSettingsLoaded(true);
    })();
  }, []);

  // Hash Router: Listen to hashchange (e.g. browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const { page: newPage, selProject: newSelProject } = parseHash();
      if (newPage) {
        setPage(newPage);
      } else {
        setPage("dashboard");
      }
      setSelProject(newSelProject);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Hash Router: Sync state changes back to hash
  useEffect(() => {
    const currentParsed = parseHash();
    if (currentParsed.page === page && currentParsed.selProject === selProject) {
      return;
    }

    let newHash = `#${page}`;
    if (page === "project-detail" && selProject) {
      newHash += `?id=${selProject}`;
    }

    window.location.hash = newHash;
  }, [page, selProject]);

  // Sync theme class + CSS tokens to document.documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (dk) {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }

    // Accent tokeny (přepíší fallback v tokens.css)
    const palette = ACCENT_THEMES[uiSettings.accent]?.[dk ? "dark" : "light"] || ACCENT_THEMES.amber[dk ? "dark" : "light"];
    root.style.setProperty("--accent", palette.accent);
    root.style.setProperty("--accent-2", palette.accent2);
    root.style.setProperty("--accent-rgb", palette.rgb);
    root.style.setProperty("--accent-soft", palette.soft);
    root.style.setProperty("--accent-glow", palette.glow);

    // Color tokeny — nastavíme inline aby přebily tokens.css pro daný mód
    // (tokens.css řeší .dark/.light, tady jen accent-dependent border-h)
    root.style.setProperty("--border-h",
      dk
        ? `color-mix(in srgb, ${palette.accent} 28%, transparent)`
        : `color-mix(in srgb, ${palette.accent} 35%, transparent)`
    );

    root.dataset.density = uiSettings.density;
    root.dataset.motion = uiSettings.reducedMotion ? "reduced" : "full";
  }, [dk, uiSettings.accent, uiSettings.density, uiSettings.reducedMotion]);

  useEffect(() => {
    if (uiSettings.themeMode !== "system" || typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemTheme = (event) => setDkRaw(event.matches);
    setDkRaw(mq.matches);
    mq.addEventListener("change", handleSystemTheme);
    return () => mq.removeEventListener("change", handleSystemTheme);
  }, [uiSettings.themeMode]);

  // Load from Supabase after login
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) setLoadError("Načítání trvá déle než obvykle. Data se stále načítají.");
    }, 10_000);

    (async () => {
      try {
        setLoaded(false);
        setLoadError(null);
        await supabase.from("user_profiles").upsert(
          {
            id: userId,
            email: userEmail,
            last_seen_at: new Date().toISOString(),
            ...(userDisplayName ? { display_name: userDisplayName } : {})
          },
          { onConflict: "id", ignoreDuplicates: false }
        );
        if (cancelled) return;
        const { data: profileRow, error: profileError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (profileError) console.warn("profile onboarding state:", profileError.message);
        const userOnboardedInDb = hasOwn(profileRow, "onboarded_at") && profileRow.onboarded_at;
        const userOnboardedLocally = localStorage.getItem(`mt3:onboarding_done:${userId}`);
        if (!cancelled && (userOnboardedInDb || userOnboardedLocally)) {
          localStorage.setItem("mt3:onboarding_done", "1");
          window.dispatchEvent(new Event("mt3:onboarding_done"));
        }
        if (cancelled) return;
        const personalWsId = await workspaceService.ensurePersonalWorkspace(userId);
        if (cancelled) return;
        const wsList = await workspaceService.fetchWorkspaces(userId);
        if (cancelled) return;
        setWorkspaces(wsList);
        const savedWsId = localStorage.getItem("lastWorkspaceId");
        const wsId = savedWsId && wsList.find((w) => w.id === savedWsId) ? savedWsId : personalWsId;
        setActiveWorkspaceIdRaw(wsId);
        if (wsId !== personalWsId) localStorage.setItem("lastWorkspaceId", wsId);
        const normalized = await workspaceService.fetchMembers(wsId);
        setWorkspaceMembers(normalized);
        await workspaceService.seedIfEmpty(userId, wsId);
        const data = await dbFetchAll(userId, wsId);
        if (cancelled) return;
        setLoadError(null);
        const loadedProjects = data.projects || [];
        const loadedTasks = data.tasks || [];
        const loadedNotes = data.notes || [];

        setProjects(loadedProjects.filter((p) => p.status !== "deleted"));
        setDeletedProjects(loadedProjects.filter((p) => p.status === "deleted"));

        setTasks(loadedTasks.filter((t) => t.status !== "deleted"));
        setDeletedTasks(loadedTasks.filter((t) => t.status === "deleted"));

        setTags(data.tags || []);

        setNotes(loadedNotes.filter((n) => n.status !== "deleted"));
        setDeletedNotes(loadedNotes.filter((n) => n.status === "deleted"));

        setAttachments(data.attachments ?? []);
        setQuickTodos(data.quickTodos ?? []);
      } catch (e) {
        if (cancelled) return;
        console.error("load error:", e);
        setLoadError(e?.message || "Nepodařilo se načíst data");
      } finally {
        clearTimeout(timeout);
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [userId, userEmail, userDisplayName, refreshCount]);

  // Realtime tasks sync
  useEffect(() => {
    if (!activeWorkspaceId || !loaded) return;
    const channel = supabase
      .channel(`tasks-rt-${activeWorkspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `workspace_id=eq.${activeWorkspaceId}` }, (payload) => {
        if (payload.eventType === "UPDATE") {
          const isDeleted = payload.new.status === "deleted";
          if (isDeleted) {
            setTasks((prev) => prev.filter((t) => t.id !== payload.new.id));
            setDeletedTasks((prev) => {
              const existing = prev.find((t) => t.id === payload.new.id);
              const tagIds = existing ? existing.tagIds : [];
              const updated = taskService.normalizeTask(payload.new, tagIds);
              return prev.some((t) => t.id === payload.new.id)
                ? prev.map((t) => t.id === payload.new.id ? updated : t)
                : [...prev, updated];
            });
          } else {
            setDeletedTasks((prev) => prev.filter((t) => t.id !== payload.new.id));
            setTasks((prev) => {
              const existing = prev.find((t) => t.id === payload.new.id);
              const tagIds = existing ? existing.tagIds : [];
              const updated = taskService.normalizeTask(payload.new, tagIds);
              return prev.some((t) => t.id === payload.new.id)
                ? prev.map((t) => t.id === payload.new.id ? updated : t)
                : [...prev, updated];
            });
          }
        } else if (payload.eventType === "INSERT") {
          const isDeleted = payload.new.status === "deleted";
          const normalized = taskService.normalizeTask(payload.new, []);
          if (isDeleted) {
            setDeletedTasks((prev) => prev.some((t) => t.id === payload.new.id) ? prev : [...prev, normalized]);
          } else {
            setTasks((prev) => prev.some((t) => t.id === payload.new.id) ? prev : [...prev, normalized]);
          }
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          setDeletedTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspaceId, loaded]);

  // Save UI preferences
  useDebouncedEffect(() => {
    if (settingsLoaded) save(SK.SETTINGS, uiSettings);
  }, [uiSettings, settingsLoaded], 350);

  // CRUD — Projects
  const addProject = useCallback((p) => {
    const rawDesc = (p?.description || "").trim();
    const color = p?.color || null;
    const fullDesc = color ? `${rawDesc} [color:${color}]`.trim() : rawDesc;
    const proj = {
      id: uuid4(),
      name: (p?.name || "").trim() || "Nový projekt",
      description: rawDesc,
      status: p?.status || "active",
      tags: [],
      position: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      color: color,
    };
    if (!userId) {
      setProjects((prev) => [...prev, proj]);
      return proj;
    }
    runOptimisticMutation({
      apply: () => setProjects((prev) => [...prev, proj]),
      persist: () => projectService.insertProject({ ...proj, description: fullDesc }, userId, activeWorkspaceId),
      rollback: () => setProjects((prev) => prev.filter((x) => x.id !== proj.id)),
      onError: reportError,
      errorMessage: "Projekt se nepodařilo uložit",
    });
    return proj;
  }, [userId, activeWorkspaceId, reportError]);

  const updateProject = useCallback((id, u) => {
    const prevProject = projects.find((x) => x.id === id) ?? null;
    if (!prevProject) return;
    const nextColor = u.color !== undefined ? u.color : prevProject.color;
    const nextDesc = u.description !== undefined ? u.description : prevProject.description;
    const fullDesc = nextColor ? `${nextDesc} [color:${nextColor}]`.trim() : nextDesc;

    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...u, updatedAt: Date.now() } : x)));

    const payload = {};
    if (u.name !== undefined) payload.name = u.name;
    if (u.description !== undefined || u.color !== undefined) payload.description = fullDesc;
    if (u.status !== undefined) payload.status = u.status;
    if (!Object.keys(payload).length) return;

    runOptimisticMutation({
      persist: () => projectService.updateProjectDB(id, payload),
      rollback: () => { if (prevProject) setProjects((p) => p.map((x) => x.id === id ? prevProject : x)); },
      onError: reportError,
      errorMessage: "Projekt se nepodařilo aktualizovat",
    });
  }, [projects, reportError]);

  const deleteProject = useCallback(
    (id) => {
      const target = projects.find((x) => x.id === id);
      if (!target) return;
      const updated = { ...target, status: "deleted", updatedAt: Date.now() };

      runOptimisticMutation({
        apply: () => {
          setProjects((p) => p.filter((x) => x.id !== id));
          setDeletedProjects((prev) => [...prev, updated]);
        },
        persist: () =>
          projectService.updateProjectDB(id, { status: "deleted", updated_at: new Date().toISOString() }),
        rollback: () => {
          setProjects((p) => [...p, target]);
          setDeletedProjects((prev) => prev.filter((x) => x.id !== id));
        },
        onError: reportError,
        errorMessage: "Projekt se nepodařilo přesunout do koše",
      });
      if (selProject === id) {
        setPage("projects");
        setSelProject(null);
      }
    },
    [selProject, projects, reportError]
  );

  // Přeuspořádání úkolů — přijme nové pole úkolů v požadovaném pořadí
  const reorderTasks = useCallback((orderedTasks) => {
    const prevTasks = tasksRef.current;
    const updated = orderedTasks.map((tk, i) => ({ ...tk, position: (i + 1) * 1000 }));
    setTasks((prev) => {
      const updatedMap = new Map(updated.map((tk) => [tk.id, tk]));
      return prev.map((tk) => updatedMap.has(tk.id) ? updatedMap.get(tk.id) : tk);
    });
    (async () => {
      try {
        const results = await Promise.all(
          updated.map((tk) => supabase.from("tasks").update({ position: tk.position }).eq("id", tk.id))
        );
        const failed = results.find((r) => r?.error);
        if (failed) throw failed.error;
      } catch {
        // Rollback na původní pořadí + hlášení; jinak by se UI tiše rozešlo s DB.
        setTasks(prevTasks);
        reportError("Pořadí úkolů se nepodařilo uložit");
      }
    })();
  }, [reportError]);

  const reorderProjects = useCallback((orderedProjects) => {
    let prevProjects = null;
    const updated = orderedProjects.map((p, i) => ({ ...p, position: (i + 1) * 1000 }));
    setProjects((prev) => {
      prevProjects = prev;
      const updatedMap = new Map(updated.map((p) => [p.id, p]));
      const rest = prev.filter((p) => !updatedMap.has(p.id));
      return [...updated, ...rest];
    });
    (async () => {
      try {
        const results = await Promise.all(
          updated.map((p) =>
            supabase.from("projects").update({ position: p.position }).eq("id", p.id)
          )
        );
        const failed = results.find((r) => r?.error);
        if (failed) throw failed.error;
      } catch {
        if (prevProjects) setProjects(prevProjects);
        reportError("Pořadí projektů se nepodařilo uložit");
      }
    })();
  }, [reportError]);

  // ── Undo stack ────────────────────────────────
  const undoStackRef = useRef([]);
  const [undoAvailable, setUndoAvailable] = useState(false);

  const pushUndo = useCallback((label, fn) => {
    undoStackRef.current = [{ label, fn }, ...undoStackRef.current].slice(0, 20);
    setUndoAvailable(true);
  }, []);

  const popUndo = useCallback(() => {
    const [top, ...rest] = undoStackRef.current;
    if (!top) return;
    undoStackRef.current = rest;
    setUndoAvailable(rest.length > 0);
    top.fn();
    toast(`↩ Vráceno: ${top.label}`, "success");
  }, [toast]);

  // CRUD — Tasks
  const addTask = useCallback((task) => {
    const tsk = {
      id: uuid4(),
      title: (task?.title || "").trim(),
      description: task?.description || "",
      status: task?.status || "todo",
      priority: task?.priority ?? null,
      dueDate: task?.dueDate ?? null,
      projectId: task?.projectId ?? null,
      tagIds: task?.tagIds || [],
      phases: [],
      subtasks: task?.subtasks || [],
      position: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      starred: !!task?.starred,
      recurrence: task?.recurrence ?? null,
      remindAt: task?.remindAt ?? null,
      assigneeUserId: task?.assigneeUserId ?? null,
    };
    if (tsk.title) toast("Úkol vytvořen", "success");
    if (!userId) {
      setTasks((p) => [...p, tsk]);
      return tsk;
    }
    runOptimisticMutation({
      apply: () => setTasks((p) => [...p, tsk]),
      persist: async () => {
        await taskService.insertTask(tsk, userId, activeWorkspaceId);
        if (tsk.tagIds?.length) {
          await taskService.insertTaskTags(tsk.id, tsk.tagIds, userId);
        }
      },
      rollback: () => setTasks((p) => p.filter((t) => t.id !== tsk.id)),
      onError: reportError,
      errorMessage: "Úkol se nepodařilo uložit",
    });
    if (tsk.title) {
      pushUndo(`"${tsk.title.slice(0, 40)}"`, () => runOptimisticMutation({
        apply: () => setTasks((p) => p.filter((t) => t.id !== tsk.id)),
        persist: () => taskService.updateTaskDB(tsk.id, { status: "deleted", updated_at: new Date().toISOString() }),
        rollback: () => setTasks((p) => [...p, tsk]),
        onError: reportError,
      }));
    }
    return tsk;
  }, [userId, activeWorkspaceId, reportError, toast, pushUndo]);

  const updateTask = useCallback(
    (id, u, options = {}) => {
      // Compute prev/next synchronně z ref — vyhne se stale closure a race condition
      const prevTask = tasksRef.current.find((x) => x.id === id) ?? null;
      if (!prevTask) return;
      const nextTask = { ...prevTask, ...u, updatedAt: Date.now() };
      if (u.status === "done" && prevTask.status !== "done") nextTask.completedAt = Date.now();
      if (u.status && u.status !== "done") nextTask.completedAt = null;

      setTasks((p) => p.map((x) => (x.id === id ? nextTask : x)));

      const silent = options.silent ?? false;
      if (!silent) {
        if (u.status !== undefined && prevTask.status !== u.status) {
          const label = STATUSES[u.status]?.label || u.status;
          toast(`Stav úkolu změněn na "${label}"`, "success");
        } else if (u.priority !== undefined && prevTask.priority !== u.priority) {
          const labels = { low: "Nízká", medium: "Střední", high: "Vysoká" };
          const label = labels[u.priority] || "Žádná";
          toast(`Priorita úkolu změněna na "${label}"`, "success");
        } else if (u.projectId !== undefined && prevTask.projectId !== u.projectId) {
          const proj = projects.find(p => p.id === u.projectId);
          const label = proj ? proj.name : "Inbox";
          toast(`Úkol přesunut do projektu "${label}"`, "success");
        } else if (u.dueDate !== undefined && prevTask.dueDate !== u.dueDate) {
          if (u.dueDate) {
            toast(`Termín splnění nastaven na ${u.dueDate}`, "success");
          } else {
            toast("Termín splnění byl odebrán", "success");
          }
        } else if (u.assigneeUserId !== undefined && prevTask.assigneeUserId !== u.assigneeUserId) {
          const member = workspaceMembers?.find(m => m.userId === u.assigneeUserId);
          const label = member?.displayName || member?.email || "nepřiřazeno";
          toast(`Řešitel změněn na "${label}"`, "success");
        } else if (u.title !== undefined && prevTask.title !== u.title) {
          toast("Název úkolu byl uložen", "success");
        } else if (u.description !== undefined && prevTask.description !== u.description) {
          toast("Popis úkolu byl uložen", "success");
        } else if (u.remindAt !== undefined && prevTask.remindAt !== u.remindAt) {
          if (u.remindAt) {
            toast("Připomenutí bylo nastaveno", "success");
          } else {
            toast("Připomenutí bylo zrušeno", "success");
          }
        }
      }

      if (u.status === "done" && prevTask.status !== "done") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = localDateKey(today);
        const celebrationKey = `mt:done-3-celebrated:${todayKey}`;
        const doneToday = tasksRef.current.filter((t) => {
          if (t.id === id) return false;
          if (t.status !== "done") return false;
          const stamp = t.completedAt || t.updatedAt;
          return stamp && stamp >= today.getTime();
        }).length + 1;

        try {
          if (doneToday === 3 && localStorage.getItem(celebrationKey) !== "1") {
            localStorage.setItem(celebrationKey, "1");
            setTimeout(() => toast("3 hotové dnes. Dobrá jízda.", "success"), 180);
          }
        } catch {
          if (doneToday === 3) setTimeout(() => toast("3 hotové dnes. Dobrá jízda.", "success"), 180);
        }
      }

      (async () => {
        const payload = {};
        if (u.title !== undefined) payload.title = nextTask.title;
        if (u.description !== undefined) payload.description = nextTask.description;
        if (u.status !== undefined) payload.status = nextTask.status;
        if (u.priority !== undefined) payload.priority = nextTask.priority;
        if (u.projectId !== undefined) payload.project_id = nextTask.projectId;
        if (u.dueDate !== undefined) payload.due_date = nextTask.dueDate;
        if (u.position !== undefined) payload.position = nextTask.position;
        if (u.starred !== undefined) payload.starred = nextTask.starred;
        if (u.phases !== undefined) payload.phases = nextTask.phases;
        if (u.subtasks !== undefined) payload.subtasks = nextTask.subtasks;
        if (u.recurrence !== undefined) payload.recurrence = nextTask.recurrence;
        if (u.remindAt !== undefined) payload.remind_at = u.remindAt ?? null;
        if (u.assigneeUserId !== undefined) payload.assignee_user_id = u.assigneeUserId;
        if (u.status !== undefined) {
          payload.completed_at = nextTask.status === "done" ? new Date().toISOString() : null;
        }
        if (Object.keys(payload).length) {
          // Optimistický update už proběhl výše (setTasks(nextTask)); tady jen
          // perzistujeme a při chybě vrátíme zpět + přerušíme (recurrence/tag-sync se nespustí).
          const res = await runOptimisticMutation({
            persist: () => taskService.updateTaskDB(id, payload),
            rollback: () => setTasks((p) => p.map((x) => x.id === id ? prevTask : x)),
            onError: reportError,
            errorMessage: "Úkol se nepodařilo aktualizovat",
          });
          if (!res.ok) return;
        }

        const VALID_RECURRENCE = ["daily", "weekly", "biweekly", "monthly"];
        if (u.status === "done" && prevTask?.status !== "done" && VALID_RECURRENCE.includes(nextTask.recurrence)) {
          const rec = nextTask.recurrence;
          let nextDue = null;
          let baseDate = null;
          if (nextTask.dueDate) {
            const parsed = parseYMD(nextTask.dueDate);
            if (parsed && !isNaN(parsed)) {
              baseDate = new Date(parsed);
            }
          }
          if (!baseDate) baseDate = new Date();

          if (rec === "daily") {
            const d = new Date(baseDate); d.setDate(d.getDate() + 1);
            nextDue = d.toISOString().split("T")[0];
          } else if (rec === "weekly") {
            const d = new Date(baseDate); d.setDate(d.getDate() + 7);
            nextDue = d.toISOString().split("T")[0];
          } else if (rec === "biweekly") {
            const d = new Date(baseDate); d.setDate(d.getDate() + 14);
            nextDue = d.toISOString().split("T")[0];
          } else if (rec === "monthly") {
            const d = new Date(baseDate); d.setMonth(d.getMonth() + 1);
            nextDue = d.toISOString().split("T")[0];
          }

          if (nextDue) {
            const newTask = {
              id: uuid4(),
              title: nextTask.title,
              description: nextTask.description,
              status: "todo",
              priority: nextTask.priority,
              dueDate: nextDue,
              projectId: nextTask.projectId,
              tagIds: nextTask.tagIds || [],
              phases: [],
              subtasks: (nextTask.subtasks || []).map((sb) => ({ ...sb, done: false })),
              position: Date.now() + 10,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              completedAt: null,
              starred: nextTask.starred,
              recurrence: nextTask.recurrence,
              assigneeUserId: nextTask.assigneeUserId ?? null,
              remindAt: null,
            };
            runOptimisticMutation({
              apply: () => setTasks((p) => [...p, newTask]),
              persist: async () => {
                await taskService.insertTask(newTask, userId, activeWorkspaceId);
                if (newTask.tagIds?.length) {
                  await taskService.insertTaskTags(newTask.id, newTask.tagIds, userId);
                }
              },
              rollback: () => setTasks((p) => p.filter((t) => t.id !== newTask.id)),
              // bez onError — selhání rekurentní kopie je tiché jako v původním kódu
            });
          }
        }

        if (u.tagIds !== undefined) {
          // Tag sync je nekritický — žádný rollback celého updatu, jen hlášení.
          await runOptimisticMutation({
            persist: () => taskService.syncTaskTags(id, prevTask?.tagIds || [], nextTask.tagIds || [], userId),
            onError: reportError,
            errorMessage: "Tagy se nepodařilo synchronizovat",
          });
        }
      })();
    },
    [userId, activeWorkspaceId, reportError, projects, workspaceMembers, toast]
  );

  const deleteTask = useCallback(
    (id) => {
      const target = tasksRef.current.find((x) => x.id === id) ?? null;
      if (!target) return;
      const updated = { ...target, status: "deleted", updatedAt: Date.now() };

      if (taskDetail === id) setTaskDetail(null);
      runOptimisticMutation({
        apply: () => {
          setTasks((p) => p.filter((x) => x.id !== id));
          setDeletedTasks((prev) => [...prev, updated]);
        },
        persist: () =>
          taskService.updateTaskDB(id, { status: "deleted", updated_at: new Date().toISOString() }),
        rollback: () => {
          setTasks((p) => [...p, target]);
          setDeletedTasks((prev) => prev.filter((x) => x.id !== id));
        },
        onError: reportError,
        errorMessage: "Úkol se nepodařilo přesunout do koše",
      });

      const snapshot = { ...target };
      pushUndo(`"${snapshot.title?.slice(0, 40) || "Bez názvu"}"`, () => runOptimisticMutation({
        apply: () => {
          setDeletedTasks((prev) => prev.filter((x) => x.id !== snapshot.id));
          setTasks((prev) => [...prev, { ...snapshot, status: "todo", updatedAt: Date.now() }]);
        },
        persist: () => taskService.updateTaskDB(snapshot.id, { status: "todo", updated_at: new Date().toISOString() }),
        rollback: () => setTasks((prev) => prev.filter((t) => t.id !== snapshot.id)),
        onError: reportError,
      }));
      toast("Úkol přesunut do koše · Cmd+Z pro vrácení", "success");
    },
    [taskDetail, reportError, toast, pushUndo]
  );

  // CRUD — Tags (vyštěpeno do useTagMutations)
  const { addTag, updateTag, deleteTag } = useTagMutations({
    tags,
    tasks,
    setTags,
    setTasks,
    userId,
    activeWorkspaceId,
    reportError,
  });

  // CRUD — Notes
  const addNote = useCallback((opts = {}) => {
    const note = {
      id: uuid4(),
      title: opts.title || "",
      content: opts.content || "",
      primaryProjectId: opts.primaryProjectId || null,
      primaryTaskId: opts.primaryTaskId || null,
      extraProjectIds: opts.extraProjectIds || [],
      extraTaskIds: opts.extraTaskIds || [],
      pinned: false,
      status: opts.status || "draft",
      icon: opts.icon || null,
      archived: false,
      tags: opts.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (!userId) {
      setNotes((prev) => [note, ...prev]);
      return note;
    }
    runOptimisticMutation({
      apply: () => setNotes((prev) => [note, ...prev]),
      persist: () => noteService.insertNote(note, userId, activeWorkspaceId),
      rollback: () => setNotes((prev) => prev.filter((n) => n.id !== note.id)),
      onError: reportError,
      errorMessage: "Poznámku se nepodařilo uložit",
    });
    return note;
  }, [userId, activeWorkspaceId, reportError]);

  const updateNote = useCallback((id, u) => {
    const prevNote = notes.find((n) => n.id === id) ?? null;
    setNotes((prev) =>
      prev.map((n) => (n.id !== id ? n : { ...n, ...u, updatedAt: Date.now() }))
    );
    const payload = { updated_at: new Date().toISOString() };
    if (u.title !== undefined) payload.title = u.title;
    if (u.content !== undefined) payload.content = u.content;
    if (u.primaryProjectId !== undefined) payload.primary_project_id = u.primaryProjectId;
    if (u.primaryTaskId !== undefined) payload.primary_task_id = u.primaryTaskId;
    if (u.extraProjectIds !== undefined) payload.extra_project_ids = u.extraProjectIds?.length ? u.extraProjectIds : null;
    if (u.extraTaskIds !== undefined) payload.extra_task_ids = u.extraTaskIds?.length ? u.extraTaskIds : null;
    if (u.pinned !== undefined) payload.pinned = u.pinned;
    if (u.status !== undefined) payload.status = u.status;
    if (u.icon !== undefined) payload.icon = u.icon || null;
    if (u.archived !== undefined) payload.archived = u.archived;
    if (u.tags !== undefined) payload.tags = u.tags?.length ? u.tags : null;

    runOptimisticMutation({
      persist: () => noteService.updateNoteDB(id, payload),
      rollback: () => { if (prevNote) setNotes((prev) => prev.map((n) => n.id === id ? prevNote : n)); },
      onError: reportError,
      errorMessage: "Poznámku se nepodařilo aktualizovat",
    });
  }, [notes, reportError]);

  const deleteNote = useCallback((id) => {
    const target = notes.find((n) => n.id === id) ?? null;
    if (!target) return;
    const updated = { ...target, status: "deleted", updatedAt: Date.now() };

    runOptimisticMutation({
      apply: () => {
        setNotes((prev) => prev.filter((n) => n.id !== id));
        setDeletedNotes((prev) => [...prev, updated]);
      },
      persist: () =>
        noteService.updateNoteDB(id, { status: "deleted", updated_at: new Date().toISOString() }),
      rollback: () => {
        setNotes((prev) => [...prev, target]);
        setDeletedNotes((prev) => prev.filter((x) => x.id !== id));
      },
      onError: reportError,
      errorMessage: "Poznámku se nepodařilo přesunout do koše",
    });
  }, [notes, reportError]);

  const restoreProject = useCallback((id) => {
    const target = deletedProjects.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "active", updatedAt: Date.now() };

    runOptimisticMutation({
      apply: () => {
        setDeletedProjects((prev) => prev.filter((x) => x.id !== id));
        setProjects((prev) => [...prev, restored]);
      },
      persist: () =>
        projectService.updateProjectDB(id, { status: "active", updated_at: new Date().toISOString() }),
      rollback: () => {
        setDeletedProjects((prev) => [...prev, target]);
        setProjects((prev) => prev.filter((x) => x.id !== id));
      },
      onError: reportError,
      errorMessage: "Projekt se nepodařilo obnovit",
    });
  }, [deletedProjects, reportError]);

  const restoreTask = useCallback((id) => {
    const target = deletedTasks.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "todo", updatedAt: Date.now() };

    runOptimisticMutation({
      apply: () => {
        setDeletedTasks((prev) => prev.filter((x) => x.id !== id));
        setTasks((prev) => [...prev, restored]);
      },
      persist: () =>
        taskService.updateTaskDB(id, { status: "todo", updated_at: new Date().toISOString() }),
      rollback: () => {
        setDeletedTasks((prev) => [...prev, target]);
        setTasks((prev) => prev.filter((x) => x.id !== id));
      },
      onError: reportError,
      errorMessage: "Úkol se nepodařilo obnovit",
    });
  }, [deletedTasks, reportError]);

  const restoreNote = useCallback((id) => {
    const target = deletedNotes.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "draft", updatedAt: Date.now() };

    runOptimisticMutation({
      apply: () => {
        setDeletedNotes((prev) => prev.filter((x) => x.id !== id));
        setNotes((prev) => [restored, ...prev]);
      },
      persist: () =>
        noteService.updateNoteDB(id, { status: "draft", updated_at: new Date().toISOString() }),
      rollback: () => {
        setDeletedNotes((prev) => [...prev, target]);
        setNotes((prev) => prev.filter((x) => x.id !== id));
      },
      onError: reportError,
      errorMessage: "Poznámku se nepodařilo obnovit",
    });
  }, [deletedNotes, reportError]);

  const hardDeleteProject = useCallback((id) => {
    const target = deletedProjects.find((x) => x.id === id);
    runOptimisticMutation({
      apply: () => setDeletedProjects((prev) => prev.filter((x) => x.id !== id)),
      persist: () => projectService.deleteProjectDB(id),
      rollback: () => { if (target) setDeletedProjects((prev) => [...prev, target]); },
      onError: reportError,
      errorMessage: "Projekt se nepodařilo permanentně smazat",
    });
  }, [deletedProjects, reportError]);

  const hardDeleteTask = useCallback((id) => {
    const target = deletedTasks.find((x) => x.id === id);
    runOptimisticMutation({
      apply: () => setDeletedTasks((prev) => prev.filter((x) => x.id !== id)),
      persist: () => taskService.deleteTaskDB(id),
      rollback: () => { if (target) setDeletedTasks((prev) => [...prev, target]); },
      onError: reportError,
      errorMessage: "Úkol se nepodařilo permanentně smazat",
    });
  }, [deletedTasks, reportError]);

  const hardDeleteNote = useCallback((id) => {
    const target = deletedNotes.find((x) => x.id === id);
    runOptimisticMutation({
      apply: () => setDeletedNotes((prev) => prev.filter((x) => x.id !== id)),
      persist: () => noteService.deleteNoteDB(id),
      rollback: () => { if (target) setDeletedNotes((prev) => [...prev, target]); },
      onError: reportError,
      errorMessage: "Poznámku se nepodařilo permanentně smazat",
    });
  }, [deletedNotes, reportError]);

  const uploadAttachment = useCallback(async (file, { taskId = null, projectId = null, noteId = null } = {}) => {
    if (!userId) throw new Error("Not logged in");
    const storagePath = await attachmentService.uploadFile(file, userId);
    const attId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const att = {
      id: attId,
      taskId,
      projectId,
      noteId,
      name: file.name,
      size: file.size,
      mimeType: file.type || null,
      storagePath,
    };
    await attachmentService.insertAttachmentDB(att, userId, activeWorkspaceId);
    const result = { ...att, createdAt: Date.now() };
    setAttachments((prev) => [result, ...prev]);
    return result;
  }, [userId, activeWorkspaceId]);

  const deleteAttachment = useCallback(async (att) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    await attachmentService.deleteAttachmentDB(att);
  }, []);

  // CRUD — Quick Todos (vyštěpeno do useQuickTodoMutations)
  const {
    addQuickTodo,
    archiveQuickTodo,
    restoreQuickTodo,
    deleteQuickTodo,
    updateQuickTodo,
    clearArchivedQuickTodos,
  } = useQuickTodoMutations({
    quickTodos,
    setQuickTodos,
    userId,
    activeWorkspaceId,
    supabase,
    reportError,
    toast,
  });

  const switchWorkspace = useCallback(async (wsId) => {
    if (wsId === activeWorkspaceId) return;
    setLoaded(false);
    try {
      await setActiveWorkspaceId(wsId);
      const data = await dbFetchAll(userId, wsId);
      const loadedProjects = data.projects || [];
      const loadedTasks = data.tasks || [];
      const loadedNotes = data.notes || [];

      setProjects(loadedProjects.filter((p) => p.status !== "deleted"));
      setDeletedProjects(loadedProjects.filter((p) => p.status === "deleted"));

      setTasks(loadedTasks.filter((t) => t.status !== "deleted"));
      setDeletedTasks(loadedTasks.filter((t) => t.status === "deleted"));

      setTags(data.tags || []);

      setNotes(loadedNotes.filter((n) => n.status !== "deleted"));
      setDeletedNotes(loadedNotes.filter((n) => n.status === "deleted"));

      setAttachments(data.attachments ?? []);
      setQuickTodos(data.quickTodos ?? []);
    } catch (e) {
      console.error("switchWorkspace error:", e);
    } finally {
      setLoaded(true);
    }
  }, [userId, activeWorkspaceId, setActiveWorkspaceId]);

  const renameWorkspace = useCallback(async (name) => {
    if (!activeWorkspaceId) return;
    const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", activeWorkspaceId);
    if (error) throw error;
    setWorkspaces((prev) => prev.map((w) => w.id === activeWorkspaceId ? { ...w, name: name.trim() } : w));
  }, [activeWorkspaceId]);

  const updateMemberRole = useCallback(async (memberUserId, newRole) => {
    if (!activeWorkspaceId) return;
    const { error } = await supabase.from("workspace_members")
      .update({ role: newRole })
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", memberUserId);
    if (error) throw error;
    setWorkspaceMembers((prev) => prev.map((m) => m.userId === memberUserId ? { ...m, role: newRole } : m));
  }, [activeWorkspaceId]);

  const removeMember = useCallback(async (memberUserId) => {
    if (!activeWorkspaceId) return;
    const { error } = await supabase.from("workspace_members")
      .delete()
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", memberUserId);
    if (error) throw error;
    setWorkspaceMembers((prev) => prev.filter((m) => m.userId !== memberUserId));
  }, [activeWorkspaceId]);

  const leaveWorkspace = useCallback(async () => {
    if (!activeWorkspaceId || !userId) return;
    const { error } = await supabase.from("workspace_members")
      .delete()
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", userId);
    if (error) throw error;
    const remaining = workspaces.filter((w) => w.id !== activeWorkspaceId);
    setWorkspaces(remaining);
    if (remaining.length > 0) {
      await switchWorkspace(remaining[0].id);
    } else {
      const newWsId = await workspaceService.ensurePersonalWorkspace(userId);
      const wsList = await workspaceService.fetchWorkspaces(userId);
      setWorkspaces(wsList);
      await switchWorkspace(newWsId);
    }
  }, [activeWorkspaceId, userId, workspaces, switchWorkspace]);

  const fetchWorkspaceInvites = useCallback(async () => {
    if (!activeWorkspaceId) return [];
    const { data, error } = await supabase.from("workspace_invites")
      .select("*")
      .eq("workspace_id", activeWorkspaceId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }, [activeWorkspaceId]);

  const revokeInvite = useCallback(async (inviteId) => {
    const { error } = await supabase.from("workspace_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inviteId);
    if (error) throw error;
  }, []);

  const createWorkspace = useCallback(async (name) => {
    const wsId = uuid4();
    const { error: wsErr } = await supabase.from("workspaces").insert({
      id: wsId,
      name: name.trim(),
      created_by: userId,
    });
    if (wsErr) throw wsErr;
    const { error: memErr } = await supabase.from("workspace_members").insert({
      workspace_id: wsId,
      user_id: userId,
      role: "owner",
    });
    if (memErr) throw memErr;
    const newWs = { id: wsId, name: name.trim(), role: "owner", createdAt: Date.now() };
    setWorkspaces((prev) => [...prev, newWs]);
    return newWs;
  }, [userId]);

  const generateInviteLink = useCallback(async (role = "member") => {
    const activeRole = workspaceMembers.find((m) => m.userId === userId)?.role ?? "viewer";
    if (role === "admin" && activeRole !== "owner") {
      throw new Error("Admin pozvánky může vytvářet jen owner workspace.");
    }

    // Preferovaná cesta: RPC create_workspace_invite generuje token server-side
    // a do DB ukládá jen jeho SHA-256 hash; raw token dostaneme jednou sem.
    const { data: rawToken, error: rpcError } = await supabase.rpc("create_workspace_invite", {
      p_workspace_id: activeWorkspaceId,
      p_role: role,
    });
    if (!rpcError && rawToken) {
      return `${window.location.origin}?invite=${rawToken}`;
    }

    // Fallback (RPC ještě nenasazená): starý insert s plain tokenem.
    // Po nasazení migrace 20260610120000_invite_token_hash.sql se sem už nedostane.
    const rpcMissing = rpcError?.code === "42883" || rpcError?.code === "PGRST202" ||
      /could not find.*create_workspace_invite/i.test(rpcError?.message || "");
    if (rpcError && !rpcMissing) throw rpcError;

    const token = uuid4().replace(/-/g, "");
    const { error } = await supabase.from("workspace_invites").insert({
      workspace_id: activeWorkspaceId,
      role,
      token,
      invited_by: userId,
    });
    if (error) throw error;
    return `${window.location.origin}?invite=${token}`;
  }, [activeWorkspaceId, userId, workspaceMembers]);

  const acceptInvite = useCallback(async (token) => {
    const { data: acceptedWsId, error: rpcError } = await supabase.rpc("accept_workspace_invite", {
      invite_token: token,
    });
    if (!rpcError && acceptedWsId) return acceptedWsId;
    const rpcMissing = rpcError?.code === "42883" || rpcError?.code === "PGRST202" || /could not find.*accept_workspace_invite/i.test(rpcError?.message || "");
    if (rpcMissing) {
      throw new Error("Přijímání pozvánek vyžaduje nasazenou RPC funkci accept_workspace_invite.");
    }
    throw new Error(rpcError?.message || "Pozvánka není platná nebo vypršela");
  }, []);

  // Handle invite token from URL on login
  useEffect(() => {
    if (!userId || !loaded) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (!token) return;
    (async () => {
      try {
        const wsId = await acceptInvite(token);
        const wsList = await workspaceService.fetchWorkspaces(userId);
        setWorkspaces(wsList);
        await switchWorkspace(wsId);
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        console.error("invite accept error:", e);
      }
    })();
  }, [userId, loaded, acceptInvite, switchWorkspace]);

  const openNote = useCallback((id) => {
    setPage("notes");
    setOpenNoteId(id);
    setTaskDetail(null);
  }, []);

  const updateProfileDisplayName = useCallback(async (displayName) => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    if (!userId) return;
    const { error } = await supabase.from("user_profiles").upsert(
      { id: userId, display_name: trimmed, email: session?.user?.email },
      { onConflict: "id" }
    );
    if (error) throw error;
    setWorkspaceMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, displayName: trimmed } : m))
    );
  }, [userId, session]);

  const t = theme(dk, uiSettings.accent);

  const openProject = useCallback((id) => {
    setSelProject(id);
    setPage("project-detail");
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("signOut error", e);
    }
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("sb-")) localStorage.removeItem(key);
    });
    window.location.reload();
  }, []);

  const ctx = useMemo(() => ({
    t,
    dk,
    setDk,
    pushUndo,
    popUndo,
    undoAvailable,
    uiSettings,
    updateUiSettings,
    accentThemes: ACCENT_THEMES,
    loaded,
    loadError,
    setLoadError,
    setLoaded,
    updateProfileDisplayName,
    projects,
    deletedProjects,
    tasks,
    deletedTasks,
    tags,
    addProject,
    updateProject,
    deleteProject,
    restoreProject,
    hardDeleteProject,
    reorderProjects,
    reorderTasks,
    addTask,
    updateTask,
    deleteTask,
    restoreTask,
    hardDeleteTask,
    addTag,
    updateTag,
    deleteTag,
    page,
    prevPage: prevPageRef.current,
    setPage,
    timelineOffsetDays,
    setTimelineOffsetDays,
    selProject,
    setSelProject,
    openProject,
    taskDetail,
    setTaskDetail,
    search,
    setSearch,
    dashFilter,
    setDashFilter,
    tasksPageFilter,
    setTasksPageFilter,
    notes,
    deletedNotes,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    hardDeleteNote,
    openNote,
    openNoteId,
    setOpenNoteId,
    quickTodos,
    addQuickTodo,
    archiveQuickTodo,
    restoreQuickTodo,
    deleteQuickTodo,
    updateQuickTodo,
    clearArchivedQuickTodos,
    cmdOpen,
    setCmdOpen,
    isMobile,
    attachments,
    uploadAttachment,
    deleteAttachment,
    workspaces,
    activeWorkspaceId,
    workspaceMembers,
    workspaceRole: workspaceMembers.find((m) => m.userId === userId)?.role ?? "viewer",
    switchWorkspace,
    createWorkspace,
    generateInviteLink,
    acceptInvite,
    renameWorkspace,
    updateMemberRole,
    removeMember,
    leaveWorkspace,
    fetchWorkspaceInvites,
    revokeInvite,
    refetchAll,
    userId,
    userEmail,
    isSystemAdmin,
    logout,
    // Error queue
    errorQueue,
    clearErrors,
    // Koš — AdminPage čte `trash` + `permanentlyDelete*`; mapujeme na interní deleted*/hardDelete*
    trash: { tasks: deletedTasks, projects: deletedProjects, notes: deletedNotes },
    permanentlyDeleteTask: hardDeleteTask,
    permanentlyDeleteProject: hardDeleteProject,
    permanentlyDeleteNote: hardDeleteNote,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [t, dk, uiSettings, loaded, loadError, projects, deletedProjects, tasks, deletedTasks, tags,
    notes, deletedNotes, quickTodos, attachments, workspaces, activeWorkspaceId, workspaceMembers,
    page, selProject, taskDetail, search, dashFilter, tasksPageFilter, openNoteId, cmdOpen,
    isMobile, errorQueue, userId, userEmail, isSystemAdmin, undoAvailable,
    setDk, updateUiSettings, setLoadError, setLoaded, updateProfileDisplayName, pushUndo, popUndo,
    addProject, updateProject, deleteProject, restoreProject, hardDeleteProject, reorderProjects,
    pushUndo, popUndo, undoAvailable,
    reorderTasks, addTask, updateTask, deleteTask, restoreTask, hardDeleteTask,
    addTag, updateTag, deleteTag, setPage, setTimelineOffsetDays, timelineOffsetDays,
    setSelProject, openProject, setTaskDetail, setSearch, setDashFilter, setTasksPageFilter,
    addNote, updateNote, deleteNote, restoreNote, hardDeleteNote, openNote, setOpenNoteId,
    addQuickTodo, archiveQuickTodo, restoreQuickTodo, deleteQuickTodo, updateQuickTodo,
    clearArchivedQuickTodos, setCmdOpen, uploadAttachment, deleteAttachment,
    switchWorkspace, createWorkspace, generateInviteLink, acceptInvite, renameWorkspace,
    updateMemberRole, removeMember, leaveWorkspace, fetchWorkspaceInvites, revokeInvite,
    refetchAll, logout, clearErrors, hardDeleteTask, hardDeleteProject, hardDeleteNote]);

  return (
    <AppContext.Provider value={ctx}>
      {children}
    </AppContext.Provider>
  );
}
