import { supabase } from "../supabase.js";

export function normalizeProject(p, i = 0) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || "",
    status: p.status || "active",
    tags: [],
    position: p.position ?? (i + 1) * 1000,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
  };
}

export async function insertProject(proj, userId, workspaceId) {
  const { error } = await supabase.from("projects").insert({
    id: proj.id,
    owner: userId,
    workspace_id: workspaceId,
    created_by: userId,
    name: proj.name,
    description: proj.description,
    status: proj.status,
    position: proj.position,
  });
  if (error) throw error;
}

export async function updateProjectDB(id, payload) {
  const { error } = await supabase.from("projects").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectDB(id) {
  await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
