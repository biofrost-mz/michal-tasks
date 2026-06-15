import { supabase } from "../supabase.js";

export function normalizeTag(tg) {
  const createdAt = tg.created_at ? new Date(tg.created_at).getTime() : Date.now();
  return {
    id: tg.id,
    name: tg.name,
    color: tg.color || "#6366f1",
    createdAt,
    updatedAt: tg.updated_at ? new Date(tg.updated_at).getTime() : createdAt,
  };
}

export async function insertTag(tg, userId, workspaceId) {
  const { error } = await supabase.from("tags").insert({
    id: tg.id,
    owner: userId,
    workspace_id: workspaceId,
    created_by: userId,
    name: tg.name,
    color: tg.color,
  });
  if (error) throw error;
}

export async function updateTagDB(id, payload) {
  const { error } = await supabase.from("tags").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteTagDB(id) {
  await supabase.from("task_tags").delete().eq("tag_id", id);
  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) throw error;
}
