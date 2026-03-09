import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";

import { supabase } from "../supabase.js";
import theme from "../theme.js";
import { uuid4, parseYMD, useDebouncedEffect } from "../utils.js";

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
   Supabase DB helpers
───────────────────────────────────────────── */
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
    name: "Nápady na później",
    description: "Nápady k promyšlení a návratu",
    status: "idea",
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

async function dbSeedIfEmpty(userId) {
  const { count: pCount, error: pCountErr } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true });
  if (pCountErr) throw pCountErr;
  if ((pCount || 0) === 0) {
    const rows = DEF_PROJECTS.map((p) => ({
      id: uuid4(),
      owner: userId,
      name: p.name,
      description: p.description || "",
      status: p.status || "active",
    }));
    const { error } = await supabase.from("projects").insert(rows);
    if (error) throw error;
  }
  const { count: tCount, error: tCountErr } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true });
  if (tCountErr) throw tCountErr;
  if ((tCount || 0) === 0) {
    const rows = DEF_TAGS.map((t) => ({
      id: uuid4(),
      owner: userId,
      name: t.name,
      color: t.color,
    }));
    const { error } = await supabase.from("tags").insert(rows);
    if (error) throw error;
  }
}

async function dbFetchMembers(wsId) {
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", wsId);
  if (error) throw error;
  const list = members || [];
  let profileMap = {};
  if (list.length > 0) {
    try {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("id, email, display_name")
        .in("id", list.map((m) => m.user_id));
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });
    } catch (_) { /* user_profiles not created yet */ }
  }
  return list.map((m) => ({
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    email: profileMap[m.user_id]?.email ?? null,
    displayName: profileMap[m.user_id]?.display_name ?? null,
  }));
}

async function dbFetchWorkspaces(userId) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, joined_at, workspaces(id, name, created_at, created_by)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data || []).map((m) => ({
    id: m.workspaces.id,
    name: m.workspaces.name,
    role: m.role,
    createdAt: m.workspaces.created_at ? new Date(m.workspaces.created_at).getTime() : Date.now(),
  }));
}

async function dbEnsurePersonalWorkspace(userId) {
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);
  if (memberships && memberships.length > 0) return memberships[0].workspace_id;
  const wsId = uuid4();
  const { error: wsErr } = await supabase.from("workspaces").insert({
    id: wsId,
    name: "Osobní",
    created_by: userId,
  });
  if (wsErr) throw wsErr;
  const { error: memErr } = await supabase.from("workspace_members").insert({
    workspace_id: wsId,
    user_id: userId,
    role: "owner",
  });
  if (memErr) throw memErr;
  return wsId;
}

async function dbFetchAll(userId, workspaceId) {
  const { data: projects, error: pErr } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (pErr) throw pErr;

  const { data: tasks, error: tErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });
  if (tErr) throw tErr;

  const { data: tags, error: gErr } = await supabase
    .from("tags")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (gErr) throw gErr;

  const { data: taskTags, error: ttErr } = await supabase
    .from("task_tags")
    .select("task_id, tag_id");
  if (ttErr) throw ttErr;

  const tagMap = new Map();
  (taskTags || []).forEach((x) => {
    if (!tagMap.has(x.task_id)) tagMap.set(x.task_id, []);
    tagMap.get(x.task_id).push(x.tag_id);
  });

  const tasksNorm = (tasks || []).map((t) => ({
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    status: t.status || "todo",
    priority: t.priority ?? null,
    dueDate: t.due_date ?? null,
    projectId: t.project_id ?? null,
    tagIds: tagMap.get(t.id) || [],
    position: t.position ?? Date.now(),
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : Date.now(),
    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null,
    phases: Array.isArray(t.phases) ? t.phases : [],
    starred: !!t.starred,
    recurrence: t.recurrence ?? null,
    assigneeUserId: t.assignee_user_id ?? null,
  }));

  const projectsNorm = (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: p.status || "active",
    tags: [],
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
  }));

  const tagsNorm = (tags || []).map((tg) => ({
    id: tg.id,
    name: tg.name,
    color: tg.color || "#6366f1",
  }));

  const { data: notes, error: nErr } = await supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });
  if (nErr) console.warn("notes table:", nErr.message);

  const notesNorm = (notes || []).map((n) => ({
    id: n.id,
    title: n.title || "",
    content: n.content || "",
    primaryProjectId: n.primary_project_id || null,
    primaryTaskId: n.primary_task_id || null,
    pinned: !!n.pinned,
    createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
  }));

  const { data: atts, error: aErr } = await supabase
    .from("attachments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (aErr) console.warn("attachments table:", aErr.message);

  const attsNorm = (atts || []).map((a) => ({
    id: a.id,
    taskId: a.task_id ?? null,
    projectId: a.project_id ?? null,
    noteId: a.note_id ?? null,
    name: a.name,
    size: a.size ?? null,
    mimeType: a.mime_type ?? null,
    storagePath: a.storage_path,
    createdAt: a.created_at ? new Date(a.created_at).getTime() : Date.now(),
  }));

  return { projects: projectsNorm, tasks: tasksNorm, tags: tagsNorm, notes: notesNorm, attachments: attsNorm };
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
  const [tags, setTags] = useState([]);
  const [notes, setNotes] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceIdRaw] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);

  const setActiveWorkspaceId = useCallback(async (wsId) => {
    setActiveWorkspaceIdRaw(wsId);
    if (wsId) {
      const normalized = await dbFetchMembers(wsId);
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
        const wsId = await dbEnsurePersonalWorkspace(userId);
        const wsList = await dbFetchWorkspaces(userId);
        setWorkspaces(wsList);
        setActiveWorkspaceIdRaw(wsId);
        const normalized = await dbFetchMembers(wsId);
        setWorkspaceMembers(normalized);
        await dbSeedIfEmpty(userId);
        const data = await dbFetchAll(userId, wsId);
        setProjects(data.projects);
        setTasks(data.tasks);
        setTags(data.tags);
        setNotes(data.notes);
        setAttachments(data.attachments ?? []);
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
        const wsList = await dbFetchWorkspaces(userId);
        setWorkspaces(wsList);
        await switchWorkspace(wsId);
        window.history.replaceState({}, "", window.location.pathname);
      } catch (e) {
        console.error("invite accept error:", e);
      }
    })();
  }, [userId, loaded]);

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
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [...prev, proj]);
    (async () => {
      if (!userId) return;
      const { error } = await supabase.from("projects").insert({
        id: proj.id,
        owner: userId,
        workspace_id: activeWorkspaceId,
        created_by: userId,
        name: proj.name,
        description: proj.description,
        status: proj.status,
      });
      if (error) console.error(error);
    })();
    return proj;
  }, [userId, activeWorkspaceId]);

  const updateProject = useCallback((id, u) => {
    setProjects((p) => p.map((x) => (x.id === id ? { ...x, ...u, updatedAt: Date.now() } : x)));
    (async () => {
      const payload = {};
      if (u.name !== undefined) payload.name = u.name;
      if (u.description !== undefined) payload.description = u.description;
      if (u.status !== undefined) payload.status = u.status;
      if (!Object.keys(payload).length) return;
      const { error } = await supabase.from("projects").update(payload).eq("id", id);
      if (error) console.error(error);
    })();
  }, []);

  const deleteProject = useCallback(
    (id) => {
      setProjects((p) => p.filter((x) => x.id !== id));
      setTasks((p) => p.map((x) => (x.projectId === id ? { ...x, projectId: null } : x)));
      (async () => {
        await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
        const { error } = await supabase.from("projects").delete().eq("id", id);
        if (error) console.error(error);
      })();
      if (selProject === id) {
        setPage("projects");
        setSelProject(null);
      }
    },
    [selProject]
  );

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
      position: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      completedAt: null,
      starred: !!task?.starred,
      recurrence: task?.recurrence ?? null,
    };
    setTasks((p) => [...p, tsk]);
    (async () => {
      if (!userId) return;
      const { error } = await supabase.from("tasks").insert({
        id: tsk.id,
        owner: userId,
        workspace_id: activeWorkspaceId,
        created_by: userId,
        project_id: tsk.projectId,
        title: tsk.title,
        description: tsk.description,
        status: tsk.status,
        priority: tsk.priority,
        due_date: tsk.dueDate,
        position: tsk.position,
        starred: tsk.starred,
        phases: tsk.phases,
        ...(tsk.recurrence != null ? { recurrence: tsk.recurrence } : {}),
        completed_at: tsk.status === "done" ? new Date().toISOString() : null,
      });
      if (error) console.error(error);
      if (tsk.tagIds?.length) {
        const rows = tsk.tagIds.map((tagId) => ({ owner: userId, task_id: tsk.id, tag_id: tagId }));
        const { error: e2 } = await supabase.from("task_tags").insert(rows);
        if (e2) console.error(e2);
      }
    })();
    return tsk;
  }, [userId, activeWorkspaceId]);

  const updateTask = useCallback(
    (id, u) => {
      let prevTask = null;
      let nextTask = null;

      setTasks((p) =>
        p.map((x) => {
          if (x.id !== id) return x;
          prevTask = x;
          const up = { ...x, ...u, updatedAt: Date.now() };
          if (u.status === "done" && x.status !== "done") up.completedAt = Date.now();
          if (u.status && u.status !== "done") up.completedAt = null;
          if (u.projectId !== undefined) up.projectId = u.projectId;
          if (u.dueDate !== undefined) up.dueDate = u.dueDate;
          if (u.tagIds !== undefined) up.tagIds = u.tagIds;
          if (u.phases !== undefined) up.phases = u.phases;
          if (u.recurrence !== undefined) up.recurrence = u.recurrence;
          nextTask = up;
          return up;
        })
      );

      (async () => {
        if (!nextTask) return;
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
        if (u.recurrence !== undefined) payload.recurrence = nextTask.recurrence;
        if (u.assigneeUserId !== undefined) payload.assignee_user_id = u.assigneeUserId;
        if (u.status !== undefined) {
          payload.completed_at = nextTask.status === "done" ? new Date().toISOString() : null;
        }
        if (Object.keys(payload).length) {
          const { error } = await supabase.from("tasks").update(payload).eq("id", id);
          if (error) console.error(error);
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
              nextDue = d.toISOString().slice(0, 10);
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
            await supabase.from("tasks").insert({
              id: newTask.id, owner: userId, title: newTask.title,
              description: newTask.description, status: newTask.status,
              priority: newTask.priority, due_date: newTask.dueDate,
              project_id: newTask.projectId, position: newTask.position,
              starred: false, phases: [],
              ...(rec != null ? { recurrence: rec } : {}),
            });
            if (newTask.tagIds?.length) {
              const rows = newTask.tagIds.map((tagId) => ({ owner: userId, task_id: newTask.id, tag_id: tagId }));
              await supabase.from("task_tags").insert(rows);
            }
          })();
        }

        if (u.tagIds !== undefined) {
          const prev = prevTask?.tagIds || [];
          const next = nextTask.tagIds || [];
          const toAdd = next.filter((x) => !prev.includes(x));
          const toRemove = prev.filter((x) => !next.includes(x));
          if (toAdd.length) {
            const rows = toAdd.map((tagId) => ({ owner: userId, task_id: id, tag_id: tagId }));
            const { error: e1 } = await supabase.from("task_tags").insert(rows);
            if (e1) console.error(e1);
          }
          if (toRemove.length) {
            const { error: e2 } = await supabase.from("task_tags").delete().eq("task_id", id).in("tag_id", toRemove);
            if (e2) console.error(e2);
          }
        }
      })();
    },
    [userId]
  );

  const deleteTask = useCallback(
    (id) => {
      setTasks((p) => p.filter((x) => x.id !== id));
      if (taskDetail === id) setTaskDetail(null);
      (async () => {
        await supabase.from("task_tags").delete().eq("task_id", id);
        const { error } = await supabase.from("tasks").delete().eq("id", id);
        if (error) console.error(error);
      })();
    },
    [taskDetail]
  );

  // CRUD — Tags
  const addTag = useCallback((tag) => {
    const tg = { id: uuid4(), name: (tag?.name || "").trim() || "tag", color: tag?.color || "#6366f1" };
    setTags((p) => [...p, tg]);
    (async () => {
      if (!userId) return;
      const { error } = await supabase.from("tags").insert({ id: tg.id, owner: userId, workspace_id: activeWorkspaceId, created_by: userId, name: tg.name, color: tg.color });
      if (error) console.error(error);
    })();
    return tg;
  }, [userId, activeWorkspaceId]);

  const updateTag = useCallback((id, u) => {
    setTags((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
    (async () => {
      const payload = {};
      if (u.name !== undefined) payload.name = u.name;
      if (u.color !== undefined) payload.color = u.color;
      if (!Object.keys(payload).length) return;
      const { error } = await supabase.from("tags").update(payload).eq("id", id);
      if (error) console.error(error);
    })();
  }, []);

  const deleteTag = useCallback((id) => {
    setTags((p) => p.filter((x) => x.id !== id));
    setTasks((p) => p.map((x) => ({ ...x, tagIds: (x.tagIds || []).filter((tid) => tid !== id) })));
    (async () => {
      await supabase.from("task_tags").delete().eq("tag_id", id);
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) console.error(error);
    })();
  }, []);

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
      const { error } = await supabase.from("notes").insert({
        id: note.id,
        owner: userId,
        workspace_id: activeWorkspaceId,
        created_by: userId,
        title: note.title,
        content: note.content,
        primary_project_id: note.primaryProjectId,
        primary_task_id: note.primaryTaskId,
        pinned: note.pinned,
      });
      if (error) console.error(error);
    })();
    return note;
  }, [userId, activeWorkspaceId]);

  const updateNote = useCallback((id, u) => {
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
      const { error } = await supabase.from("notes").update(payload).eq("id", id);
      if (error) console.error(error);
    })();
  }, []);

  const deleteNote = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    (async () => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) console.error(error);
    })();
  }, []);

  const uploadAttachment = useCallback(async (file, { taskId = null, projectId = null, noteId = null } = {}) => {
    if (!userId) throw new Error("Not logged in");
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("attachments").upload(path, file);
    if (upErr) throw upErr;
    const attId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    const { error: dbErr } = await supabase.from("attachments").insert({
      id: attId,
      owner: userId,
      workspace_id: activeWorkspaceId,
      task_id: taskId,
      project_id: projectId,
      note_id: noteId,
      name: file.name,
      size: file.size,
      mime_type: file.type || null,
      storage_path: path,
    });
    if (dbErr) {
      await supabase.storage.from("attachments").remove([path]);
      throw dbErr;
    }
    const att = { id: attId, taskId, projectId, noteId, name: file.name, size: file.size, mimeType: file.type || null, storagePath: path, createdAt: Date.now() };
    setAttachments((prev) => [att, ...prev]);
    return att;
  }, [userId, activeWorkspaceId]);

  const deleteAttachment = useCallback(async (att) => {
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    await supabase.storage.from("attachments").remove([att.storagePath]);
    await supabase.from("attachments").delete().eq("id", att.id);
  }, []);

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
    if (memErr && !memErr.message.includes("duplicate")) throw memErr;
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
  };

  return (
    <AppContext.Provider value={ctx}>
      {children}
    </AppContext.Provider>
  );
}
