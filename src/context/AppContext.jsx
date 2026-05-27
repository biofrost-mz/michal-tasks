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
import { uuid4, parseYMD, useDebouncedEffect } from "../utils.js";
import { formatDateKey } from "../locale.js";
import * as taskService from "../services/taskService.js";
import * as noteService from "../services/noteService.js";
import * as projectService from "../services/projectService.js";
import * as tagService from "../services/tagService.js";
import * as workspaceService from "../services/workspaceService.js";
import * as quickTodoService from "../services/quickTodoService.js";
import * as attachmentService from "../services/attachmentService.js";

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
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true, nullsFirst: false });
  if (pErr) throw pErr;

  const rawTasks = await taskService.fetchTasks(workspaceId);
  const taskIds = rawTasks.map((t) => t.id);
  const rawTaskTags = await taskService.fetchTaskTags(taskIds);

  const tagMap = new Map();
  rawTaskTags.forEach((x) => {
    if (!tagMap.has(x.task_id)) tagMap.set(x.task_id, []);
    tagMap.get(x.task_id).push(x.tag_id);
  });

  const { data: tags, error: gErr } = await supabase
    .from("tags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (gErr) throw gErr;

  const { data: notes, error: nErr } = await supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (nErr) console.warn("notes table:", nErr.message);

  const { data: atts, error: aErr } = await supabase
    .from("attachments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (aErr) console.warn("attachments table:", aErr.message);

  const { data: qts, error: qtErr } = await supabase
    .from("quick_todos")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (qtErr) console.warn("quick_todos table:", qtErr.message);

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
  const [session, setSession] = useState(null);
  const userId = session?.user?.id ?? null;
  const [dk, setDk] = useState(true);
  const [page, setPage] = useState("dashboard");
  const isMobile = useIsMobile();
  const [selProject, setSelProject] = useState(null);

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const tasksRef = useRef([]);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [quickTodos, setQuickTodos] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdRaw] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

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
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
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

  // Load from Supabase after login
  useEffect(() => {
    if (!userId) { setLoaded(true); return; }

    (async () => {
      const timeout = setTimeout(() => setLoaded(true), 10_000);
      try {
        setLoaded(false);
        await supabase.from("user_profiles").upsert(
          { id: userId, email: session?.user?.email ?? null },
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
        setProjects(data.projects);
        setTasks(data.tasks);
        setTags(data.tags);
        setNotes(data.notes);
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
          setTasks((prev) => prev.map((t) => t.id === payload.new.id ? taskService.normalizeTask(payload.new, t.tagIds) : t));
        } else if (payload.eventType === "INSERT") {
          setTasks((prev) => prev.some((t) => t.id === payload.new.id) ? prev : [...prev, taskService.normalizeTask(payload.new, [])]);
        } else if (payload.eventType === "DELETE") {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
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
    const proj = {
      id: uuid4(),
      name: (p?.name || "").trim() || "Nový projekt",
      description: p?.description || "",
      status: p?.status || "active",
      tags: [],
      position: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [...prev, proj]);
    (async () => {
      if (!userId) return;
      try {
        await projectService.insertProject(proj, userId, activeWorkspaceId);
      } catch {
        setProjects((prev) => prev.filter((x) => x.id !== proj.id));
        reportError("Projekt se nepodařilo uložit");
      }
    })();
    return proj;
  }, [userId, activeWorkspaceId, reportError]);

  const updateProject = useCallback((id, u) => {
    const prevProject = projects.find((x) => x.id === id) ?? null;
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...u, updatedAt: Date.now() } : x)));
    (async () => {
      const payload = {};
      if (u.name !== undefined) payload.name = u.name;
      if (u.description !== undefined) payload.description = u.description;
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
      const prevProjects = projects;
      const prevTasks = tasks;
      setProjects((p) => p.filter((x) => x.id !== id));
      setTasks((p) => p.map((x) => (x.projectId === id ? { ...x, projectId: null } : x)));
      (async () => {
        try {
          await projectService.deleteProjectDB(id);
        } catch {
          setProjects(prevProjects);
          setTasks(prevTasks);
          reportError("Projekt se nepodařilo smazat");
        }
      })();
      if (selProject === id) {
        setPage("projects");
        setSelProject(null);
      }
    },
    [selProject, projects, tasks, reportError]
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
  }, [userId, activeWorkspaceId, reportError]);

  const updateTask = useCallback(
    (id, u) => {
      // Compute prev/next synchronně z ref — vyhne se stale closure a race condition
      const prevTask = tasksRef.current.find((x) => x.id === id) ?? null;
      if (!prevTask) return;
      const nextTask = { ...prevTask, ...u, updatedAt: Date.now() };
      if (u.status === "done" && prevTask.status !== "done") nextTask.completedAt = Date.now();
      if (u.status && u.status !== "done") nextTask.completedAt = null;

      setTasks((p) => p.map((x) => (x.id === id ? nextTask : x)));

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
          if (nextTask.dueDate) {
            const parsed = parseYMD(nextTask.dueDate);
            if (parsed && !isNaN(parsed)) {
              const d = new Date(parsed);
              if (rec === "daily") d.setDate(d.getDate() + 1);
              else if (rec === "weekly") d.setDate(d.getDate() + 7);
              else if (rec === "monthly") d.setMonth(d.getMonth() + 1);
              nextDue = formatDateKey(d);
            }
          }
          const newId = uuid4();
          const newTask = {
            id: newId,
            title: nextTask.title,
            description: nextTask.description,
            status: "todo",
            priority: nextTask.priority,
            dueDate: nextDue,
            projectId: nextTask.projectId,
            tagIds: nextTask.tagIds || [],
            phases: [],
            subtasks: [],
            position: Date.now() + 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: null,
            starred: false,
            recurrence: rec,
          };
          setTasks((p) => [...p, newTask]);
          (async () => {
            if (!userId) return;
            try {
              await taskService.insertTask({ ...newTask, recurrence: rec }, userId, activeWorkspaceId);
              if (newTask.tagIds?.length) {
                await taskService.insertTaskTags(newTask.id, newTask.tagIds, userId);
              }
            } catch {
              setTasks((p) => p.filter((t) => t.id !== newTask.id));
            }
          })();
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
    [userId, activeWorkspaceId, reportError]
  );

  const deleteTask = useCallback(
    (id) => {
      const prevTask = tasksRef.current.find((x) => x.id === id) ?? null;
      setTasks((p) => p.filter((x) => x.id !== id));
      if (taskDetail === id) setTaskDetail(null);
      (async () => {
        try {
          await taskService.deleteTaskDB(id);
        } catch {
          if (prevTask) setTasks((p) => [...p, prevTask]);
          reportError("Úkol se nepodařilo smazat");
        }
      })();
    },
    [taskDetail, reportError]
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
      pinned: false,
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
      if (u.pinned !== undefined) payload.pinned = u.pinned;
      try {
        await noteService.updateNoteDB(id, payload);
      } catch {
        if (prevNote) setNotes((prev) => prev.map((n) => n.id === id ? prevNote : n));
        reportError("Poznámka se nepodařilo aktualizovat");
      }
    })();
  }, [notes, reportError]);

  const deleteNote = useCallback((id) => {
    const prevNote = notes.find((n) => n.id === id) ?? null;
    setNotes((prev) => prev.filter((n) => n.id !== id));
    (async () => {
      try {
        await noteService.deleteNoteDB(id);
      } catch {
        if (prevNote) setNotes((prev) => [...prev, prevNote]);
        reportError("Poznámka se nepodařilo smazat");
      }
    })();
  }, [notes, reportError]);

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
  }, [userId, activeWorkspaceId, reportError]);

  const archiveQuickTodo = useCallback((id) => {
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: true } : q));
    (async () => {
      try {
        await quickTodoService.updateQuickTodoDB(id, { done: true });
      } catch {
        setQuickTodos(prevTodos);
        reportError("Rychlý úkol se nepodařilo archivovat");
      }
    })();
  }, [quickTodos, reportError]);

  const restoreQuickTodo = useCallback((id) => {
    const prevTodos = quickTodos;
    setQuickTodos((prev) => prev.map((q) => q.id === id ? { ...q, done: false } : q));
    (async () => {
      try {
        await quickTodoService.updateQuickTodoDB(id, { done: false });
      } catch {
        setQuickTodos(prevTodos);
        reportError("Rychlý úkol se nepodařilo obnovit");
      }
    })();
  }, [quickTodos, reportError]);

  const deleteQuickTodo = useCallback((id) => {
    const prevTodo = quickTodos.find((q) => q.id === id) ?? null;
    setQuickTodos((prev) => prev.filter((q) => q.id !== id));
    (async () => {
      try {
        await quickTodoService.deleteQuickTodoDB(id);
      } catch {
        if (prevTodo) setQuickTodos((prev) => [...prev, prevTodo]);
        reportError("Rychlý úkol se nepodařilo smazat");
      }
    })();
  }, [quickTodos, reportError]);

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
      setProjects(data.projects);
      setTasks(data.tasks);
      setTags(data.tags);
      setNotes(data.notes);
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
    projects,
    tasks,
    tags,
    addProject,
    updateProject,
    deleteProject,
    reorderProjects,
    reorderTasks,
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
    notes,
    addNote,
    updateNote,
    deleteNote,
    openNote,
    openNoteId,
    setOpenNoteId,
    quickTodos,
    addQuickTodo,
    archiveQuickTodo,
    restoreQuickTodo,
    deleteQuickTodo,
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
    logout: () => supabase.auth.signOut(),
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
