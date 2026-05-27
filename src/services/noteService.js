import { supabase } from "../supabase.js";

export function normalizeNote(n) {
  return {
    id: n.id,
    title: n.title || "",
    content: n.content || "",
    primaryProjectId: n.primary_project_id || null,
    primaryTaskId: n.primary_task_id || null,
    pinned: !!n.pinned,
    createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
  };
}

export async function insertNote(note, userId, workspaceId) {
  const { error } = await supabase.from("notes").insert({
    id: note.id,
    owner: userId,
    workspace_id: workspaceId,
    created_by: userId,
    title: note.title,
    content: note.content,
    primary_project_id: note.primaryProjectId,
    primary_task_id: note.primaryTaskId,
    pinned: note.pinned,
  });
  if (error) throw error;
}

export async function updateNoteDB(id, payload) {
  const { error } = await supabase.from("notes").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteNoteDB(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
