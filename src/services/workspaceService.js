import { supabase } from "../supabase.js";
import { uuid4 } from "../utils.js";

export function normalizeWorkspace(m) {
  return {
    id: m.workspaces.id,
    name: m.workspaces.name,
    role: m.role,
    createdAt: m.workspaces.created_at ? new Date(m.workspaces.created_at).getTime() : Date.now(),
  };
}

export async function fetchWorkspaces(userId) {
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

export async function fetchMembers(wsId) {
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

export async function ensurePersonalWorkspace(userId) {
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
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

// Seed constants
const SEED = {
  PROJ_TEST: "seed-proj-test",
  TAG_URGENT: "seed-tag-urgent",
  TAG_IT: "seed-tag-it",
  TAG_CONTENT: "seed-tag-content",
  TAG_HR: "seed-tag-hr",
  TAG_DESIGN: "seed-tag-design",
  TASK_TEST: "seed-task-test",
};

function sid(workspaceId, key) {
  return `${workspaceId.slice(0, 8)}-${key}`;
}

export async function seedIfEmpty(userId, workspaceId) {
  const { count: pCount, error: pCountErr } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (pCountErr) throw pCountErr;

  const projId = sid(workspaceId, SEED.PROJ_TEST);
  const tagItId = sid(workspaceId, SEED.TAG_IT);
  const taskId = sid(workspaceId, SEED.TASK_TEST);

  if ((pCount || 0) === 0) {
    const { error } = await supabase.from("projects").insert({
      id: projId,
      owner: userId,
      created_by: userId,
      workspace_id: workspaceId,
      name: "Testovací projekt",
      description: "Ukázkový projekt pro seznámení s aplikací",
      status: "active",
      position: 1000,
    });
    if (error) throw error;
  }

  const { count: tCount, error: tCountErr } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (tCountErr) throw tCountErr;

  if ((tCount || 0) === 0) {
    const tags = [
      { key: SEED.TAG_URGENT, name: "urgent",  color: "#ef4444" },
      { key: SEED.TAG_IT,     name: "IT",       color: "#3b82f6" },
      { key: SEED.TAG_CONTENT,name: "content",  color: "#8b5cf6" },
      { key: SEED.TAG_HR,     name: "HR",       color: "#f59e0b" },
      { key: SEED.TAG_DESIGN, name: "design",   color: "#ec4899" },
    ];
    const { error } = await supabase.from("tags").insert(
      tags.map((t) => ({ id: sid(workspaceId, t.key), owner: userId, created_by: userId, workspace_id: workspaceId, name: t.name, color: t.color }))
    );
    if (error) throw error;
  }

  const { count: tkCount, error: tkCountErr } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (tkCountErr) throw tkCountErr;

  if ((tkCount || 0) === 0) {
    const { error: tErr } = await supabase.from("tasks").insert({
      id: taskId,
      owner: userId,
      created_by: userId,
      workspace_id: workspaceId,
      project_id: projId,
      title: "Testovací úkol",
      status: "todo",
      position: 1000,
    });
    if (tErr) throw tErr;
    const { error: ttErr } = await supabase.from("task_tags").insert({
      task_id: taskId,
      tag_id: tagItId,
    });
    if (ttErr) throw ttErr;
  }
}
