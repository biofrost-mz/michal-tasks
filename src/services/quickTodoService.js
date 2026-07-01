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

export function toQuickTodoUpdatePayload(payload = {}) {
  const dbPayload = {};
  if (Object.prototype.hasOwnProperty.call(payload, "text")) dbPayload.text = payload.text;
  if (Object.prototype.hasOwnProperty.call(payload, "done")) dbPayload.done = payload.done;
  if (Object.prototype.hasOwnProperty.call(payload, "priority")) dbPayload.priority = payload.priority;
  if (Object.prototype.hasOwnProperty.call(payload, "dueDate")) dbPayload.due_date = payload.dueDate;
  if (Object.prototype.hasOwnProperty.call(payload, "tags")) dbPayload.tags = payload.tags;
  if (Object.prototype.hasOwnProperty.call(payload, "description")) dbPayload.description = payload.description;
  return dbPayload;
}

export async function updateQuickTodoDB(id, payload) {
  const dbPayload = toQuickTodoUpdatePayload(payload);
  const { error } = await supabase.from("quick_todos").update(dbPayload).eq("id", id);
  if (error) throw error;
}

export async function deleteQuickTodoDB(id) {
  const { error } = await supabase.from("quick_todos").delete().eq("id", id);
  if (error) throw error;
}
