import { supabase } from "../supabase.js";

const MAX = 50;

// Historie chatu k projektu uložená v DB (sdílená per workspace).
// Volající si ošetří chyby — když tabulka neexistuje / jsme offline,
// komponenta spadne zpět na localStorage.

export async function fetchProjectChat(projectId, limit = MAX) {
  const { data, error } = await supabase
    .from("project_chats")
    .select("role, content, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((m) => ({
    role: m.role,
    content: m.content,
    ts: new Date(m.created_at).getTime(),
  }));
}

export async function insertProjectChat({ projectId, workspaceId, userId, role, content }) {
  const { error } = await supabase.from("project_chats").insert({
    project_id: projectId,
    workspace_id: workspaceId,
    owner: userId,
    role,
    content,
  });
  if (error) throw error;
}

export async function clearProjectChat(projectId) {
  const { error } = await supabase.from("project_chats").delete().eq("project_id", projectId);
  if (error) throw error;
}
