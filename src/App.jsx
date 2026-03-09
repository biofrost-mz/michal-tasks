import React, {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
} from "react";

import { supabase } from "./supabase.js";
function AuthGate({ children }) {
  const { t } = useApp();
  const toast = useToast();

  const [session, setSession] = useState(null);
  const [authMode, setAuthMode] = useState("magic"); // "magic" | "password"
  const [signMode, setSignMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const sendMagicLink = async () => {
    const e = email.trim();
    if (!e) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: e,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) { toast(error.message || "Chyba", "error"); return; }
    setSent(true);
  };

  const handlePassword = async () => {
    const e = email.trim();
    if (!e || !password) return;
    setSending(true);
    let error;
    if (signMode === "signup") {
      ({ error } = await supabase.auth.signUp({ email: e, password }));
      if (!error) toast("Účet vytvořen! Zkontroluj email pro potvrzení.", "success");
    } else {
      ({ error } = await supabase.auth.signInWithPassword({ email: e, password }));
    }
    setSending(false);
    if (error) toast(error.message || "Chyba přihlášení", "error");
  };

  const handleForgotPassword = async () => {
    const e = email.trim();
    if (!e) { toast("Zadej nejdřív email", "error"); return; }
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(e, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    setSending(false);
    if (error) { toast(error.message || "Chyba", "error"); return; }
    toast("Odkaz pro reset hesla odeslán", "success");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    toast("Odhlášeno", "success");
  };

  if (!session) {
    const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 14, boxSizing: "border-box" };
    const btnStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" };

    return (
      <div style={{ minHeight: "100vh", background: t.bg, color: t.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: 400, maxWidth: "100%", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 16, padding: "28px 28px 24px", boxShadow: t.shadow }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>M</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px" }}>Michal Tasks</span>
          </div>

          {/* Mode toggle */}
          <div style={{ display: "flex", background: t.input, borderRadius: 9, padding: 3, marginBottom: 20 }}>
            {[["magic", "Magic link"], ["password", "Email + heslo"]].map(([m, label]) => (
              <button key={m} onClick={() => { setAuthMode(m); setSent(false); }} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: authMode === m ? t.bg2 : "transparent", color: authMode === m ? t.text : t.text3, fontSize: 12.5, fontWeight: authMode === m ? 600 : 400, cursor: "pointer", transition: "all .15s" }}>
                {label}
              </button>
            ))}
          </div>

          {authMode === "magic" ? (
            sent ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📬</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Odkaz odeslán</div>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 16 }}>Zkontroluj email <strong>{email}</strong> a klikni na odkaz.</div>
                <button onClick={() => { setSent(false); setEmail(""); }} style={{ ...btnStyle, background: "transparent", color: t.accent, border: `1px solid ${t.accent}`, width: "auto", padding: "7px 20px" }}>Zpět</button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, color: t.text2, marginBottom: 12 }}>Zadej email a pošleme ti přihlašovací odkaz.</div>
                <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMagicLink()} placeholder="email@example.com" type="email" style={{ ...inputStyle, marginBottom: 10 }} />
                <button onClick={sendMagicLink} disabled={!email.trim() || sending} style={{ ...btnStyle, opacity: !email.trim() || sending ? 0.6 : 1 }}>
                  {sending ? "Odesílám…" : "Poslat přihlašovací odkaz"}
                </button>
              </>
            )
          ) : (
            <>
              {/* Sign in / Sign up toggle */}
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                {[["signin", "Přihlásit se"], ["signup", "Registrovat"]].map(([m, label]) => (
                  <button key={m} onClick={() => setSignMode(m)} style={{ background: "none", border: "none", color: signMode === m ? t.accent : t.text3, fontSize: 13, fontWeight: signMode === m ? 700 : 400, cursor: "pointer", padding: "0 0 4px", borderBottom: signMode === m ? `2px solid ${t.accent}` : "2px solid transparent" }}>
                    {label}
                  </button>
                ))}
              </div>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...inputStyle, marginBottom: 8 }} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePassword()} placeholder={signMode === "signup" ? "Nové heslo (min. 6 znaků)" : "Heslo"} type="password" style={{ ...inputStyle, marginBottom: 12 }} />
              <button onClick={handlePassword} disabled={!email.trim() || !password || sending} style={{ ...btnStyle, opacity: !email.trim() || !password || sending ? 0.6 : 1, marginBottom: 8 }}>
                {sending ? "Čekejte…" : signMode === "signup" ? "Vytvořit účet" : "Přihlásit se"}
              </button>
              {signMode === "signin" && (
                <button onClick={handleForgotPassword} style={{ background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer", padding: 0, width: "100%", textAlign: "center" }}>
                  Zapomenuté heslo?
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return <div style={{ height: "100%" }}>{children}</div>;
}
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



// UUID v4 (for Supabase primary keys). Uses crypto.randomUUID when available.
function uuid4() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/* ─────────────────────────────────────────────
   Supabase DB helpers (clean start)
───────────────────────────────────────────── */
async function dbSeedIfEmpty(userId) {
  // Seed default projects if none exist for this user
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

  // Seed default tags if none exist for this user
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
  // Enrich with profiles — non-fatal if table doesn't exist yet
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
  // Check if user already has a workspace
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);
  if (memberships && memberships.length > 0) return memberships[0].workspace_id;

  // Create personal workspace
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
    dueDate: t.due_date ?? null, // YYYY-MM-DD
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
    tags: [], // not used yet
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
  if (nErr) console.warn("notes table:", nErr.message); // table may not exist yet — non-fatal

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
   Config
───────────────────────────────────────────── */
const STATUSES = {
  todo:    { label: "To do",         color: "#8b95a5", icon: "circle",       bg: "#8b95a515" },
  doing:   { label: "Rozpracováno",  color: "#3b82f6", icon: "play-circle",  bg: "#3b82f615" },
  waiting: { label: "Čekám",         color: "#f59e0b", icon: "pause-circle", bg: "#f59e0b15" },
  done:    { label: "Hotovo",        color: "#22c55e", icon: "check-circle", bg: "#22c55e15" },
};
const STATUS_KEYS = Object.keys(STATUSES);
const STATUS_SHORT = { todo: "To do", doing: "Začít", waiting: "Čekám", done: "Hotovo" };

const PRIORITIES = {
  low:    { label: "Nízká",   color: "#22c55e", bg: "#22c55e18", icon: "minus"    },
  medium: { label: "Střední", color: "#f59e0b", bg: "#f59e0b18", icon: "minus"    },
  high:   { label: "Vysoká",  color: "#ef4444", bg: "#ef444418", icon: "arrow-up" },
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
const PROJECT_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#6366f1", "#f97316",
];

function projectColor(projectId) {
  if (!projectId) return "#64748b";
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

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
   Confirm Dialog
───────────────────────────────────────────── */
const ConfirmCtx = createContext(null);
const useConfirm = () => useContext(ConfirmCtx);

function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { msg, resolve }
  const confirm = useCallback((msg) => new Promise((resolve) => setState({ msg, resolve })), []);
  const handle = (ok) => { state?.resolve(ok); setState(null); };
  const { t } = useApp();
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#0006", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="pop" style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: "24px 28px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px #0005" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 20, lineHeight: 1.45 }}>{state.msg}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => handle(false)} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 13, fontWeight: 500 }}>
                Zrušit
              </button>
              <button onClick={() => handle(true)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600 }}>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ─────────────────────────────────────────────
   Main App
───────────────────────────────────────────── */
export default function MichalTasks() {
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

  // Load
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
        // Upsert user profile with email
        await supabase.from("user_profiles").upsert(
          { id: userId, email: session?.user?.email ?? null },
          { onConflict: "id", ignoreDuplicates: false }
        );
        // Ensure user has a workspace (creates personal one if needed)
        const wsId = await dbEnsurePersonalWorkspace(userId);
        // Fetch all workspaces for this user
        const wsList = await dbFetchWorkspaces(userId);
        setWorkspaces(wsList);
        setActiveWorkspaceIdRaw(wsId);
        // Fetch members of active workspace
        const normalized = await dbFetchMembers(wsId);
        setWorkspaceMembers(normalized);
        // Seed and fetch data for active workspace
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

  // CRUD — Projects (Supabase, optimistic)
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

    // fire-and-forget
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
        // move tasks to inbox
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

  // CRUD — Tasks (Supabase, optimistic)
  const addTask = useCallback((task) => {
    const tsk = {
      id: uuid4(),
      title: (task?.title || "").trim(),
      description: task?.description || "",
      status: task?.status || "todo",
      priority: task?.priority ?? null,
      dueDate: task?.dueDate ?? null, // YYYY-MM-DD
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

          // normalize optional fields
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

        // Auto-create next recurrence when task is marked done
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

  // CRUD — Tags (Supabase, optimistic)
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

  // CRUD — Notes (Supabase, optimistic)
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
      await supabase.storage.from("attachments").remove([path]); // rollback orphan
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

  if (!loaded) {
    const bgColor = dk ? "#0c0e14" : "#f0f4ff";
    const textColor = dk ? "#e8ecf4" : "#1a1e2e";
    const subColor = dk ? "#8892a4" : "#64748b";
    const trackColor = dk ? "#1e2638" : "#e2e8f0";
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: bgColor }}>
        {/* Logo mark */}
        <div style={{ animation: "logoIn 0.65s cubic-bezier(0.34,1.56,0.64,1) both", marginBottom: 22 }}>
          <svg width="76" height="76" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="52" height="52" rx="14" fill="#3b82f6"/>
            {/* Task 1 – done */}
            <circle cx="15.5" cy="18" r="5" fill="white" opacity="0.95"/>
            <path d="M12.8 18 L14.9 20.1 L18.2 15.8" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="24" y="15.5" width="14" height="3" rx="1.5" fill="white" opacity="0.95"/>
            {/* Task 2 – in progress */}
            <circle cx="15.5" cy="28" r="5" stroke="white" strokeWidth="2" fill="none" opacity="0.75"/>
            <path d="M13 28 L15 30 L18 26" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"/>
            <rect x="24" y="25.5" width="11" height="3" rx="1.5" fill="white" opacity="0.75"/>
            {/* Task 3 – todo */}
            <circle cx="15.5" cy="38" r="5" stroke="white" strokeWidth="2" fill="none" opacity="0.4"/>
            <rect x="24" y="35.5" width="8" height="3" rx="1.5" fill="white" opacity="0.4"/>
          </svg>
        </div>
        {/* App name */}
        <div style={{ animation: "textIn 0.5s ease-out 0.15s both", textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px", fontFamily: "'Outfit',sans-serif", color: textColor, lineHeight: 1 }}>
            Michal Tasks
          </div>
          <div style={{ fontSize: 11, color: subColor, marginTop: 5, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Task management
          </div>
        </div>
        {/* Loader / error */}
        {loadError ? (
          <div style={{ animation: "textIn 0.4s ease-out both", textAlign: "center", maxWidth: 280 }}>
            <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
              Nepodařilo se načíst data.<br />
              <span style={{ opacity: 0.6, fontSize: 11 }}>{loadError}</span>
            </div>
            <button
              onClick={() => { setLoadError(null); setLoaded(false); window.location.reload(); }}
              style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Zkusit znovu
            </button>
          </div>
        ) : (
          <div style={{ animation: "textIn 0.5s ease-out 0.35s both" }}>
            <svg width="38" height="38" viewBox="0 0 38 38" style={{ display: "block", animation: "spin 0.9s linear infinite" }}>
              <circle cx="19" cy="19" r="15" stroke={trackColor} strokeWidth="2.5" fill="none"/>
              <circle cx="19" cy="19" r="15" stroke="#3b82f6" strokeWidth="2.5" fill="none"
                strokeDasharray="30 65" strokeLinecap="round"/>
            </svg>
          </div>
        )}
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
      <ToastProvider>
        <ConfirmProvider>
        <AuthGate>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Figtree:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}
          html,body,#root{width:100%;height:100%;font-family:'Figtree',sans-serif;background:${t.bg};color:${t.text}}
          html{overscroll-behavior:none;overflow-x:hidden}
          body{overflow-x:hidden}
          h1,h2,h3{font-family:'Outfit',sans-serif}
          ::-webkit-scrollbar{width:5px;height:5px}
          ::-webkit-scrollbar-track{background:transparent}
          ::-webkit-scrollbar-thumb{background:${t.border};border-radius:3px}
          ::selection{background:${t.accent}33}
          input,textarea,select{font-family:'Figtree',sans-serif;-webkit-appearance:none;border-radius:0}
          @media(max-width:767px){input,textarea,select{font-size:16px !important}}
          button{font-family:'Figtree',sans-serif;cursor:pointer}
          .mono{font-family:'JetBrains Mono',monospace}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes slideRight{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
          @keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
          @keyframes toastIn{from{opacity:0;transform:translateY(12px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
          @keyframes pop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
          @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
          @keyframes logoIn{0%{opacity:0;transform:scale(0.7) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
          @keyframes textIn{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
          .fi{animation:fadeIn .2s ease-out}
          .sr{animation:slideRight .2s ease-out}
          .su{animation:slideUp .28s cubic-bezier(.32,1,.4,1)}
          .pop{animation:pop .2s ease-out}
          .mobile-nav-bar{padding-bottom:env(safe-area-inset-bottom,0px)}
        `}</style>

        <div style={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
          {!isMobile && <Sidebar toggleDk={() => setDk(!dk)} />}
          <main style={{ flex: 1, minWidth: 0, width: isMobile ? "100%" : "auto", overflow: "auto", position: "relative", paddingBottom: isMobile ? 66 : 0 }}>
            {page === "dashboard" && <Dashboard />}
            {page === "projects" && <ProjectsPage />}
            {page === "project-detail" && <ProjectDetail />}
            {page === "tasks" && <AllTasksPage />}
            {page === "timeline" && <TimelinePage />}
            {page === "tags" && <TagsPage />}
            {page === "notes" && <NotesPage />}
            {page === "workspace-settings" && <WorkspaceSettingsPage />}
            {page === "user-profile" && <UserProfilePage />}
          </main>
          {taskDetail && <TaskDrawer />}
          {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
          {isMobile && <MobileNav toggleDk={() => setDk(!dk)} />}
        </div>
        </AuthGate>
        </ConfirmProvider>
      </ToastProvider>
    </AppContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   User Profile Page
───────────────────────────────────────────── */
function UserProfilePage() {
  const { t, setPage, isMobile, userEmail, userId, workspaceMembers, logout } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const me = workspaceMembers.find((m) => m.userId === userId);
  const [displayName, setDisplayName] = useState(me?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("user_profiles").upsert(
        { id: userId, display_name: displayName.trim(), email: userEmail },
        { onConflict: "id" }
      );
      if (error) throw error;
      toast("Jméno uloženo", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}?reset=1`,
    });
    if (error) { toast(error.message || "Chyba", "error"); return; }
    setResetSent(true);
    toast("Odkaz pro reset hesla odeslán na email", "success");
  };

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
    await logout();
  };

  const initials = (me?.displayName || userEmail || "?").slice(0, 2).toUpperCase();

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "28px 32px", maxWidth: 560 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
          <Icon name="chevron-left" size={18} color={t.text3} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Můj profil</div>
      </div>

      {/* Avatar + email */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{me?.displayName || "—"}</div>
          <div style={{ fontSize: 13, color: t.text2 }}>{userEmail}</div>
          <div style={{ fontSize: 11, color: t.text3, marginTop: 2 }}>{me?.role ?? "owner"} · {workspaceMembers.length} členů</div>
        </div>
      </div>

      {/* Display name */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Zobrazované jméno</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            placeholder="Tvoje jméno…"
            style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14 }}
          />
          <button onClick={handleSaveName} disabled={!displayName.trim() || saving} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !displayName.trim() || saving ? 0.6 : 1 }}>
            {saving ? "Ukládám…" : "Uložit"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: t.text3, marginTop: 6 }}>Toto jméno vidí ostatní členové workspace.</div>
      </div>

      {/* Password reset */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Heslo</div>
        {resetSent ? (
          <div style={{ fontSize: 13, color: "#22c55e" }}>Odkaz pro reset hesla byl odeslán na {userEmail}</div>
        ) : (
          <button onClick={handleResetPassword} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
            Odeslat odkaz pro reset hesla
          </button>
        )}
      </div>

      {/* Logout */}
      <div style={{ background: t.bg2, border: `1px solid #ef444430`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Odhlášení</div>
        <button onClick={handleLogout} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Odhlásit se
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Workspace Settings Page
───────────────────────────────────────────── */
function WorkspaceSettingsPage() {
  const { t, workspaces, activeWorkspaceId, workspaceMembers, workspaceRole, userId,
    renameWorkspace, updateMemberRole, removeMember, leaveWorkspace,
    generateInviteLink, fetchWorkspaceInvites, revokeInvite, setPage, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const active = workspaces.find((w) => w.id === activeWorkspaceId);
  const [editingName, setEditingName] = useState(false);
  const [newWsName, setNewWsName] = useState(active?.name ?? "");
  const [invites, setInvites] = useState([]);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");
  const [loadingInvites, setLoadingInvites] = useState(false);

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";
  const isOwner = workspaceRole === "owner";

  useEffect(() => {
    if (!canManage) return;
    setLoadingInvites(true);
    fetchWorkspaceInvites().then(setInvites).catch(() => {}).finally(() => setLoadingInvites(false));
  }, [activeWorkspaceId, canManage]);

  const handleRename = async () => {
    if (!newWsName.trim()) return;
    try {
      await renameWorkspace(newWsName);
      setEditingName(false);
      toast("Přejmenováno", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRoleChange = async (memberUserId, role) => {
    try {
      await updateMemberRole(memberUserId, role);
      toast("Role aktualizována", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRemove = async (member) => {
    if (!await confirm(`Odebrat ${member.email || member.userId.slice(0, 8)} z workspace?`)) return;
    try {
      await removeMember(member.userId);
      toast("Člen odebrán", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleLeave = async () => {
    if (!await confirm("Opravdu chceš opustit tento workspace?")) return;
    try {
      await leaveWorkspace();
      setPage("dashboard");
      toast("Opustil jsi workspace", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = await generateInviteLink(inviteRole);
      setInviteLink(link);
      const updated = await fetchWorkspaceInvites();
      setInvites(updated);
      toast("Odkaz vygenerován", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleRevoke = async (inviteId) => {
    try {
      await revokeInvite(inviteId);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      toast("Pozvánka zrušena", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const getMemberLabel = (m) => m.displayName || m.email || `${m.userId.slice(0, 8)}…`;
  const getInitials = (m) => (m.email || m.userId).slice(0, 2).toUpperCase();

  const roleColors = { owner: "#f59e0b", admin: "#3b82f6", member: "#22c55e", viewer: "#8b95a5" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "16px" : "28px 32px", maxWidth: 700 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
          <Icon name="chevron-left" size={18} color={t.text3} strokeWidth={2} />
        </button>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Outfit',sans-serif" }}>Nastavení workspace</div>
      </div>

      {/* Workspace name */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Název workspace</div>
        {editingName ? (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              autoFocus
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditingName(false); }}
              style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 14, fontWeight: 600 }}
            />
            <button onClick={handleRename} style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Uložit</button>
            <button onClick={() => setEditingName(false)} style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 13, cursor: "pointer" }}>Zrušit</button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{active?.name}</div>
            {isOwner && (
              <button onClick={() => { setEditingName(true); setNewWsName(active?.name ?? ""); }} style={{ background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 12, padding: "3px 8px", borderRadius: 5, border: `1px solid ${t.border}` }}>
                Přejmenovat
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members */}
      <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
          Členové ({workspaceMembers.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {workspaceMembers.map((m) => (
            <div key={m.userId} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: roleColors[m.role] + "22", border: `2px solid ${roleColors[m.role]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: roleColors[m.role], flexShrink: 0 }}>
                {getInitials(m)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getMemberLabel(m)}</div>
                {m.email && m.displayName && <div style={{ fontSize: 11, color: t.text3 }}>{m.email}</div>}
              </div>
              {canManage && m.userId !== userId && m.role !== "owner" ? (
                <>
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, cursor: "pointer" }}
                  >
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <button onClick={() => handleRemove(m)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, borderRadius: 4, display: "flex" }}>
                    <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: roleColors[m.role] + "18", color: roleColors[m.role], fontWeight: 600 }}>
                  {m.role}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite link */}
      {canManage && (
        <div style={{ background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Pozvat člena</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["member", "viewer", "admin"].map((r) => (
              <button key={r} onClick={() => { setInviteRole(r); setInviteLink(""); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${inviteRole === r ? t.accent : t.border}`, background: inviteRole === r ? t.accentBg : "transparent", color: inviteRole === r ? t.accent : t.text2, fontSize: 12, fontWeight: inviteRole === r ? 600 : 400, cursor: "pointer" }}>
                {r}
              </button>
            ))}
          </div>
          {inviteLink ? (
            <div>
              <div style={{ fontSize: 11, color: t.text2, marginBottom: 6 }}>Zkopíruj a pošli odkaz (platí 7 dní):</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value={inviteLink} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 11 }} onClick={(e) => e.target.select()} />
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Zkopírováno", "success"); }} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Kopírovat</button>
              </div>
              <button onClick={() => { setInviteLink(""); }} style={{ marginTop: 8, background: "none", border: "none", color: t.text3, fontSize: 11, cursor: "pointer", padding: 0 }}>Vygenerovat nový</button>
            </div>
          ) : (
            <button onClick={handleGenerateLink} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Vygenerovat pozvánkový odkaz
            </button>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: t.text3, marginBottom: 8 }}>Čekající pozvánky:</div>
              {invites.map((inv) => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${t.border}` }}>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <span style={{ color: t.text2 }}>{inv.role}</span>
                    <span style={{ color: t.text3, fontSize: 10, marginLeft: 8 }}>vyprší {new Date(inv.expires_at).toLocaleDateString("cs-CZ")}</span>
                  </div>
                  <button onClick={() => handleRevoke(inv.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Zrušit</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave / Danger zone */}
      <div style={{ background: t.bg2, border: `1px solid #ef444430`, borderRadius: 12, padding: "18px 20px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Nebezpečná zóna</div>
        {!isOwner && (
          <button onClick={handleLeave} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Opustit workspace
          </button>
        )}
        {isOwner && workspaceMembers.length === 1 && (
          <div style={{ fontSize: 12, color: t.text3 }}>Workspace nelze opustit — jsi jediný člen. Nejdřív přidej dalšího ownera nebo workspace smaž.</div>
        )}
        {isOwner && workspaceMembers.length > 1 && (
          <div style={{ fontSize: 12, color: t.text3 }}>Jako owner nemůžeš workspace opustit. Předej ownership jinému členovi.</div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Workspace Switcher
───────────────────────────────────────────── */
function WorkspaceSwitcher() {
  const { t, workspaces, activeWorkspaceId, switchWorkspace, createWorkspace, generateInviteLink, workspaceRole, isMobile, setPage } = useApp();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLink, setInviteLink] = useState("");

  const active = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const ws = await createWorkspace(newName);
      await switchWorkspace(ws.id);
      setNewName("");
      setCreating(false);
      setOpen(false);
      toast("Workspace vytvořen", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  const handleGenerateLink = async () => {
    try {
      const link = await generateInviteLink(inviteRole);
      setInviteLink(link);
      toast("Odkaz vygenerován", "success");
    } catch (e) {
      toast(e.message || "Chyba", "error");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${t.border}`,
          background: t.input,
          color: t.text,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 6, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {active?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>
          {active?.name ?? "Načítám…"}
        </span>
        <Icon name="chevron-down" size={13} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <div style={{ padding: "6px 6px 4px", fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Workspace</div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "7px 8px", borderRadius: 7, border: "none",
                  background: ws.id === activeWorkspaceId ? t.accentBg : "transparent",
                  color: ws.id === activeWorkspaceId ? t.accent : t.text,
                  cursor: "pointer", fontSize: 13, fontWeight: ws.id === activeWorkspaceId ? 600 : 400,
                }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 5, background: ws.id === activeWorkspaceId ? t.accent : t.border, display: "flex", alignItems: "center", justifyContent: "center", color: ws.id === activeWorkspaceId ? "#fff" : t.text2, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                  {ws.name[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, textAlign: "left" }}>{ws.name}</span>
                <span style={{ fontSize: 10, color: t.text3 }}>{ws.role}</span>
              </button>
            ))}
            <div style={{ borderTop: `1px solid ${t.border}`, margin: "4px 0" }} />
            {creating ? (
              <div style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
                  placeholder="Název workspace…"
                  style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12 }}
                />
                <button onClick={handleCreate} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>OK</button>
              </div>
            ) : (
              <button onClick={() => setCreating(true)} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
                <Icon name="plus" size={13} color={t.text3} strokeWidth={2} />
                Nový workspace
              </button>
            )}
            {(workspaceRole === "owner" || workspaceRole === "admin") && (
              <>
                <button onClick={() => { setInviteOpen(true); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
                  <Icon name="plus" size={13} color={t.text3} strokeWidth={2} />
                  Pozvat člena
                </button>
              </>
            )}
            <button onClick={() => { setPage("workspace-settings"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px", borderRadius: 7, border: "none", background: "transparent", color: t.text2, cursor: "pointer", fontSize: 12 }}>
              <Icon name="list" size={13} color={t.text3} strokeWidth={2} />
              Správa workspace
            </button>
          </div>
        </>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <>
          <div onClick={() => { setInviteOpen(false); setInviteLink(""); }} style={{ position: "fixed", inset: 0, background: "#0005", zIndex: 300 }} />
          <div className="pop" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 14, padding: "24px 28px", zIndex: 301, width: 360, maxWidth: "calc(100vw - 32px)", boxShadow: t.shadow }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Pozvat do workspace</div>
            <div style={{ fontSize: 12, color: t.text2, marginBottom: 10 }}>Role pozvaného:</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {["member", "viewer", "admin"].map((r) => (
                <button key={r} onClick={() => setInviteRole(r)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${inviteRole === r ? t.accent : t.border}`, background: inviteRole === r ? t.accentBg : "transparent", color: inviteRole === r ? t.accent : t.text2, fontSize: 12, fontWeight: inviteRole === r ? 600 : 400, cursor: "pointer" }}>
                  {r}
                </button>
              ))}
            </div>
            {inviteLink ? (
              <>
                <div style={{ fontSize: 11, color: t.text2, marginBottom: 6 }}>Zkopíruj a pošli odkaz:</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input readOnly value={inviteLink} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 11 }} onClick={(e) => e.target.select()} />
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast("Zkopírováno", "success"); }} style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Kopírovat
                  </button>
                </div>
                <div style={{ fontSize: 10, color: t.text3, marginTop: 6 }}>Platnost 7 dní</div>
              </>
            ) : (
              <button onClick={handleGenerateLink} style={{ width: "100%", padding: "9px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Vygenerovat odkaz
              </button>
            )}
            <button onClick={() => { setInviteOpen(false); setInviteLink(""); }} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", color: t.text3, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   User Bar (bottom of sidebar)
───────────────────────────────────────────── */
function UserBar({ setPage }) {
  const { t, userEmail, logout, workspaceMembers, userId } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);

  const me = workspaceMembers.find((m) => m.userId === userId);
  const displayName = me?.displayName || me?.email || userEmail || "Uživatel";
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    if (!await confirm("Odhlásit se?")) return;
    await logout();
    toast("Odhlášeno", "success");
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, border: "none", background: "transparent", color: t.text, cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{me?.displayName || displayName}</div>
          {me?.displayName && <div style={{ fontSize: 10, color: t.text3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>}
        </div>
        <Icon name="chevron-up" size={12} color={t.text3} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <div style={{ padding: "8px 10px 6px", fontSize: 11, color: t.text3, borderBottom: `1px solid ${t.border}` }}>
              <div style={{ fontWeight: 600, color: t.text, marginBottom: 1 }}>{me?.displayName || "—"}</div>
              <div>{userEmail}</div>
            </div>
            <button onClick={() => { setPage("user-profile"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "transparent", color: t.text, cursor: "pointer", fontSize: 13 }}>
              <Icon name="list" size={13} color={t.text3} strokeWidth={2} />
              Můj profil
            </button>
            <div style={{ borderTop: `1px solid ${t.border}` }} />
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", border: "none", background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
              <Icon name="x" size={13} color="#ef4444" strokeWidth={2} />
              Odhlásit se
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Sidebar
───────────────────────────────────────────── */
function Sidebar({ toggleDk }) {
  const { t, dk, projects, tasks, page, setPage, openProject, search, setSearch, setTaskDetail, setCmdOpen, userEmail, logout } = useApp();
  const active = projects.filter((p) => p.status === "active");
  const searchRef = useRef(null);

  // Global keyboard shortcuts (desktop)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
        return;
      }
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); window.dispatchEvent(new CustomEvent("focusQuickAdd")); }
      else if (e.key === "Escape") { setTaskDetail(null); }
      else if (e.key === "k" || e.key === "K") { window.dispatchEvent(new CustomEvent("toggleKanbanView")); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setTaskDetail, setCmdOpen]);

  const nav = [
    { id: "dashboard", label: "Přehled",   icon: "home"         },
    { id: "projects",  label: "Projekty",  icon: "folder"       },
    { id: "tasks",     label: "Úkoly",     icon: "check-square", count: tasks.filter((t) => t.status !== "done").length },
    { id: "timeline",  label: "Plán",      icon: "calendar"     },
    { id: "tags",      label: "Tagy",      icon: "tag"          },
    { id: "notes",     label: "Poznámky",  icon: "file-text", count: null },
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

      <div style={{ padding: "8px 10px 10px" }}>
        <WorkspaceSwitcher />
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
            placeholder="Hledat… (⌘K)"
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
              <span style={{ width: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.85 }}>
                <Icon name={n.icon} size={15} color={act ? t.accent : t.text2} strokeWidth={act ? 2.25 : 1.75} />
              </span>
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
                      background: projectColor(p.id)|| t.text3,
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

            <div style={{ padding: "10px 12px", borderTop: `1px solid ${t.border}`, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* User bar */}
        <UserBar setPage={setPage} />
        {/* Theme toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12.5, color: t.text2, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>{dk ? "🌙" : "☀️"}</span>
            {dk ? "Tmavý" : "Světlý"}
          </div>
          <button
            onClick={toggleDk}
            style={{ width: 44, height: 24, borderRadius: 999, border: `1px solid ${t.border}`, background: dk ? t.accentBg : t.input, position: "relative", padding: 0 }}
            aria-label="Toggle theme"
          >
            <span style={{ position: "absolute", top: 2, left: dk ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: dk ? t.accent : t.card, transition: "left .15s ease", boxShadow: t.shadow }} />
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ─────────────────────────────────────────────
   Mobile Nav — bottom tab bar
───────────────────────────────────────────── */
function MobileNav({ toggleDk }) {
  const { t, dk, page, setPage, tasks, setCmdOpen, setTaskDetail } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = [
    { id: "dashboard", label: "Přehled",  icon: "home"         },
    { id: "tasks",     label: "Úkoly",    icon: "check-square", count: tasks.filter((x) => x.status !== "done").length },
    { id: "projects",  label: "Projekty", icon: "folder"       },
    { id: "notes",     label: "Poznámky", icon: "file-text"    },
  ];

  const more = [
    { id: "timeline",  label: "Plán",     icon: "calendar"     },
    { id: "tags",      label: "Tagy",     icon: "tag"          },
  ];

  const handleNav = (id) => {
    setPage(id);
    setMoreOpen(false);
    setTaskDetail(null);
  };

  return (
    <>
      {/* "Více" drawer overlay */}
      {moreOpen && (
        <>
          <div onClick={() => setMoreOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 195 }} />
          <div
            className="su"
            style={{
              position: "fixed", bottom: 66, left: 0, right: 0, zIndex: 196,
              background: t.bg2, borderTop: `1px solid ${t.border}`,
              borderRadius: "14px 14px 0 0",
              padding: "12px 16px 8px",
              boxShadow: "0 -8px 32px #0003",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border, margin: "0 auto 14px" }} />

            {/* Search / Command Palette */}
            <button
              onClick={() => { setCmdOpen(true); setMoreOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, border: `1px solid ${t.border}`,
                background: t.input, color: t.text2, fontSize: 14, marginBottom: 8,
              }}
            >
              <Icon name="search" size={16} color={t.text3} />
              <span>Hledat… (⌘K)</span>
              <kbd style={{ marginLeft: "auto", fontSize: 10, color: t.text3, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>⌘K</kbd>
            </button>

            {/* More nav items */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {more.map((n) => {
                const act = page === n.id;
                return (
                  <button key={n.id} onClick={() => handleNav(n.id)} style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    padding: "12px 8px", borderRadius: 10, border: `1px solid ${act ? t.accent + "50" : t.border}`,
                    background: act ? t.accentBg : t.card, color: act ? t.accent : t.text2,
                  }}>
                    <Icon name={n.icon} size={20} color={act ? t.accent : t.text2} strokeWidth={act ? 2.25 : 1.75} />
                    <span style={{ fontSize: 11, fontWeight: act ? 600 : 400 }}>{n.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Dark mode toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: t.card, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 16 }}>{dk ? "🌙" : "☀️"}</span>
                <span style={{ fontSize: 13, color: t.text2 }}>{dk ? "Tmavý režim" : "Světlý režim"}</span>
              </div>
              <button onClick={toggleDk} style={{
                width: 44, height: 24, borderRadius: 999, border: `1px solid ${t.border}`,
                background: dk ? t.accentBg : t.input, position: "relative", padding: 0, flexShrink: 0,
              }}>
                <span style={{
                  position: "absolute", top: 2, left: dk ? 22 : 2, width: 20, height: 20,
                  borderRadius: "50%", background: dk ? t.accent : t.card,
                  transition: "left .15s ease", boxShadow: t.shadow,
                }} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav
        className="mobile-nav-bar"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: t.bg2, borderTop: `1px solid ${t.border}`,
          display: "flex", alignItems: "stretch",
          boxShadow: "0 -4px 20px #0002",
        }}
      >
        {primary.map((n) => {
          const act = page === n.id || (n.id === "projects" && page === "project-detail");
          return (
            <button
              key={n.id}
              onClick={() => handleNav(n.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", gap: 3, padding: "8px 4px 8px",
                border: "none", background: "transparent",
                color: act ? t.accent : t.text3,
                position: "relative",
              }}
            >
              {n.count > 0 && (
                <span style={{
                  position: "absolute", top: 6, right: "50%", transform: "translateX(10px)",
                  minWidth: 16, height: 16, borderRadius: 8, background: t.accent,
                  color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                  alignItems: "center", justifyContent: "center", padding: "0 3px",
                }}>{n.count > 99 ? "99+" : n.count}</span>
              )}
              <Icon name={n.icon} size={22} color={act ? t.accent : t.text3} strokeWidth={act ? 2.25 : 1.75} />
              <span style={{ fontSize: 9.5, fontWeight: act ? 600 : 400, letterSpacing: "0.01em" }}>{n.label}</span>
            </button>
          );
        })}

        {/* Více button */}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 3, padding: "8px 4px 8px",
            border: "none", background: "transparent",
            color: moreOpen ? t.accent : t.text3,
          }}
        >
          <Icon name="list" size={22} color={moreOpen ? t.accent : t.text3} strokeWidth={moreOpen ? 2.25 : 1.75} />
          <span style={{ fontSize: 9.5, fontWeight: moreOpen ? 600 : 400 }}>Více</span>
        </button>
      </nav>
    </>
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
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener("focusQuickAdd", handler);
    return () => window.removeEventListener("focusQuickAdd", handler);
  }, []);

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
          ref={inputRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nový úkol… (N / Enter)"
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
        <div style={{ borderTop: `1px solid ${t.border}`, padding: "18px 20px", animation: "fadeIn .15s ease-out" }}>
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
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2} />
                  {v.label}
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
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2.5} />
                  {v.label}
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
/* ─────────────────────────────────────────────
   Icon — lightweight inline SVG system
───────────────────────────────────────────── */
function Icon({ name, size = 14, color = "currentColor", strokeWidth = 1.75, fill = "none" }) {
  const p = {
    home:           ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"],
    folder:         "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
    "check-square": ["M9 11l3 3L22 4", "M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"],
    calendar:       ["M8 2v4", "M16 2v4", "M3 8h18", "M3 6a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"],
    tag:            ["M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z", "M7 7h.01"],
    "file-text":    ["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z", "M14 2v6h6", "M16 13H8", "M16 17H8", "M10 9H8"],
    circle:         "M12 2a10 10 0 100 20A10 10 0 0012 2z",
    "play-circle":  ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M10 8l6 4-6 4V8z"],
    clock:          ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 6v6l4 2"],
    "check-circle": ["M22 11.08V12a10 10 0 11-5.93-9.14", "M22 4L12 14.01l-3-3"],
    "pause-circle": ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M10 15V9", "M14 15V9"],
    star:           "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    "alert-circle": ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 8v4", "M12 16h.01"],
    "refresh-cw":   ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"],
    list:           ["M8 6h13", "M8 12h13", "M8 18h13", "M3 6h.01", "M3 12h.01", "M3 18h.01"],
    search:         ["M11 2a9 9 0 100 18A9 9 0 0011 2z", "M21 21l-4.35-4.35"],
    pin:            ["M12 17v5", "M5 4a2 2 0 012-2h10a2 2 0 012 2v6a6 6 0 01-6 6 6 6 0 01-6-6V4z"],
    trash:          ["M3 6h18", "M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"],
    plus:           ["M12 5v14", "M5 12h14"],
    x:              ["M18 6L6 18", "M6 6l12 12"],
    "chevron-down": "M6 9l6 6 6-6",
    "chevron-up":   "M18 15l-6-6-6 6",
    "chevron-left": "M15 18l-6-6 6-6",
    repeat:         ["M17 1l4 4-4 4", "M3 11V9a4 4 0 014-4h14", "M7 23l-4-4 4-4", "M21 13v2a4 4 0 01-4 4H3"],
    "arrow-up":     ["M12 19V5", "M5 12l7-7 7 7"],
    minus:          "M5 12h14",
    paperclip:      ["M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"],
    upload:         ["M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
    file:           ["M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z", "M13 2v7h7"],
    image:          ["M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z", "M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z", "M21 15l-5-5L5 21"],
    "external-link": ["M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6", "M15 3h6v6", "M10 14L21 3"],
  };
  const d = p[name];
  if (!d) return null;
  const ds = Array.isArray(d) ? d : [d];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: "block" }}>
      {ds.map((path, i) => <path key={i} d={path} />)}
    </svg>
  );
}

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
      <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.1 }}>
        <Icon name={icon} size={40} color={color} strokeWidth={1.25} />
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
  const { t, tasks, projects, dashFilter, setDashFilter, search, openProject, isMobile } = useApp();

  const [doingOpen, setDoingOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [todoOpen, setTodoOpen] = useState(false);

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

  const dueToday = tasks.filter((x) => {
    if (!x.dueDate || x.status === "done") return false;
    const d = parseYMD(x.dueDate);
    return d && d.getTime() === today.getTime();
  });

  const dueSoon = tasks.filter((x) => {
    if (!x.dueDate || x.status === "done") return false;
    const d = parseYMD(x.dueDate);
    return d && d > today && d <= dayAfter;
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
              style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: "18px 20px", marginBottom: 8, cursor: "pointer" }}
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
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#f59e0b" }}>Čekám ({waitingT})</h2>
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
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "#eab308", display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="star" size={16} color="#eab308" fill="#eab308" strokeWidth={1.5} />
            TOP úkoly ({starredT.length})
          </h2>
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

  const activeProjects = projects.filter((p) => p.status === "active");

  // Helper: section header
  const SectionHead = ({ icon, title, color, count, action }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
      <span style={{ width: 22, height: 22, borderRadius: 6, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={12} color={color} strokeWidth={2} />
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{title}</span>
      <span className="mono" style={{ fontSize: 10, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 6 }}>{count}</span>
      {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "16px 14px" : "20px 20px" }} className="fi">

      {/* Header */}
      <div style={{ display: "flex", alignItems: isMobile ? "center" : "flex-end", justifyContent: "space-between", marginBottom: isMobile ? 14 : 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 2 }}>Přehled</h1>
          <p style={{ color: t.text2, fontSize: 12 }}>
            {new Date().toLocaleDateString("cs-CZ", { weekday: isMobile ? "short" : "long", day: "numeric", month: isMobile ? "numeric" : "long", year: isMobile ? undefined : "numeric" })}
          </p>
        </div>
        {!isMobile && (
          <div style={{ fontSize: 11, color: t.text3, textAlign: "right", lineHeight: 1.7, flexShrink: 0 }}>
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>N</span> nový úkol
            {"  ·  "}
            <span style={{ background: t.input, padding: "2px 7px", borderRadius: 5, marginRight: 4 }}>Esc</span> zavřít
          </div>
        )}
      </div>

      <div style={{ marginBottom: isMobile ? 14 : 20 }}>
        <QuickAdd />
      </div>

      {/* Layout: two-column on desktop, single on mobile */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(520px, 1fr) 480px", gap: isMobile ? 12 : 28, alignItems: "start", minWidth: isMobile ? 0 : 1060 }}>

        {/* ── LEFT: Focus ── */}
        <div>
          {/* Filter overlay replaces left column content */}
          {filterContent && <div className="fi">{filterContent}</div>}

          {!dashFilter && (
            <>
              {tasks.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3, background: t.card, borderRadius: 14, border: `1px dashed ${t.border}` }}>
                  <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.4 }}>◇</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: "'Outfit',sans-serif" }}>Zatím prázdno</div>
                  <div style={{ fontSize: 13 }}>Přidej první úkol přes pole nahoře nebo stiskni <kbd style={{ background: t.input, padding: "1px 6px", borderRadius: 4, fontSize: 11 }}>N</kbd></div>
                </div>
              )}

              {/* Starred */}
              {starredT.length > 0 && (
                <div style={{ background: t.kanban, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="star" title="TOP úkoly" color="#eab308" count={starredT.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {starredT.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#eab308" />)}
                  </div>
                </div>
              )}

              {/* Overdue */}
              {overdue.length > 0 && (
                <div style={{ background: "#ef444408", border: `1px solid #ef444425`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="alert-circle" title="Po termínu" color="#ef4444" count={overdue.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {overdue.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#ef4444" />)}
                  </div>
                </div>
              )}

              {/* Due today */}
              {dueToday.length > 0 && (
                <div style={{ background: "#a855f708", border: `1px solid #a855f725`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="calendar" title="Dnes" color="#a855f7" count={dueToday.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {dueToday.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#a855f7" />)}
                  </div>
                </div>
              )}

              {/* Doing — collapsible */}
              {(() => {
                const list = doing.filter(matchesSearch);
                const shown = doingOpen ? list : list.slice(0, 3);
                return (
                  <div style={{ background: "#3b82f608", border: `1px solid #3b82f625`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                    <SectionHead
                      icon="play-circle" title="Rozpracováno" color="#3b82f6" count={list.length}
                      action={list.length > 3 && (
                        <button onClick={() => setDoingOpen(v => !v)} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                          {doingOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                        </button>
                      )}
                    />
                    {list.length === 0 ? (
                      <div style={{ color: t.text3, fontSize: 12.5, padding: "8px 4px 2px", fontStyle: "italic" }}>Žádné rozpracované úkoly</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#3b82f6" />)}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Due soon */}
              {dueSoon.length > 0 && (
                <div style={{ background: "#f9731608", border: `1px solid #f9731625`, borderRadius: 12, padding: "12px 12px 8px", marginBottom: 12 }}>
                  <SectionHead icon="clock" title="Blíží se deadline" color="#f97316" count={dueSoon.filter(matchesSearch).length} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {dueSoon.filter(matchesSearch).map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#f97316" />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT: Context ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 10 : 20, order: isMobile ? -1 : 0, minWidth: 0 }}>

          {/* Stat cards 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isMobile ? 6 : 8 }}>
            <StatCard label="Celkem úkolů" value={totalT} color="#8b5cf6" icon="list" active={dashFilter === "total"} onClick={() => setDashFilter(dashFilter === "total" ? null : "total")} />
            <StatCard label="Aktivní proj." value={activeP} color="#3b82f6" icon="folder" active={dashFilter === "active-projects"} onClick={() => setDashFilter(dashFilter === "active-projects" ? null : "active-projects")} />
            <StatCard label="Hotovo" value={doneT} color="#22c55e" icon="check-circle" active={dashFilter === "done"} onClick={() => setDashFilter(dashFilter === "done" ? null : "done")} />
            <StatCard label="TOP úkoly" value={starredT.length} color="#eab308" icon="star" active={dashFilter === "starred"} onClick={() => setDashFilter(dashFilter === "starred" ? null : "starred")} />
          </div>

          {/* Active projects */}
          {activeProjects.length > 0 && (
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 8 }}>Aktivní projekty</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {activeProjects.map((p) => {
                  const pt = tasks.filter((x) => x.projectId === p.id);
                  const done = pt.filter((x) => x.status === "done").length;
                  const pct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
                  return (
                    <div key={p.id} onClick={() => openProject(p.id)} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer", borderLeft: `3px solid ${projectColor(p.id)}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{p.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: pct === 100 ? "#22c55e" : t.text3, fontWeight: 600 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 999, background: t.input }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${projectColor(p.id)}, #22c55e)`, borderRadius: 999 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Waiting — collapsible */}
          {waitingAll.length > 0 && (() => {
            const list = waitingAll.filter(matchesSearch);
            const shown = waitingOpen ? list : list.slice(0, 3);
            return (
              <div style={{ background: "#f59e0b08", border: `1px solid #f59e0b25`, borderRadius: 12, padding: "12px 12px 8px" }}>
                <SectionHead
                  icon="pause-circle" title="Čekám" color="#f59e0b" count={list.length}
                  action={list.length > 3 && (
                    <button onClick={() => setWaitingOpen(v => !v)} style={{ background: "none", border: "none", color: "#f59e0b", fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                      {waitingOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                    </button>
                  )}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#f59e0b" />)}
                </div>
              </div>
            );
          })()}

          {/* To do — collapsible */}
          {(() => {
            const list = todo.filter(matchesSearch);
            const shown = todoOpen ? list : list.slice(0, 3);
            return (
              <div style={{ background: t.kanban, border: `1px solid ${t.border}`, borderRadius: 12, padding: "12px 12px 8px" }}>
                <SectionHead
                  icon="list" title="To do" color="#8b95a5" count={list.length}
                  action={list.length > 3 && (
                    <button onClick={() => setTodoOpen(v => !v)} style={{ background: "none", border: "none", color: t.text2, fontSize: 11, cursor: "pointer", padding: "1px 4px" }}>
                      {todoOpen ? "Sbalit ▴" : `+${list.length - 3} dalších ▾`}
                    </button>
                  )}
                />
                {list.length === 0 ? (
                  <div style={{ color: t.text3, fontSize: 12, padding: "6px 4px 2px", fontStyle: "italic" }}>To do je prázdné</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {shown.map((task) => <DashTaskCard key={task.id} task={task} sectionColor="#8b95a5" />)}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Task Cards
───────────────────────────────────────────── */
function DashTaskCard({ task, sectionColor }) {
  const { t, projects, tags, updateTask, setTaskDetail } = useApp();
  const project = projects.find((p) => p.id === task.projectId);
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));

  const st = STATUSES[task.status] || STATUSES.todo;
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;
  const projColor = project ? projectColor(project.id) : null;

  return (
    <div
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        cursor: "pointer",
        transition: "border-color .12s, background .12s",
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = sectionColor ? sectionColor + "10" : t.cardH;
        e.currentTarget.style.borderColor = sectionColor ? sectionColor + "50" : t.borderH;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = t.card;
        e.currentTarget.style.borderColor = t.border;
      }}
    >
      {/* Status color strip */}
      <div style={{ height: 3, background: st.color }} />

      <div style={{ padding: "10px 14px 8px" }}>
        {/* Row 1: status toggle + title + star */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const idx = STATUS_KEYS.indexOf(task.status);
              updateTask(task.id, { status: STATUS_KEYS[(idx + 1) % STATUS_KEYS.length] });
            }}
            title={`Stav: ${st.label} → klikni pro posun`}
            style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: `1.5px solid ${st.color}40`,
              background: t.input,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <Icon name={st.icon} size={13} color={st.color} strokeWidth={2} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600, lineHeight: 1.35,
              textDecoration: task.status === "done" ? "line-through" : "none",
              color: task.status === "done" ? t.text3 : t.text,
            }}>
              {task.title || "Bez názvu"}
            </div>
            {task.description && (
              <div style={{ fontSize: 12, color: t.text2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.description}
              </div>
            )}
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); updateTask(task.id, { starred: !task.starred }); }}
            title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            style={{
              background: "none", border: "none", cursor: "pointer",
              opacity: task.starred ? 1 : 0.3,
              transition: "all .15s", flexShrink: 0, padding: 0, lineHeight: 1,
              display: "flex", alignItems: "center",
            }}
          >
            <Icon name="star" size={15} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
          </button>
        </div>

        {/* Row 2: meta pills */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginLeft: 30, minWidth: 0, overflow: "hidden" }}>
          {project && (
            <span style={{
              fontSize: 10.5, fontWeight: 700, padding: "2px 9px", borderRadius: 20,
              border: `1.5px solid ${projColor}55`, background: projColor + "12", color: projColor,
              letterSpacing: ".01em", display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              <Icon name="folder" size={9} color={projColor} strokeWidth={2} />
              {project.name}
            </span>
          )}
          {pr && (
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: pr.bg, color: pr.color, display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Icon name={pr.icon} size={9} color={pr.color} strokeWidth={2.5} />
              {pr.label}
            </span>
          )}
          {taskTags.length > 0 && (
            <span style={{ width: 1, height: 12, background: t.border, alignSelf: "center", flexShrink: 0 }} />
          )}
          {taskTags.map((tg) => (
            <span key={tg.id} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: tg.color + "18", color: tg.color }}>
              # {tg.name}
            </span>
          ))}
          {task.dueDate && (
            <span className="mono" style={{
              fontSize: 10.5, fontWeight: isOverdue ? 700 : 500,
              color: isOverdue ? "#ef4444" : t.text2,
              background: isOverdue ? "#ef444412" : t.input,
              padding: "2px 7px", borderRadius: 4,
            }}>
              {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" }) || task.dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Footer: quick status buttons */}
      <div
        style={{ display: "flex", gap: 4, padding: "6px 14px 8px", borderTop: `1px solid ${t.border}`, flexWrap: "wrap" }}
        onClick={(e) => e.stopPropagation()}
      >
        {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
          <button
            key={k}
            onClick={() => updateTask(task.id, { status: k })}
            title={STATUSES[k].label}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", height: 26, borderRadius: 6,
              fontSize: 11, fontWeight: 600,
              border: `1px solid ${t.border}`,
              background: "transparent",
              color: STATUSES[k].color,
              cursor: "pointer",
              transition: "background .1s, border-color .1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = STATUSES[k].color + "18";
              e.currentTarget.style.borderColor = STATUSES[k].color + "60";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = t.border;
            }}
          >
            <Icon name={STATUSES[k].icon} size={10} color="currentColor" strokeWidth={2} />
            {STATUS_SHORT[k]}
          </button>
        ))}
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
                    <Icon name={st.icon} size={10} color={st.color} strokeWidth={2} />{st.label}
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
                      <Icon name={pr.icon} size={10} color={pr.color} strokeWidth={2.5} />{pr.label}
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
          style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12, outline: "none", flexShrink: 0 }}
        >
          <option value="all">Všechny projekty</option>
          <option value="inbox">Inbox</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <span className="mono" style={{ fontSize: 12, color: t.text3, marginLeft: "auto", flexShrink: 0 }}>
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

/* ─────────────────────────────────────────────
   Projects Page
───────────────────────────────────────────── */
function ProjectsPage() {
  const { t, projects, tasks, addProject, openProject, isMobile } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState("active");
  const [showNew, setShowNew] = useState(false);
  const [nName, setNName] = useState("");
  const [nDesc, setNDesc] = useState("");
  const [nStatus, setNStatus] = useState("active");
  const newInputRef = useRef(null);

  const filtered = filter === "all" ? projects : projects.filter((p) => p.status === filter);

  const create = () => {
    if (!nName.trim()) return;
    addProject({ name: nName.trim(), description: nDesc.trim(), status: nStatus });
    setNName("");
    setNDesc("");
    setShowNew(false);
    toast("Projekt vytvořen", "success");
  };

  const openNew = () => {
    setShowNew(true);
    setTimeout(() => newInputRef.current?.focus(), 50);
  };

  const tabs = [
    { k: "all", l: "Vše", count: projects.length },
    { k: "active", l: "Aktivní", count: projects.filter((p) => p.status === "active").length },
    { k: "idea", l: "Nápady", count: projects.filter((p) => p.status === "idea").length },
    { k: "done", l: "Hotové", count: projects.filter((p) => p.status === "done").length },
    { k: "archived", l: "Archiv", count: projects.filter((p) => p.status === "archived").length },
  ];

  return (
    <div style={{ padding: isMobile ? "16px" : "24px 28px" }} className="fi">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 2 }}>Projekty</h1>
          {!isMobile && <p style={{ color: t.text2, fontSize: 13 }}>{projects.length} projektů celkem · {projects.filter(p => p.status === "active").length} aktivních</p>}
        </div>
        <button
          onClick={openNew}
          style={{ padding: isMobile ? "8px 14px" : "9px 20px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
        >
          <span style={{ fontSize: 18, fontWeight: 300, lineHeight: 1 }}>+</span> {isMobile ? "Nový" : "Nový projekt"}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `1px solid ${t.border}`, paddingBottom: 0, overflowX: isMobile ? "auto" : "visible" }}>
        {tabs.map((tab) => (
          <button
            key={tab.k}
            onClick={() => setFilter(tab.k)}
            style={{
              padding: "8px 14px",
              borderRadius: "8px 8px 0 0",
              fontSize: 13,
              fontWeight: filter === tab.k ? 600 : 400,
              border: "none",
              borderBottom: filter === tab.k ? `2px solid ${t.accent}` : "2px solid transparent",
              background: "transparent",
              color: filter === tab.k ? t.accent : t.text2,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "color .12s",
            }}
          >
            {tab.l}
            {tab.count > 0 && (
              <span className="mono" style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: filter === tab.k ? t.accentBg : t.input, color: filter === tab.k ? t.accent : t.text3 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* New project form */}
      {showNew && (
        <div style={{ background: t.card, border: `1px solid ${t.accent}40`, borderRadius: 14, padding: "20px 22px", marginBottom: 20, boxShadow: `0 0 0 3px ${t.accent}10` }} className="pop">
          <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14, fontFamily: "'Outfit',sans-serif" }}>Nový projekt</div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              ref={newInputRef}
              value={nName}
              onChange={(e) => setNName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Název projektu…"
              style={{ flex: 2, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 14, fontWeight: 500 }}
            />
            <input
              value={nDesc}
              onChange={(e) => setNDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="Popis (volitelně)…"
              style={{ flex: 3, padding: "10px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, outline: "none", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Object.entries(PROJ_STATUS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setNStatus(k)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: nStatus === k ? 700 : 400,
                    border: `1.5px solid ${nStatus === k ? v.color : t.border}`,
                    background: nStatus === k ? v.color + "18" : "transparent",
                    color: nStatus === k ? v.color : t.text2,
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => { setShowNew(false); setNName(""); setNDesc(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${t.border}`, background: "transparent", color: t.text2, fontSize: 12.5 }}>
                Zrušit
              </button>
              <button onClick={create} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, opacity: nName.trim() ? 1 : 0.4 }}>
                Vytvořit projekt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project grid */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
        {filtered.map((p) => {
          const pt = tasks.filter((x) => x.projectId === p.id);
          const doneC = pt.filter((x) => x.status === "done").length;
          const doingC = pt.filter((x) => x.status === "doing").length;
          const todoC = pt.filter((x) => x.status === "todo").length;
          const waitingC = pt.filter((x) => x.status === "waiting").length;
          const pct = pt.length > 0 ? Math.round((doneC / pt.length) * 100) : 0;
          const overdueC = pt.filter((x) => {
            const d = parseYMD(x.dueDate);
            return d && x.status !== "done" && d < startOfToday();
          }).length;
          const statusColor = PROJ_STATUS[p.status]?.color || t.text3;
          const projCol = projectColor(p.id);

          return (
            <div
              key={p.id}
              onClick={() => openProject(p.id)}
              style={{
                background: t.card,
                border: `1px solid ${t.border}`,
                borderRadius: 14,
                padding: "20px 22px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderLeft: `4px solid ${projCol}`,
              }}
            >
              {/* Top row: status badge + arrow */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: statusColor + "18", color: statusColor, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {PROJ_STATUS[p.status]?.label || p.status}
                </span>
                <span style={{ color: t.text3, fontSize: 16 }}>›</span>
              </div>

              {/* Name + description */}
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit',sans-serif", lineHeight: 1.2 }}>{p.name}</h3>
              <p style={{ fontSize: 12.5, color: t.text2, marginBottom: 16, lineHeight: 1.45, minHeight: 18, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {p.description || <span style={{ fontStyle: "italic", color: t.text3 }}>Bez popisu</span>}
              </p>

              {/* Task status breakdown */}
              {pt.length > 0 ? (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {todoC > 0 && <span style={{ fontSize: 11, color: STATUSES.todo.color, background: STATUSES.todo.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.todo.icon} size={10} color="currentColor" strokeWidth={2} /> {todoC}</span>}
                    {doingC > 0 && <span style={{ fontSize: 11, color: STATUSES.doing.color, background: STATUSES.doing.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.doing.icon} size={10} color="currentColor" strokeWidth={2} /> {doingC}</span>}
                    {waitingC > 0 && <span style={{ fontSize: 11, color: STATUSES.waiting.color, background: STATUSES.waiting.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.waiting.icon} size={10} color="currentColor" strokeWidth={2} /> {waitingC}</span>}
                    {doneC > 0 && <span style={{ fontSize: 11, color: STATUSES.done.color, background: STATUSES.done.bg, padding: "2px 8px", borderRadius: 5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name={STATUSES.done.icon} size={10} color="currentColor" strokeWidth={2} /> {doneC}</span>}
                    {overdueC > 0 && <span style={{ fontSize: 11, color: "#ef4444", background: "#ef444412", padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>⚠ {overdueC} po termínu</span>}
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: t.input, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${projCol}, #22c55e)`, borderRadius: 999, transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: t.text3 }}>{pt.length} úkolů celkem</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "#22c55e" : t.text2 }}>{pct} %</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: t.text3, fontStyle: "italic", marginTop: 4 }}>Žádné úkoly</div>
              )}
            </div>
          );
        })}

        {/* Add new project tile */}
        {!showNew && (
          <div
            onClick={openNew}
            style={{
              border: `2px dashed ${t.border}`,
              borderRadius: 14,
              padding: "20px 22px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              minHeight: 140,
              color: t.text3,
              transition: "border-color .15s, color .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3; }}
          >
            <span style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>+</span>
            <span style={{ fontSize: 12.5, fontWeight: 500 }}>Nový projekt</span>
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: t.text3 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>◫</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, fontFamily: "'Outfit',sans-serif" }}>Žádné projekty</div>
          <div style={{ fontSize: 13 }}>V této kategorii nejsou žádné projekty.</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Project Detail + Kanban
───────────────────────────────────────────── */
function ProjectDetail() {
  const { t, projects, tasks, addTask, updateTask, updateProject, deleteProject, selProject, setPage, isMobile } = useApp();
  const confirm = useConfirm();
  const toast = useToast();
  const project = projects.find((p) => p.id === selProject);

  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [view, setView] = useState("kanban");

  useEffect(() => {
    const handler = () => setView((v) => (v === "kanban" ? "list" : "kanban"));
    window.addEventListener("toggleKanbanView", handler);
    return () => window.removeEventListener("toggleKanbanView", handler);
  }, []);

  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [inlineAdd, setInlineAdd] = useState(null);
  const [inlineVal, setInlineVal] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);

  if (!project) return <div style={{ padding: 40, color: t.text3 }}>Projekt nenalezen</div>;

  const pTasks = tasks.filter((x) => x.projectId === project.id);

  return (
    <div style={{ padding: isMobile ? "14px 16px" : "24px 28px" }} className="fi">
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, fontSize: 12.5, color: t.text3 }}>
        <button onClick={() => setPage("projects")} style={{ background: "none", border: "none", color: t.text2, cursor: "pointer", fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="chevron-left" size={14} color={t.text2} strokeWidth={2} />
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
              onClick={async () => { if (await confirm("Opravdu smazat projekt? Úkoly přejdou do Inboxu.")) deleteProject(project.id); }}
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

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <QuickAdd defaultProjectId={project.id} />
        </div>
        {!isMobile && <ViewToggle view={view} setView={setView} modes={[{ k: "kanban", label: "Kanban", icon: "▦" }, { k: "list", label: "Tabulka", icon: "☰" }]} />}
      </div>

      {view === "kanban" ? (
        <div style={isMobile ? { display: "flex", flexDirection: "column", gap: 10 } : { display: "grid", gridTemplateColumns: `repeat(${STATUS_KEYS.length}, minmax(200px, 1fr))`, gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
          {STATUS_KEYS.map((status) => {
            const cfg = STATUSES[status];
            const allCol = pTasks.filter((x) => x.status === status).sort((a, b) => (a.position || 0) - (b.position || 0));
            const isDone = status === "done";
            const col = isDone && !showAllDone ? allCol.slice(0, 5) : allCol;
            const isDragOver = dragOverStatus === status;

            return (
              <div
                key={status}
                style={{
                  background: isDragOver ? cfg.color + "12" : t.kanban,
                  borderRadius: 10,
                  padding: 8,
                  minHeight: 160,
                  borderTop: `3px solid ${cfg.color}`,
                  outline: isDragOver ? `2px solid ${cfg.color}50` : "2px solid transparent",
                  transition: "background .15s, outline .15s",
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverStatus(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const taskId = e.dataTransfer.getData("taskId");
                  if (taskId) updateTask(taskId, { status });
                  setDragOverStatus(null);
                  setDraggingId(null);
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 10, padding: "0 4px" }}>
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: cfg.color + "20", display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color }}>
                    <Icon name={cfg.icon} size={11} color={cfg.color} strokeWidth={2} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span className="mono" style={{ fontSize: 10, color: t.text3, marginLeft: "auto" }}>
                    {allCol.length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {col.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      onDragStart={(id) => setDraggingId(id)}
                    />
                  ))}
                </div>

                {isDone && allCol.length > 5 && (
                  <button
                    onClick={() => setShowAllDone((v) => !v)}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "5px 0",
                      borderRadius: 6,
                      border: `1px dashed ${t.border}`,
                      background: "transparent",
                      color: t.text3,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {showAllDone ? "Skrýt dokončené" : `+ ${allCol.length - 5} dalších`}
                  </button>
                )}

                {col.length === 0 && inlineAdd !== status && (
                  <div
                    style={{ padding: "20px 8px", textAlign: "center", color: t.text3, fontSize: 11, border: `1.5px dashed ${cfg.color}30`, borderRadius: 8, cursor: "pointer", transition: "border-color .15s" }}
                    onClick={() => setInlineAdd(status)}
                  >
                    <div style={{ fontSize: 18, opacity: 0.35, marginBottom: 4 }}>+</div>
                    Přidat úkol
                  </div>
                )}

                {inlineAdd === status ? (
                  <div style={{ marginTop: 6 }}>
                    <input
                      autoFocus
                      value={inlineVal}
                      onChange={(e) => setInlineVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const title = inlineVal.trim();
                          if (title) { addTask({ title, status, projectId: project.id }); toast("Úkol přidán", "success"); }
                          setInlineAdd(null); setInlineVal("");
                        }
                        if (e.key === "Escape") { setInlineAdd(null); setInlineVal(""); }
                      }}
                      onBlur={() => {
                        const title = inlineVal.trim();
                        if (title) { addTask({ title, status, projectId: project.id }); toast("Úkol přidán", "success"); }
                        setInlineAdd(null); setInlineVal("");
                      }}
                      placeholder="Název úkolu… (Enter)"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 7,
                        border: `1px solid ${cfg.color}60`,
                        background: t.card,
                        color: t.text,
                        outline: "none",
                        fontSize: 12.5,
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => { setInlineAdd(status); setInlineVal(""); }}
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "5px 0",
                      borderRadius: 6,
                      border: `1px dashed ${t.border}`,
                      background: "transparent",
                      color: t.text3,
                      fontSize: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = cfg.color + "80"; e.currentTarget.style.color = cfg.color; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3; }}
                  >
                    + Přidat
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ListView taskList={pTasks} showProject={false} />
      )}

      {/* Notes section */}
      <div style={{ marginTop: 32, borderTop: `1px solid ${t.border}`, paddingTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Poznámky projektu</span>
        </div>
        <NotesMiniList projectId={project.id} />
      </div>
    </div>
  );
}

function KanbanCard({ task, onDragStart }) {
  const { t, tags, setTaskDetail, updateTask, isMobile } = useApp();
  const taskTags = tags.filter((tg) => (task.tagIds || []).includes(tg.id));
  const pr = task.priority ? PRIORITIES[task.priority] : null;

  const today = startOfToday();
  const due = parseYMD(task.dueDate);
  const isOverdue = due && task.status !== "done" && due < today;
  const phaseCount = task.phases?.length ?? 0;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(task.id);
      }}
      onClick={() => setTaskDetail(task.id)}
      style={{
        background: t.card,
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        padding: isMobile ? "13px 13px" : "10px 11px",
        cursor: isMobile ? "pointer" : "grab",
        position: "relative",
        userSelect: "none",
      }}
    >
      {task.starred && (
        <span style={{ position: "absolute", top: 7, right: 9, lineHeight: 1 }}>
          <Icon name="star" size={11} color="#eab308" fill="#eab308" strokeWidth={1.5} />
        </span>
      )}

      <div
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          marginBottom: 6,
          lineHeight: 1.35,
          textDecoration: task.status === "done" ? "line-through" : "none",
          color: task.status === "done" ? t.text3 : t.text,
          paddingRight: task.starred ? 18 : 0,
        }}
      >
        {task.title || "Bez názvu"}
      </div>

      {pr && (
        <div style={{ marginBottom: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: pr.color, background: pr.bg, padding: "2px 6px", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <Icon name={pr.icon} size={10} color={pr.color} strokeWidth={2.5} /> {pr.label}
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
        {task.dueDate && (
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
            {parseYMD(task.dueDate)?.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }) || task.dueDate}
          </span>
        )}
        {phaseCount > 0 && (
          <span style={{ fontSize: 10, color: t.text3, display: "flex", alignItems: "center", gap: 2 }}>
            ☰ {phaseCount}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 3, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
        {STATUS_KEYS.filter((k) => k !== task.status).map((k) => (
          <button
            key={k}
            onClick={() => updateTask(task.id, { status: k })}
            title={STATUSES[k].label}
            style={{
              flex: 1,
              padding: "4px 0",
              borderRadius: 5,
              fontSize: 10,
              border: `1px solid ${STATUSES[k].color}30`,
              background: STATUSES[k].color + "10",
              color: STATUSES[k].color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon name={STATUSES[k].icon} size={9} color="currentColor" strokeWidth={2} />
            <span style={{ fontSize: 9 }}>{STATUSES[k].label}</span>
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
  const { t, tasks, projects, tags, updateTask, deleteTask, addProject, taskDetail, setTaskDetail, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  // Hooks must come before any conditional return (Rules of Hooks)
  const task = tasks.find((x) => x.id === taskDetail) ?? null;
  const [title, setTitle] = useState(task?.title ?? "");
  const [desc, setDesc] = useState(task?.description ?? "");
  const [showNewProject, setShowNewProject] = useState(false);
  const [npName, setNpName] = useState("");
  const [newPhase, setNewPhase] = useState("");

  // Sync local state when task changes (id switch OR external update)
  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDesc(task.description || "");
    setShowNewProject(false);
    setNpName("");
  }, [task?.id, task?.title, task?.description]);

  if (!task) return null;

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
        className={isMobile ? "su" : "sr"}
        style={{
          position: "fixed",
          ...(isMobile
            ? { bottom: 0, left: 0, right: 0, top: "8vh", borderRadius: "16px 16px 0 0", borderTop: `1px solid ${t.border}` }
            : { top: 0, right: 0, bottom: 0, width: 440, maxWidth: "92vw", borderLeft: `1px solid ${t.border}` }
          ),
          background: t.bg2,
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          boxShadow: isMobile ? "0 -8px 40px #0004" : "-8px 0 32px #0003",
        }}
      >
        {/* Drag handle on mobile */}
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobile ? "10px 16px 12px" : "18px 20px", borderBottom: `1px solid ${t.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: t.text2, fontFamily: "'Outfit',sans-serif" }}>Detail úkolu</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={async () => { if (await confirm("Smazat úkol?")) { setTaskDetail(null); deleteTask(task.id); } }} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: 11.5, padding: "4px 8px", borderRadius: 5 }}>
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
                cursor: "pointer",
                opacity: task.starred ? 1 : 0.35,
                transition: "all .15s",
                padding: 0,
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
              }}
              title={task.starred ? "Odebrat z TOP" : "Přidat do TOP"}
            >
              <Icon name="star" size={20} color="#eab308" fill={task.starred ? "#eab308" : "none"} strokeWidth={1.75} />
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
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2} />
                  {v.label}
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
                  <Icon name={v.icon} size={11} color="currentColor" strokeWidth={2.5} />
                  {v.label}
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
          <Sec label="Průběh a fáze">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {(task.phases || []).slice().reverse().map((ph) => (
                <div
                  key={ph.id}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: t.input,
                    border: `1px solid ${t.border}`,
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.4 }}>{ph.text}</div>
                    <div className="mono" style={{ fontSize: 10.5, color: t.text3, marginTop: 4 }}>
                      {new Date(ph.date).toLocaleString("cs-CZ")}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = (task.phases || []).filter((x) => x.id !== ph.id);
                      s({ phases: next });
                    }}
                    style={{ border: "none", background: "transparent", color: t.text3, fontSize: 14, cursor: "pointer" }}
                    title="Smazat"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newPhase}
                onChange={(e) => setNewPhase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const text = newPhase.trim();
                    if (!text) return;
                    const next = [
                      ...(task.phases || []),
                      { id: crypto.randomUUID?.() || String(Date.now()), text, date: Date.now() },
                    ];
                    s({ phases: next });
                    setNewPhase("");
                  }
                }}
                placeholder="Nová fáze / záznam průběhu…"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${t.border}`,
                  background: t.input,
                  color: t.text,
                  outline: "none",
                  fontSize: 13,
                }}
              />
              <button
                onClick={() => {
                  const text = newPhase.trim();
                  if (!text) return;
                  const next = [
                    ...(task.phases || []),
                    { id: crypto.randomUUID?.() || String(Date.now()), text, date: Date.now() },
                  ];
                  s({ phases: next });
                  setNewPhase("");
                }}
                style={{
                  width: 44,
                  borderRadius: 10,
                  border: "none",
                  background: t.accent,
                  color: "#fff",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
                title="Přidat"
              >
                +
              </button>
            </div>
          </Sec>


          <Sec label="Opakování">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { value: null, label: "Žádné" },
                { value: "daily", label: "Každý den" },
                { value: "weekly", label: "Každý týden" },
                { value: "monthly", label: "Každý měsíc" },
              ].map(({ value, label }) => {
                const active = (task.recurrence ?? null) === value;
                return (
                  <button
                    key={String(value)}
                    onClick={() => updateTask(task.id, { recurrence: value })}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: active ? 600 : 400,
                      border: `1px solid ${active ? t.accent : t.border}`,
                      background: active ? t.accentBg : "transparent",
                      color: active ? t.accent : t.text2,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {task.recurrence && (
              <div style={{ marginTop: 6, fontSize: 11, color: t.text3 }}>
                Po dokončení se automaticky vytvoří nový úkol.
              </div>
            )}
          </Sec>

          <Sec label="Přiřazeno">
            <AssigneeSelector taskId={task.id} currentAssigneeId={task.assigneeUserId} onChange={(uid) => s({ assigneeUserId: uid })} />
          </Sec>

          <Sec label="Přílohy">
            <AttachmentsMiniList taskId={task.id} />
          </Sec>

          <Sec label="Poznámky">
            <NotesMiniList taskId={task.id} />
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
   Assignee Selector
───────────────────────────────────────────── */
function AssigneeSelector({ currentAssigneeId, onChange }) {
  const { t, workspaceMembers } = useApp();
  const [open, setOpen] = useState(false);

  const currentMember = workspaceMembers.find((m) => m.userId === currentAssigneeId);
  const getLabel = (m) => m?.displayName || m?.email || `${m?.userId?.slice(0, 8)}…`;
  const getInitials = (m) => (m?.email || m?.userId || "?").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.input, color: t.text, cursor: "pointer", fontSize: 12, width: "100%" }}
      >
        {currentAssigneeId ? (
          <>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: t.accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
              {getInitials(currentMember)}
            </div>
            <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(currentMember)}</span>
          </>
        ) : (
          <>
            <Icon name="plus" size={12} color={t.text3} strokeWidth={2} />
            <span style={{ color: t.text2 }}>Nepřiřazeno</span>
          </>
        )}
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 199 }} />
          <div className="pop" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.bg2, border: `1px solid ${t.border}`, borderRadius: 9, zIndex: 200, overflow: "hidden", boxShadow: t.shadow }}>
            <button onClick={() => { onChange(null); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", border: "none", background: !currentAssigneeId ? t.accentBg : "transparent", color: !currentAssigneeId ? t.accent : t.text2, cursor: "pointer", fontSize: 12 }}>
              <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
              Nepřiřazeno
            </button>
            {workspaceMembers.map((m) => (
              <button
                key={m.userId}
                onClick={() => { onChange(m.userId); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 9px", border: "none", background: m.userId === currentAssigneeId ? t.accentBg : "transparent", color: m.userId === currentAssigneeId ? t.accent : t.text, cursor: "pointer", fontSize: 12 }}
              >
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.userId === currentAssigneeId ? t.accent : t.border, display: "flex", alignItems: "center", justifyContent: "center", color: m.userId === currentAssigneeId ? "#fff" : t.text2, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(m)}
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getLabel(m)}</div>
                </div>
                <span style={{ fontSize: 10, color: t.text3, flexShrink: 0 }}>{m.role}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Attachments – Mini list (TaskDrawer + ProjectDetail)
───────────────────────────────────────────── */
function AttachmentsMiniList({ taskId, projectId }) {
  const { t, attachments, uploadAttachment, deleteAttachment } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const relevant = attachments.filter((a) =>
    (taskId && a.taskId === taskId) ||
    (projectId && a.projectId === projectId)
  );

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { toast("Max 25 MB na soubor", "error"); return; }
    setUploading(true);
    try {
      await uploadAttachment(file, { taskId: taskId ?? null, projectId: projectId ?? null });
      toast("Soubor nahrán", "success");
    } catch (e) {
      toast(e.message || "Chyba při nahrávání", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (att) => {
    if (!await confirm(`Smazat "${att.name}"?`)) return;
    try {
      await deleteAttachment(att);
      toast("Smazáno", "success");
    } catch (e) {
      toast(e.message || "Chyba při mazání", "error");
    }
  };

  const getUrl = (att) => {
    const { data } = supabase.storage.from("attachments").getPublicUrl(att.storagePath);
    return data.publicUrl;
  };

  const isImage = (att) => att.mimeType?.startsWith("image/");

  const fmtSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? t.accent : t.border}`,
          borderRadius: 8,
          padding: "9px 14px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: dragOver ? t.accent : t.text2,
          fontSize: 12,
          marginBottom: relevant.length ? 10 : 0,
          transition: "border-color .15s, color .15s",
          background: dragOver ? t.accentBg : "transparent",
        }}
      >
        <Icon name="upload" size={13} color={dragOver ? t.accent : t.text3} strokeWidth={2} />
        {uploading ? "Nahrávám…" : "Přidat soubor nebo obrázek"}
        <input
          ref={fileRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {relevant.map((att) => {
          const url = getUrl(att);
          return (
            <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 7, background: t.input }}>
              {isImage(att) ? (
                <a href={url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                  <img src={url} alt={att.name} style={{ width: 38, height: 38, borderRadius: 5, objectFit: "cover", display: "block" }} />
                </a>
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 5, background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon name="file" size={16} color={t.text3} strokeWidth={1.5} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: t.text, fontSize: 12, fontWeight: 500, textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {att.name}
                </a>
                <div style={{ fontSize: 10, color: t.text3 }}>{fmtSize(att.size)}</div>
              </div>
              <a href={url} target="_blank" rel="noreferrer" style={{ color: t.text3, padding: 4, display: "flex", alignItems: "center" }}>
                <Icon name="external-link" size={12} color={t.text3} strokeWidth={2} />
              </a>
              <button
                onClick={() => handleDelete(att)}
                style={{ background: "none", border: "none", color: t.text3, padding: 4, cursor: "pointer", borderRadius: 4, display: "flex", alignItems: "center" }}
              >
                <Icon name="trash" size={12} color={t.text3} strokeWidth={2} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Notes – Mini list (used in TaskDrawer + ProjectDetail)
───────────────────────────────────────────── */
function NotesMiniList({ taskId, projectId }) {
  const { t, notes, addNote, openNote } = useApp();
  const relevant = notes.filter((n) =>
    (taskId && n.primaryTaskId === taskId) ||
    (projectId && n.primaryProjectId === projectId)
  );

  const handleAdd = () => {
    const n = addNote({ primaryTaskId: taskId || null, primaryProjectId: projectId || null });
    openNote(n.id);
  };

  return (
    <div>
      {relevant.length === 0 && (
        <div style={{ color: t.text3, fontSize: 12, fontStyle: "italic", marginBottom: 8 }}>Zatím žádné poznámky</div>
      )}
      {relevant.map((n) => (
        <div
          key={n.id}
          onClick={() => openNote(n.id)}
          style={{ padding: "7px 10px", borderRadius: 7, background: t.input, border: `1px solid ${t.border}`, marginBottom: 5, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = t.accent + "60")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = t.border)}
        >
          <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {n.pinned && <Icon name="pin" size={10} color={t.accent} strokeWidth={2} />}
              {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
            </span>
          </div>
          {n.content && (
            <div style={{ fontSize: 11, color: t.text3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {n.content.split("\n")[0]}
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleAdd}
        style={{ width: "100%", padding: "6px 12px", borderRadius: 7, border: `1px dashed ${t.border}`, background: "transparent", color: t.text3, fontSize: 12, marginTop: 2 }}
        onMouseEnter={(e) => (e.currentTarget.style.color = t.accent)}
        onMouseLeave={(e) => (e.currentTarget.style.color = t.text3)}
      >
        + Přidat poznámku
      </button>
    </div>
  );
}

function relTime(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 2) return "právě teď";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hod`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "včera";
  if (day < 7) return `${day} d`;
  return new Date(ts).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

/* ─────────────────────────────────────────────
   Notes – Detail editor (right panel)
───────────────────────────────────────────── */
function NoteDetail({ note, onDelete }) {
  const { t, updateNote, projects, tasks, isMobile } = useApp();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [showMeta, setShowMeta] = useState(false);
  const contentRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
  }, [note.id]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.height = "auto";
      contentRef.current.style.height = contentRef.current.scrollHeight + "px";
    }
  }, [content]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useDebouncedEffect(() => { updateNote(note.id, { title, content }); }, [title, content], 600);

  const linkedProject = note.primaryProjectId ? projects.find((p) => p.id === note.primaryProjectId) : null;
  const linkedTask = note.primaryTaskId ? tasks.find((tk) => tk.id === note.primaryTaskId) : null;
  const projColor = linkedProject ? projectColor(linkedProject.id) : null;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readMin = Math.max(1, Math.round(wordCount / 200));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Top action bar */}
      {!isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 32px 0", flexShrink: 0 }}>
          {/* Project / task badge */}
          {linkedProject && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid ${projColor}55`, background: projColor + "12", color: projColor, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="folder" size={9} color={projColor} strokeWidth={2} />
              {linkedProject.name}
            </span>
          )}
          {linkedTask && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20, border: `1.5px solid #3b82f655`, background: "#3b82f612", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="check-square" size={9} color="#3b82f6" strokeWidth={2} />
              {linkedTask.title || "Úkol"}
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => updateNote(note.id, { pinned: !note.pinned })}
              title={note.pinned ? "Odepnout" : "Připnout"}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text3, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
            >
              <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
              {note.pinned ? "Připnuto" : "Připnout"}
            </button>
            <button
              onClick={() => setShowMeta((v) => !v)}
              title="Vlastnosti"
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 7, border: `1px solid ${showMeta ? t.accent : t.border}`, background: showMeta ? t.accentBg : "transparent", color: showMeta ? t.accent : t.text3, fontSize: 11.5, cursor: "pointer" }}
            >
              <Icon name="list" size={12} color="currentColor" strokeWidth={2} />
              Vlastnosti
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                title="Smazat"
                style={{ display: "flex", alignItems: "center", padding: "5px 8px", borderRadius: 7, border: `1px solid transparent`, background: "transparent", color: t.text3, cursor: "pointer" }}
              >
                <Icon name="trash" size={13} color="#ef4444" strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "20px 18px 32px" : "20px 40px 40px", maxWidth: isMobile ? "100%" : 860 }}>
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název poznámky…"
          style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.6px", border: "none", background: "transparent", color: t.text, outline: "none", width: "100%", fontFamily: "'Outfit',sans-serif", marginBottom: 16, display: "block" }}
        />

        <textarea
          ref={contentRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"Začni psát…"}
          style={{ width: "100%", minHeight: 200, border: "none", background: "transparent", color: t.text, outline: "none", resize: "none", fontSize: 15, lineHeight: 1.8, fontFamily: "'Figtree',sans-serif", overflow: "hidden", display: "block" }}
        />

        {/* Properties panel (collapsible) */}
        {(showMeta || isMobile) && (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: t.text3, marginBottom: 10 }}>Vazba na projekt nebo úkol</div>
            <select
              value={
                note.primaryProjectId ? `project:${note.primaryProjectId}` :
                note.primaryTaskId ? `task:${note.primaryTaskId}` : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) updateNote(note.id, { primaryProjectId: null, primaryTaskId: null });
                else if (v.startsWith("project:")) updateNote(note.id, { primaryProjectId: v.slice(8), primaryTaskId: null });
                else if (v.startsWith("task:")) updateNote(note.id, { primaryProjectId: null, primaryTaskId: v.slice(5) });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 13, outline: "none", marginBottom: 14 }}
            >
              <option value="">— Bez vazby</option>
              <optgroup label="Projekty">
                {projects.map((p) => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}
              </optgroup>
              <optgroup label="Úkoly">
                {tasks.map((tk) => <option key={tk.id} value={`task:${tk.id}`}>{tk.title || "Bez názvu"}</option>)}
              </optgroup>
            </select>
            {isMobile && (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => updateNote(note.id, { pinned: !note.pinned })} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: `1.5px solid ${note.pinned ? "#f59e0b" : t.border}`, background: note.pinned ? "#f59e0b18" : "transparent", color: note.pinned ? "#f59e0b" : t.text2, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <Icon name="pin" size={12} color="currentColor" strokeWidth={2} />
                  {note.pinned ? "Připnuto" : "Připnout"}
                </button>
                {onDelete && (
                  <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", borderRadius: 7, border: "none", background: "transparent", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <Icon name="trash" size={12} color="currentColor" strokeWidth={2} />
                    Smazat
                  </button>
                )}
              </div>
            )}
            <div style={{ fontSize: 11, color: t.text3, lineHeight: 1.7 }}>
              <div>Vytvořeno: {new Date(note.createdAt).toLocaleString("cs-CZ")}</div>
              <div>Upraveno: {new Date(note.updatedAt).toLocaleString("cs-CZ")}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer: word count + autosave indicator */}
      <div style={{ flexShrink: 0, padding: "6px 40px", borderTop: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, fontSize: 11, color: t.text3 }}>
        <span>{wordCount} slov · {readMin} min čtení</span>
        <span style={{ opacity: 0.5 }}>Automaticky uloženo</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Notes Page
───────────────────────────────────────────── */
function NotesPage() {
  const { t, notes, addNote, deleteNote, projects, tasks, openNoteId, setOpenNoteId, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();
  const [selId, setSelId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("updated");
  const [mobileView, setMobileView] = useState("list");

  useEffect(() => {
    if (openNoteId) {
      setSelId(openNoteId);
      setOpenNoteId(null);
      if (isMobile) setMobileView("detail");
    } else if (!selId && notes.length > 0 && !isMobile) {
      setSelId(notes[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNoteId]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); const n = addNote({}); setSelId(n.id); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addNote]);

  const handleCreate = () => {
    const n = addNote({});
    setSelId(n.id);
    if (isMobile) setMobileView("detail");
  };

  const handleDelete = async (id) => {
    if (!await confirm("Smazat poznámku?")) return;
    deleteNote(id);
    const remaining = sortedNotes.filter((n) => n.id !== id);
    setSelId(remaining.length > 0 ? remaining[0].id : null);
    if (isMobile) setMobileView("list");
    toast("Poznámka smazána", "success");
  };

  const s = search.toLowerCase();
  let filtered = notes.filter((n) => !search || n.title.toLowerCase().includes(s) || n.content.toLowerCase().includes(s));
  if (filter === "pinned") filtered = filtered.filter((n) => n.pinned);
  else if (filter === "project") filtered = filtered.filter((n) => !!n.primaryProjectId);
  else if (filter === "task") filtered = filtered.filter((n) => !!n.primaryTaskId);
  else if (filter === "unlinked") filtered = filtered.filter((n) => !n.primaryProjectId && !n.primaryTaskId);

  const sortedNotes = [...filtered].sort((a, b) => {
    if (sortBy === "updated") return b.updatedAt - a.updatedAt;
    if (sortBy === "created") return b.createdAt - a.createdAt;
    return a.title.localeCompare(b.title, "cs");
  });

  const selNote = notes.find((n) => n.id === selId) || null;

  const filterTabs = [
    { k: "all", l: "Vše", count: notes.length },
    { k: "pinned", l: "📌 Připnuto" },
    { k: "project", l: "Projekt" },
    { k: "task", l: "Úkol" },
    { k: "unlinked", l: "Volné" },
  ];

  const showList = !isMobile || mobileView === "list";
  const showDetail = !isMobile || mobileView === "detail";

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }} className="fi">

      {/* ── LEFT: list ── */}
      {showList && (
        <div style={{ width: isMobile ? "100%" : 300, minWidth: isMobile ? "auto" : 280, borderRight: isMobile ? "none" : `1px solid ${t.border}`, display: "flex", flexDirection: "column", background: t.bg2, overflow: "hidden", flex: isMobile ? 1 : "none" }}>

          {/* Header */}
          <div style={{ padding: "16px 14px 10px", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="file-text" size={15} color={t.accent} strokeWidth={2} />
                Poznámky
                <span style={{ fontSize: 11, fontWeight: 500, color: t.text3, background: t.input, padding: "1px 7px", borderRadius: 8 }}>
                  {notes.length}
                </span>
              </div>
              <button
                onClick={handleCreate}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 7, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                <Icon name="plus" size={13} color="#fff" strokeWidth={2.5} />
                Nová
              </button>
            </div>

            {/* Search */}
            <div style={{ position: "relative" }}>
              <Icon name="search" size={13} color={t.text3} strokeWidth={2} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Hledat…"
                style={{ width: "100%", padding: "7px 11px 7px 30px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.input, color: t.text, fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: t.text3, cursor: "pointer", padding: 2, display: "flex" }}>
                  <Icon name="x" size={12} color={t.text3} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 2, padding: "8px 10px 6px", overflowX: "auto", borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
            {filterTabs.map((tab) => (
              <button
                key={tab.k}
                onClick={() => setFilter(tab.k)}
                style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11.5, fontWeight: filter === tab.k ? 700 : 400, border: "none", background: filter === tab.k ? t.accentBg : "transparent", color: filter === tab.k ? t.accent : t.text3, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}
              >
                {tab.l}
              </button>
            ))}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ marginLeft: "auto", padding: "3px 6px", borderRadius: 5, border: `1px solid ${t.border}`, background: t.input, color: t.text2, fontSize: 11, outline: "none", flexShrink: 0 }}
            >
              <option value="updated">Upravené</option>
              <option value="created">Vytvořené</option>
              <option value="title">A–Z</option>
            </select>
          </div>

          {/* Note list */}
          <div style={{ flex: 1, overflow: "auto", padding: "6px 8px" }}>
            {sortedNotes.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 16px", color: t.text3 }}>
                <div style={{ opacity: 0.15, marginBottom: 12, display: "flex", justifyContent: "center" }}>
                  <Icon name="file-text" size={48} color={t.text} strokeWidth={1} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: t.text2 }}>
                  {search ? `Nic pro „${search}"` : filter !== "all" ? "Žádné poznámky v tomto filtru" : "Zatím žádné poznámky"}
                </div>
                {!search && filter === "all" && (
                  <button onClick={handleCreate} style={{ marginTop: 10, padding: "7px 18px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    + Nová poznámka
                  </button>
                )}
              </div>
            )}

            {sortedNotes.map((n) => {
              const proj = n.primaryProjectId ? projects.find((p) => p.id === n.primaryProjectId) : null;
              const task = n.primaryTaskId ? tasks.find((tk) => tk.id === n.primaryTaskId) : null;
              const isActive = n.id === selId;
              const pCol = proj ? projectColor(proj.id) : null;
              const preview = n.content.split("\n").find((l) => l.trim()) || "";
              return (
                <div
                  key={n.id}
                  onClick={() => { setSelId(n.id); if (isMobile) setMobileView("detail"); }}
                  style={{
                    padding: "10px 10px 10px 14px",
                    borderRadius: 9,
                    marginBottom: 3,
                    cursor: "pointer",
                    background: isActive ? t.accentBg : "transparent",
                    border: `1px solid ${isActive ? t.accent + "35" : "transparent"}`,
                    transition: "background .1s",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.cardH; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Project color strip */}
                  {pCol && (
                    <div style={{ position: "absolute", left: 0, top: 4, bottom: 4, width: 3, borderRadius: 2, background: pCol }} />
                  )}

                  {/* Title row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                    {n.pinned && (
                      <span style={{ fontSize: 10, background: "#f59e0b22", color: "#f59e0b", borderRadius: 4, padding: "1px 5px", fontWeight: 700, flexShrink: 0 }}>📌</span>
                    )}
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? t.accent : t.text }}>
                      {n.title || <em style={{ fontWeight: 400, color: t.text3 }}>Bez názvu</em>}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: t.text3, flexShrink: 0 }}>{relTime(n.updatedAt)}</span>
                  </div>

                  {/* Preview */}
                  {preview && (
                    <div style={{ fontSize: 11.5, color: t.text3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5, marginBottom: 5 }}>
                      {preview}
                    </div>
                  )}

                  {/* Badges */}
                  {(proj || task) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      {proj && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: pCol + "20", color: pCol, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="folder" size={8} color={pCol} strokeWidth={2} />
                          {proj.name}
                        </span>
                      )}
                      {task && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: t.accentBg, color: t.accent, display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <Icon name="check-square" size={8} color={t.accent} strokeWidth={2} />
                          {task.title}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "7px 14px", borderTop: `1px solid ${t.border}`, fontSize: 11, color: t.text3, flexShrink: 0 }}>
            {sortedNotes.length} {sortedNotes.length === 1 ? "poznámka" : sortedNotes.length < 5 ? "poznámky" : "poznámek"}
          </div>
        </div>
      )}

      {/* ── RIGHT: editor ── */}
      {showDetail && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: t.bg }}>
          {/* Mobile header */}
          {isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${t.border}`, background: t.bg2, flexShrink: 0 }}>
              <button onClick={() => setMobileView("list")} style={{ background: "none", border: "none", color: t.accent, display: "flex", alignItems: "center", gap: 4, padding: "4px 0", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                <Icon name="chevron-left" size={16} color={t.accent} strokeWidth={2.5} />
                Zpět
              </button>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "0 8px" }}>
                {selNote?.title || "Nová poznámka"}
              </span>
              {selNote && (
                <button onClick={() => handleDelete(selNote.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, display: "flex" }}>
                  <Icon name="trash" size={16} color="#ef4444" strokeWidth={2} />
                </button>
              )}
            </div>
          )}

          {selNote ? (
            <NoteDetail note={selNote} onDelete={() => handleDelete(selNote.id)} />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: t.text3, gap: 12 }}>
              <div style={{ opacity: 0.12 }}>
                <Icon name="file-text" size={64} color={t.text} strokeWidth={1} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>Žádná poznámka vybrána</div>
              <div style={{ fontSize: 13, color: t.text3 }}>Vyber poznámku ze seznamu nebo vytvoř novou</div>
              <button onClick={handleCreate} style={{ marginTop: 4, padding: "8px 20px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                + Nová poznámka
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Tags Page
───────────────────────────────────────────── */
function TagsPage() {
  const { t, tags, tasks, addTag, updateTag, deleteTag, isMobile } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

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
    <div style={{ padding: isMobile ? "16px" : "24px 28px", maxWidth: isMobile ? "100%" : 680 }} className="fi">
      <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, letterSpacing: "-0.8px", marginBottom: 20 }}>Správa tagů</h1>

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
                    onClick={async () => {
                      if (await confirm(`Smazat tag "${tag.name}"?`)) deleteTag(tag.id);
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

/* ─────────────────────────────────────────────
   Command Palette (Cmd+K)
───────────────────────────────────────────── */
function CommandPalette({ onClose }) {
  const { t, tasks, projects, notes, addNote, setPage, setTaskDetail, openProject, openNote, isMobile } = useApp();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Fuzzy match: returns score >= 0 or -1 for no match
  function fuzzy(str, q) {
    if (!q) return 1;
    const s = str.toLowerCase();
    const qq = q.toLowerCase();
    let si = 0, qi = 0, score = 0;
    while (si < s.length && qi < qq.length) {
      if (s[si] === qq[qi]) { score++; qi++; }
      si++;
    }
    return qi === qq.length ? score : -1;
  }

  const quickActions = [
    { id: "new-task",      icon: "check-square", label: "Nový úkol",           group: "Akce",     action: () => { onClose(); window.dispatchEvent(new CustomEvent("focusQuickAdd")); } },
    { id: "new-note",      icon: "file-text",    label: "Nová poznámka",        group: "Akce",     action: () => { const n = addNote({}); openNote(n.id); onClose(); } },
    { id: "go-dashboard",  icon: "home",         label: "Přejít na Přehled",    group: "Navigace", action: () => { setPage("dashboard"); onClose(); } },
    { id: "go-tasks",      icon: "check-square", label: "Přejít na Úkoly",      group: "Navigace", action: () => { setPage("tasks"); onClose(); } },
    { id: "go-timeline",   icon: "calendar",     label: "Přejít na Plán",       group: "Navigace", action: () => { setPage("timeline"); onClose(); } },
    { id: "go-notes",      icon: "file-text",    label: "Přejít na Poznámky",   group: "Navigace", action: () => { setPage("notes"); onClose(); } },
  ];

  const taskResults = tasks
    .filter((task) => task.status !== "done")
    .map((task) => {
      const score = fuzzy(task.title, query);
      if (score < 0) return null;
      const proj = projects.find((p) => p.id === task.projectId);
      return {
        id: "task-" + task.id,
        icon: "check-square",
        label: task.title,
        meta: proj?.name,
        group: "Úkoly",
        score,
        action: () => { setTaskDetail(task.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const projectResults = projects
    .filter((p) => p.status === "active")
    .map((p) => {
      const score = fuzzy(p.name, query);
      if (score < 0) return null;
      return {
        id: "proj-" + p.id,
        icon: "folder",
        label: p.name,
        group: "Projekty",
        score,
        action: () => { openProject(p.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const noteResults = notes
    .map((n) => {
      const score = fuzzy((n.title || "Poznámka bez názvu") + " " + (n.content || ""), query);
      if (score < 0) return null;
      return {
        id: "note-" + n.id,
        icon: "file-text",
        label: n.title || "Poznámka bez názvu",
        group: "Poznámky",
        score,
        action: () => { openNote(n.id); onClose(); },
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const items = query.trim()
    ? [...taskResults, ...projectResults, ...noteResults]
    : quickActions;

  const safeCursor = Math.min(cursor, Math.max(0, items.length - 1));

  useEffect(() => { setCursor(0); }, [query]);

  const handleKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); items[safeCursor]?.action?.(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: isMobile ? "flex-end" : "flex-start",
        justifyContent: "center",
        paddingTop: isMobile ? 0 : "15vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={isMobile ? "su" : "pop"}
        style={{
          width: isMobile ? "100%" : 580, maxWidth: isMobile ? "100%" : "90vw",
          background: t.bg2,
          border: `1px solid ${t.border}`,
          borderRadius: isMobile ? "16px 16px 0 0" : 14,
          boxShadow: isMobile ? "0 -8px 40px rgba(0,0,0,0.4)" : "0 24px 80px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {isMobile && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 2 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${t.border}` }}>
          <Icon name="search" size={15} color={t.text3} strokeWidth={2} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Hledat úkoly, projekty, poznámky…"
            style={{ flex: 1, border: "none", background: "transparent", outline: "none", color: t.text, fontSize: 15 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ background: "none", border: "none", color: t.text3, fontSize: 12, cursor: "pointer" }}>✕</button>
          )}
          <kbd style={{ fontSize: 10, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "2px 6px" }}>Esc</kbd>
        </div>

        <div style={{ maxHeight: isMobile ? "55vh" : 380, overflowY: "auto", padding: "8px 0" }}>
          {items.length === 0 ? (
            <div style={{ padding: "28px 20px", textAlign: "center", color: t.text3, fontSize: 13 }}>
              Nic nenalezeno
            </div>
          ) : (
            groups.map((group) => (
              <div key={group}>
                <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 700, color: t.text3, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {group}
                </div>
                {items
                  .filter((i) => i.group === group)
                  .map((item) => {
                    const globalIdx = items.indexOf(item);
                    const isActive = globalIdx === safeCursor;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setCursor(globalIdx)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 16px", border: "none", textAlign: "left",
                          background: isActive ? t.accentBg : "transparent",
                          borderLeft: isActive ? `2px solid ${t.accent}` : "2px solid transparent",
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon name={item.icon} size={14} color={isActive ? t.accent : t.text2} strokeWidth={1.75} />
                        </span>
                        <span style={{ flex: 1, fontSize: 13.5, color: isActive ? t.accent : t.text, fontWeight: isActive ? 500 : 400 }}>{item.label}</span>
                        {item.meta && <span style={{ fontSize: 11, color: t.text3 }}>{item.meta}</span>}
                        {isActive && <kbd style={{ fontSize: 10, color: t.text3, background: t.input, border: `1px solid ${t.border}`, borderRadius: 4, padding: "1px 5px" }}>↵</kbd>}
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>

        {!isMobile && (
        <div style={{ padding: "8px 16px", borderTop: `1px solid ${t.border}`, display: "flex", gap: 14, fontSize: 11, color: t.text3 }}>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>↑↓</kbd> navigace</span>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>↵</kbd> otevřít</span>
          <span><kbd style={{ background: t.input, border: `1px solid ${t.border}`, borderRadius: 3, padding: "1px 4px" }}>Esc</kbd> zavřít</span>
        </div>
        )}
        {isMobile && <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Timeline / Gantt Page
───────────────────────────────────────────── */
function TimelinePage() {
  const { t, tasks, projects, setTaskDetail } = useApp();
  const today = startOfToday();
  const [offsetDays, setOffsetDays] = useState(0);

  const DAYS = 28;
  const COL_W = 36;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + offsetDays);

  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const fmt = (d) => d.toISOString().slice(0, 10);
  const todayStr = fmt(today);

  const tasksWithDue = tasks.filter((task) => task.dueDate && task.status !== "done");

  const getDayIdx = (dateStr) => {
    const d = parseYMD(dateStr);
    return Math.round((d - startDate) / 86400000);
  };

  const DOW = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
  const MONTHS = ["Led", "Úno", "Bře", "Dub", "Kvě", "Čvn", "Čvc", "Srp", "Zář", "Říj", "Lis", "Pro"];

  const activeProjects = projects.filter((p) => p.status === "active");
  const unassigned = tasksWithDue.filter((task) => !task.projectId);

  const rows = [
    ...activeProjects.map((proj) => ({
      id: proj.id,
      label: proj.name,
      tasks: tasksWithDue.filter((task) => task.projectId === proj.id),
      color: projectColor(proj.id),
    })),
    ...(unassigned.length ? [{ id: "_inbox", label: "Bez projektu", tasks: unassigned, color: "#8b95a5" }] : []),
  ].filter((row) => row.tasks.length > 0);

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: t.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 800, fontSize: 22, display: "flex", alignItems: "center", gap: 9 }}>
            <Icon name="calendar" size={20} color={t.accent} strokeWidth={2} />
            Plán
          </div>
          <div style={{ color: t.text3, fontSize: 13, marginTop: 2 }}>Přehled termínů úkolů na 28 dní</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => setOffsetDays((o) => o - DAYS)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}
          >← Zpět</button>
          <button
            onClick={() => setOffsetDays(0)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.accent}`, background: t.accentBg, color: t.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >Dnes</button>
          <button
            onClick={() => setOffsetDays((o) => o + DAYS)}
            style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${t.border}`, background: t.bg2, color: t.text, fontSize: 13, cursor: "pointer" }}
          >Vpřed →</button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: t.text3 }}>
          <div style={{ marginBottom: 12, opacity: 0.2, display: "flex", justifyContent: "center" }}>
            <Icon name="calendar" size={48} color={t.text} strokeWidth={0.75} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: t.text2 }}>Žádné úkoly s termínem</div>
          <div style={{ fontSize: 13 }}>Přidejte termín k úkolům a zobrazí se zde.</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: DAYS * COL_W + 200 }}>
            {/* Day header */}
            <div style={{ display: "flex", marginLeft: 200, marginBottom: 6 }}>
              {days.map((d, i) => {
                const isToday = fmt(d) === todayStr;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const showMonth = i === 0 || d.getDate() === 1;
                return (
                  <div key={i} style={{ width: COL_W, flexShrink: 0, textAlign: "center", fontSize: 10,
                    color: isToday ? t.accent : isWeekend ? t.text2 : t.text3,
                    fontWeight: isToday ? 700 : 400,
                  }}>
                    {showMonth && <div style={{ fontSize: 9, color: t.text3, marginBottom: 1 }}>{MONTHS[d.getMonth()]}</div>}
                    <div>{DOW[d.getDay()]}</div>
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>

            {/* Rows */}
            {rows.map((row) => (
              <div key={row.id} style={{ display: "flex", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ width: 200, flexShrink: 0, paddingRight: 12, paddingTop: 6, fontSize: 12, fontWeight: 600, color: t.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: row.color, marginRight: 6 }} />
                  {row.label}
                </div>

                <div style={{ position: "relative", flex: 1, height: 34, display: "flex" }}>
                  {/* Background cells */}
                  {days.map((d, i) => {
                    const isToday = fmt(d) === todayStr;
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <div key={i} style={{
                        width: COL_W, flexShrink: 0, height: "100%",
                        borderLeft: `1px solid ${isToday ? t.accent + "60" : t.border}`,
                        background: isToday ? t.accent + "08" : isWeekend ? t.bg2 : "transparent",
                      }} />
                    );
                  })}

                  {/* Task chips */}
                  {row.tasks.map((task) => {
                    const idx = getDayIdx(task.dueDate);
                    if (idx < 0 || idx >= DAYS) return null;
                    const isOverdue = task.dueDate < todayStr;
                    const chipColor = isOverdue ? "#ef4444" : row.color;
                    return (
                      <div
                        key={task.id}
                        title={task.title}
                        onClick={() => setTaskDetail(task.id)}
                        style={{
                          position: "absolute",
                          left: idx * COL_W + 2,
                          top: 5,
                          height: 24,
                          maxWidth: COL_W * 3 - 4,
                          minWidth: COL_W - 4,
                          background: chipColor + "22",
                          border: `1px solid ${chipColor}55`,
                          borderLeft: `3px solid ${chipColor}`,
                          borderRadius: 5,
                          padding: "0 6px",
                          fontSize: 10,
                          fontWeight: 500,
                          color: chipColor,
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          zIndex: 1,
                        }}
                      >
                        {task.recurrence && <span style={{ marginRight: 3, flexShrink: 0, display: "flex" }}><Icon name="repeat" size={9} color="currentColor" strokeWidth={2.5} /></span>}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, display: "flex", gap: 20, fontSize: 11, color: t.text3, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef444422", border: "1px solid #ef444455", borderLeft: "3px solid #ef4444" }} />
          Prošlý termín
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="repeat" size={11} color={t.text3} strokeWidth={2} /> Opakující se
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 14, height: 12, background: t.accent + "08", borderLeft: `2px solid ${t.accent}` }} />
          Dnes
        </div>
        <div style={{ marginLeft: "auto", color: t.text3 }}>Kliknutím na úkol otevřete detail</div>
      </div>
    </div>
  );
}