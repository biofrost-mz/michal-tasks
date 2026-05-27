import { supabase } from "../supabase.js";

export async function insertQuickTodo(qt, userId, workspaceId) {
  const { error } = await supabase.from("quick_todos").insert({
    id: qt.id,
    owner: userId,
    workspace_id: workspaceId,
    text: qt.text,
    done: false,
    priority: qt.priority ?? null,
    due_date: qt.dueDate ?? null,
    tags: qt.tags?.length ? qt.tags : null,
    description: qt.description ?? null,
  });
  if (error) throw error;
}

export async function updateQuickTodoDB(id, payload) {
  const { error } = await supabase.from("quick_todos").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteQuickTodoDB(id) {
  const { error } = await supabase.from("quick_todos").delete().eq("id", id);
  if (error) throw error;
}
