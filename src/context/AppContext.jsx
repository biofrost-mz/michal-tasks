import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";

import { supabase } from "../supabase.js";
import theme from "../theme.js";
import { uuid4, parseYMD, useDebouncedEffect, setGlobalProjects } from "../utils.js";
import { formatDateKey } from "../locale.js";
import * as taskService from "../services/taskService.js";
import * as noteService from "../services/noteService.js";
import * as projectService from "../services/projectService.js";
import * as tagService from "../services/tagService.js";
import * as workspaceService from "../services/workspaceService.js";
import * as quickTodoService from "../services/quickTodoService.js";
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

/* ─────────────────────────────────────────────
   Mobile detection hook
───────────────────────────────────────────── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
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

/* ─────────────────────────────────────────────
   AppProvider
───────────────────────────────────────────── */
export function AppProvider({ children }) {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const userId = session?.user?.id ?? null;
  const [dk, setDk] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [timelineOffsetDays, setTimelineOffsetDays] = useState(0);
  const isMobile = useIsMobile();
  const [selProject, setSelProject] = useState(null);

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

  const setActiveWorkspaceId = useCallback(async (wsId) => {
    setActiveWorkspaceIdRaw(wsId);
    if (wsId) {
      localStorage.setItem("lastWorkspaceId", wsId);
      const normalized = await workspaceService.fetchMembers(wsId);
      setWorkspaceMembers(normalized);
    } else {
      setWorkspaceMembers([]);
    }
  }, []);

  const [openNoteId, setOpenNoteId] = useState(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(null);

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

  // Load UI settings (only dk)
  useEffect(() => {
    (async () => {
      const s = await load(SK.SETTINGS, { dk: true });
      setDk(s?.dk ?? true);
    })();
  }, []);

  // Sync theme class to document.documentElement
  useEffect(() => {
    if (dk) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [dk]);

  // Load from Supabase after login
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    (async () => {
      const timeout = setTimeout(() => setLoaded(true), 10_000);
      try {
        setLoaded(false);
        const displayNameFromMeta = session?.user?.user_metadata?.display_name || null;
        await supabase.from("user_profiles").upsert(
          { 
            id: userId, 
            email: session?.user?.email ?? null,
            ...(displayNameFromMeta ? { display_name: displayNameFromMeta } : {})
          },
          { onConflict: "id", ignoreDuplicates: false }
        );
        const personalWsId = await workspaceService.ensurePersonalWorkspace(userId);
        const wsList = await workspaceService.fetchWorkspaces(userId);
        setWorkspaces(wsList);
        const savedWsId = localStorage.getItem("lastWorkspaceId");
        const wsId = savedWsId && wsList.find((w) => w.id === savedWsId) ? savedWsId : personalWsId;
        setActiveWorkspaceIdRaw(wsId);
        if (wsId !== personalWsId) localStorage.setItem("lastWorkspaceId", wsId);
        const normalized = await workspaceService.fetchMembers(wsId);
        setWorkspaceMembers(normalized);
        await workspaceService.seedIfEmpty(userId, wsId);
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
        console.error("load error:", e);
        setLoadError(e?.message || "Nepodařilo se načíst data");
      } finally {
        clearTimeout(timeout);
        setLoaded(true);
      }
    })();
  }, [userId]);

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
  }, [userId, loaded]);

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

  // Save dk preference
  useDebouncedEffect(() => {
    if (loaded) save(SK.SETTINGS, { dk });
  }, [dk, loaded], 350);

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
    setProjects((prev) => [...prev, proj]);
    (async () => {
      if (!userId) return;
      try {
        await projectService.insertProject({ ...proj, description: fullDesc }, userId, activeWorkspaceId);
      } catch {
        setProjects((prev) => prev.filter((x) => x.id !== proj.id));
        reportError("Projekt se nepodařilo uložit");
      }
    })();
    return proj;
  }, [userId, activeWorkspaceId, reportError]);

  const updateProject = useCallback((id, u) => {
    const prevProject = projects.find((x) => x.id === id) ?? null;
    if (!prevProject) return;
    const nextColor = u.color !== undefined ? u.color : prevProject.color;
    const nextDesc = u.description !== undefined ? u.description : prevProject.description;
    const fullDesc = nextColor ? `${nextDesc} [color:${nextColor}]`.trim() : nextDesc;

    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...u, updatedAt: Date.now() } : x)));
    (async () => {
      const payload = {};
      if (u.name !== undefined) payload.name = u.name;
      if (u.description !== undefined || u.color !== undefined) payload.description = fullDesc;
      if (u.status !== undefined) payload.status = u.status;
      if (!Object.keys(payload).length) return;
      try {
        await projectService.updateProjectDB(id, payload);
      } catch {
        if (prevProject) setProjects((p) => p.map((x) => x.id === id ? prevProject : x));
        reportError("Projekt se nepodařilo aktualizovat");
      }
    })();
  }, [projects, reportError]);

  const deleteProject = useCallback(
    (id) => {
      const target = projects.find((x) => x.id === id);
      if (!target) return;
      const updated = { ...target, status: "deleted", updatedAt: Date.now() };

      setProjects((p) => p.filter((x) => x.id !== id));
      setDeletedProjects((prev) => [...prev, updated]);

      (async () => {
        try {
          await projectService.updateProjectDB(id, { status: "deleted", updated_at: new Date().toISOString() });
        } catch {
          setProjects((p) => [...p, target]);
          setDeletedProjects((prev) => prev.filter((x) => x.id !== id));
          reportError("Projekt se nepodařilo přesunout do koše");
        }
      })();
      if (selProject === id) {
        setPage("projects");
        setSelProject(null);
      }
    },
    [selProject, projects, reportError]
  );

  // Přeuspořádání úkolů — přijme nové pole úkolů v požadovaném pořadí
  const reorderTasks = useCallback((orderedTasks) => {
    const updated = orderedTasks.map((tk, i) => ({ ...tk, position: (i + 1) * 1000 }));
    setTasks((prev) => {
      const updatedMap = new Map(updated.map((tk) => [tk.id, tk]));
      return prev.map((tk) => updatedMap.has(tk.id) ? updatedMap.get(tk.id) : tk);
    });
    (async () => {
      await Promise.all(
        updated.map((tk) => supabase.from("tasks").update({ position: tk.position }).eq("id", tk.id))
      );
    })();
  }, []);

  const reorderProjects = useCallback((orderedProjects) => {
    const updated = orderedProjects.map((p, i) => ({ ...p, position: (i + 1) * 1000 }));
    setProjects((prev) => {
      const updatedMap = new Map(updated.map((p) => [p.id, p]));
      const rest = prev.filter((p) => !updatedMap.has(p.id));
      return [...updated, ...rest];
    });
    (async () => {
      await Promise.all(
        updated.map((p) =>
          supabase.from("projects").update({ position: p.position }).eq("id", p.id)
        )
      );
    })();
  }, []);

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
      subtasks: [],
      position: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      starred: !!task?.starred,
      recurrence: task?.recurrence ?? null,
      remindAt: task?.remindAt ?? null,
    };
    setTasks((p) => [...p, tsk]);
    toast("Úkol vytvořen", "success");
    (async () => {
      if (!userId) return;
      try {
        await taskService.insertTask(tsk, userId, activeWorkspaceId);
        if (tsk.tagIds?.length) {
          await taskService.insertTaskTags(tsk.id, tsk.tagIds, userId);
        }
      } catch {
        setTasks((p) => p.filter((t) => t.id !== tsk.id));
        reportError("Úkol se nepodařilo uložit");
      }
    })();
    return tsk;
  }, [userId, activeWorkspaceId, reportError, toast]);

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
          try {
            await taskService.updateTaskDB(id, payload);
          } catch {
            setTasks((p) => p.map((x) => x.id === id ? prevTask : x));
            reportError("Úkol se nepodařilo aktualizovat");
            return;
          }
        }

        const VALID_RECURRENCE = ["daily", "weekly", "monthly"];
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
            };
            setTasks((p) => [...p, newTask]);
            (async () => {
              try {
                await taskService.insertTask(newTask, userId, activeWorkspaceId);
                if (newTask.tagIds?.length) {
                  await taskService.insertTaskTags(newTask.id, newTask.tagIds, userId);
                }
              } catch {
                setTasks((p) => p.filter((t) => t.id !== newTask.id));
              }
            })();
          }
        }

        if (u.tagIds !== undefined) {
          try {
            await taskService.syncTaskTags(id, prevTask?.tagIds || [], nextTask.tagIds || [], userId);
          } catch {
            // Tag sync failure is non-critical, don't rollback the whole task update
            reportError("Tagy se nepodařilo synchronizovat");
          }
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

      setTasks((p) => p.filter((x) => x.id !== id));
      setDeletedTasks((prev) => [...prev, updated]);
      if (taskDetail === id) setTaskDetail(null);
      toast("Úkol byl přesunut do koše", "success");

      (async () => {
        try {
          await taskService.updateTaskDB(id, { status: "deleted", updated_at: new Date().toISOString() });
        } catch {
          setTasks((p) => [...p, target]);
          setDeletedTasks((prev) => prev.filter((x) => x.id !== id));
          reportError("Úkol se nepodařilo přesunout do koše");
        }
      })();
    },
    [taskDetail, reportError, toast]
  );

  // CRUD — Tags
  const addTag = useCallback((tag) => {
    const tg = { id: uuid4(), name: (tag?.name || "").trim() || "tag", color: tag?.color || "#6366f1" };
    setTags((p) => [...p, tg]);
    (async () => {
      if (!userId) return;
      try {
        await tagService.insertTag(tg, userId, activeWorkspaceId);
      } catch {
        setTags((p) => p.filter((x) => x.id !== tg.id));
        reportError("Tag se nepodařilo uložit");
      }
    })();
    return tg;
  }, [userId, activeWorkspaceId, reportError]);

  const updateTag = useCallback((id, u) => {
    const prevTag = tags.find((x) => x.id === id) ?? null;
    setTags((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
    (async () => {
      const payload = {};
      if (u.name !== undefined) payload.name = u.name;
      if (u.color !== undefined) payload.color = u.color;
      if (!Object.keys(payload).length) return;
      try {
        await tagService.updateTagDB(id, payload);
      } catch {
        if (prevTag) setTags((p) => p.map((x) => x.id === id ? prevTag : x));
        reportError("Tag se nepodařilo aktualizovat");
      }
    })();
  }, [tags, reportError]);

  const deleteTag = useCallback((id) => {
    const prevTags = tags;
    const prevTasks = tasks;
    setTags((p) => p.filter((x) => x.id !== id));
    setTasks((p) => p.map((x) => ({ ...x, tagIds: (x.tagIds || []).filter((tid) => tid !== id) })));
    (async () => {
      try {
        await tagService.deleteTagDB(id);
      } catch {
        setTags(prevTags);
        setTasks(prevTasks);
        reportError("Tag se nepodařilo smazat");
      }
    })();
  }, [tags, tasks, reportError]);

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
    setNotes((prev) => [note, ...prev]);
    (async () => {
      if (!userId) return;
      try {
        await noteService.insertNote(note, userId, activeWorkspaceId);
      } catch {
        setNotes((prev) => prev.filter((n) => n.id !== note.id));
        reportError("Poznámka se nepodařilo uložit");
      }
    })();
    return note;
  }, [userId, activeWorkspaceId, reportError]);

  const updateNote = useCallback((id, u) => {
    const prevNote = notes.find((n) => n.id === id) ?? null;
    setNotes((prev) =>
      prev.map((n) => (n.id !== id ? n : { ...n, ...u, updatedAt: Date.now() }))
    );
    (async () => {
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
      try {
        await noteService.updateNoteDB(id, payload);
      } catch {
        if (prevNote) setNotes((prev) => prev.map((n) => n.id === id ? prevNote : n));
        reportError("Poznámka se nepodařilo aktualizovat");
      }
    })();
  }, [notes, reportError]);

  const deleteNote = useCallback((id) => {
    const target = notes.find((n) => n.id === id) ?? null;
    if (!target) return;
    const updated = { ...target, status: "deleted", updatedAt: Date.now() };

    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletedNotes((prev) => [...prev, updated]);

    (async () => {
      try {
        await noteService.updateNoteDB(id, { status: "deleted", updated_at: new Date().toISOString() });
      } catch {
        setNotes((prev) => [...prev, target]);
        setDeletedNotes((prev) => prev.filter((x) => x.id !== id));
        reportError("Poznámka se nepodařilo přesunout do koše");
      }
    })();
  }, [notes, reportError]);

  const restoreProject = useCallback((id) => {
    const target = deletedProjects.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "active", updatedAt: Date.now() };

    setDeletedProjects((prev) => prev.filter((x) => x.id !== id));
    setProjects((prev) => [...prev, restored]);

    (async () => {
      try {
        await projectService.updateProjectDB(id, { status: "active", updated_at: new Date().toISOString() });
      } catch {
        setDeletedProjects((prev) => [...prev, target]);
        setProjects((prev) => prev.filter((x) => x.id !== id));
        reportError("Projekt se nepodařilo obnovit");
      }
    })();
  }, [deletedProjects, reportError]);

  const restoreTask = useCallback((id) => {
    const target = deletedTasks.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "todo", updatedAt: Date.now() };

    setDeletedTasks((prev) => prev.filter((x) => x.id !== id));
    setTasks((prev) => [...prev, restored]);

    (async () => {
      try {
        await taskService.updateTaskDB(id, { status: "todo", updated_at: new Date().toISOString() });
      } catch {
        setDeletedTasks((prev) => [...prev, target]);
        setTasks((prev) => prev.filter((x) => x.id !== id));
        reportError("Úkol se nepodařilo obnovit");
      }
    })();
  }, [deletedTasks, reportError]);

  const restoreNote = useCallback((id) => {
    const target = deletedNotes.find((x) => x.id === id);
    if (!target) return;
    const restored = { ...target, status: "draft", updatedAt: Date.now() };

    setDeletedNotes((prev) => prev.filter((x) => x.id !== id));
    setNotes((prev) => [restored, ...prev]);

    (async () => {
      try {
        await noteService.updateNoteDB(id, { status: "draft", updated_at: new Date().toISOString() });
      } catch {
        setDeletedNotes((prev) => [...prev, target]);
        setNotes((prev) => prev.filter((x) => x.id !== id));
        reportError("Poznámka se nepodařilo obnovit");
      }
    })();
  }, [deletedNotes, reportError]);

  const hardDeleteProject = useCallback((id) => {
    const target = deletedProjects.find((x) => x.id === id);
    setDeletedProjects((prev) => prev.filter((x) => x.id !== id));

    (async () => {
      try {
        await projectService.deleteProjectDB(id);
      } catch {
        if (target) setDeletedProjects((prev) => [...prev, target]);
        reportError("Projekt se nepodařilo permanentně smazat");
      }
    })();
  }, [deletedProjects, reportError]);

  const hardDeleteTask = useCallback((id) => {
    const target = deletedTasks.find((x) => x.id === id);
    setDeletedTasks((prev) => prev.filter((x) => x.id !== id));

    (async () => {
      try {
        await taskService.deleteTaskDB(id);
      } catch {
        if (target) setDeletedTasks((prev) => [...prev, target]);
        reportError("Úkol se nepodařilo permanentně smazat");
      }
    })();
  }, [deletedTasks, reportError]);

  const hardDeleteNote = useCallback((id) => {
    const target = deletedNotes.find((x) => x.id === id);
    setDeletedNotes((prev) => prev.filter((x) => x.id !== id));

    (async () => {
      try {
        await noteService.deleteNoteDB(id);
      } catch {
        if (target) setDeletedNotes((prev) => [...prev, target]);
        reportError("Poznámka se nepodařilo permanentně smazat");
      }
    })();
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

  // CRUD — Quick Todos
  const addQuickTodo = useCallback((text, extras = {}) => {
    const qt = {
      id: uuid4(),
      text: (text || "").trim(),
      done: false,
      createdAt: Date.now(),
      priority: extras.priority ?? null,
      dueDate: extras.dueDate ?? null,
      tags: extras.tags ?? null,
      description: extras.description ?? null,
    };
    setQuickTodos((prev) => [qt, ...prev]);
    toast("Položka byla přidána", "success");
    (async () => {
      if (!userId) return;
      try {
        await quickTodoService.insertQuickTodo(qt, userId, activeWorkspaceId);
      } catch {
        setQuickTodos((prev) => prev.filter((q) => q.id !== qt.id));
        reportError("Rychlý úkol se nepodařilo uložit");
      }
    })();
    return qt;
  }, [userId, activeWorkspaceId, reportError, toast]);

  const archiveQuickTodo = useCallback((id) => {
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: true } : q));
    toast("Položka označena jako hotová ✓", "success");
    (async () => {
      try {
        await quickTodoService.updateQuickTodoDB(id, { done: true });
      } catch {
        setQuickTodos(prevTodos);
        reportError("Rychlý úkol se nepodařilo archivovat");
      }
    })();
  }, [quickTodos, reportError, toast]);

  const restoreQuickTodo = useCallback((id) => {
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: false } : q));
    toast("Položka byla obnovena", "success");
    (async () => {
      try {
        await quickTodoService.updateQuickTodoDB(id, { done: false });
      } catch {
        setQuickTodos(prevTodos);
        reportError("Rychlý úkol se nepodařilo obnovit");
      }
    })();
  }, [quickTodos, reportError, toast]);

  const deleteQuickTodo = useCallback((id) => {
    const prevTodo = quickTodos.find((q) => q.id === id) ?? null;
    setQuickTodos((prev) => prev.filter((q) => q.id !== id));
    toast("Položka byla smazána", "success");
    (async () => {
      try {
        await quickTodoService.deleteQuickTodoDB(id);
      } catch {
        if (prevTodo) setQuickTodos((prev) => [...prev, prevTodo]);
        reportError("Rychlý úkol se nepodařilo smazat");
      }
    })();
  }, [quickTodos, reportError, toast]);

  const updateQuickTodo = useCallback((id, payload) => {
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, ...payload } : q));
    toast("Změny uloženy", "success");
    (async () => {
      try {
        await quickTodoService.updateQuickTodoDB(id, payload);
      } catch {
        setQuickTodos(prevTodos);
        reportError("Rychlý úkol se nepodařilo aktualizovat");
      }
    })();
  }, [quickTodos, reportError, toast]);

  const clearArchivedQuickTodos = useCallback(() => {
    const ids = quickTodos.filter((q) => q.done).map((q) => q.id);
    if (!ids.length) return;
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.filter((q) => !q.done));
    (async () => {
      try {
        const { error } = await supabase.from("quick_todos").delete().in("id", ids);
        if (error) throw error;
      } catch {
        setQuickTodos(prevTodos);
        reportError("Archivované úkoly se nepodařilo smazat");
      }
    })();
  }, [quickTodos, reportError]);

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
    const token = uuid4().replace(/-/g, "");
    const { error } = await supabase.from("workspace_invites").insert({
      workspace_id: activeWorkspaceId,
      role,
      token,
      invited_by: userId,
    });
    if (error) throw error;
    return `${window.location.origin}?invite=${token}`;
  }, [activeWorkspaceId, userId]);

  const acceptInvite = useCallback(async (token) => {
    const { data: invite, error } = await supabase
      .from("workspace_invites")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();
    if (error || !invite) throw new Error("Pozvánka není platná nebo vypršela");
    const { error: memErr } = await supabase.from("workspace_members").insert({
      workspace_id: invite.workspace_id,
      user_id: userId,
      role: invite.role,
    });
    if (memErr && memErr.code !== "23505") throw memErr;
    await supabase.from("workspace_invites").update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);
    return invite.workspace_id;
  }, [userId]);

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

  const t = theme(dk);
  const openProject = (id) => {
    setSelProject(id);
    setPage("project-detail");
  };

  const ctx = {
    t,
    dk,
    setDk,
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
    userId,
    userEmail: session?.user?.email ?? null,
    logout: async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("signOut error", e);
      }
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith("sb-")) localStorage.removeItem(key);
      });
      window.location.reload();
    },
    // Error queue
    errorQueue,
    clearErrors,
  };

  return (
    <AppContext.Provider value={ctx}>
      {children}
    </AppContext.Provider>
  );
}
