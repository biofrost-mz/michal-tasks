import { supabase } from "../supabase.js";

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

export function normalizeNote(n) {
  return {
    id: n.id,
    title: n.title || "",
    content: n.content || "",
    primaryProjectId: n.primary_project_id || null,
    primaryTaskId: n.primary_task_id || null,
    extraProjectIds: n.extra_project_ids || [],
    extraTaskIds: n.extra_task_ids || [],
    pinned: !!n.pinned,
    status: n.status || "draft",
    icon: n.icon || null,
    archived: !!n.archived,
    tags: n.tags || [],
    createdAt: n.created_at ? new Date(n.created_at).getTime() : Date.now(),
    updatedAt: n.updated_at ? new Date(n.updated_at).getTime() : Date.now(),
  };
}

export function toNoteUpdatePayload(payload = {}) {
  const next = {};
  const directFields = ["title", "content", "pinned", "status", "icon", "archived", "tags"];

  directFields.forEach((field) => {
    if (hasOwn(payload, field)) next[field] = payload[field];
  });

  const mappedFields = {
    primaryProjectId: "primary_project_id",
    primaryTaskId: "primary_task_id",
    extraProjectIds: "extra_project_ids",
    extraTaskIds: "extra_task_ids",
    updatedAt: "updated_at",
  };

  Object.entries(mappedFields).forEach(([from, to]) => {
    if (hasOwn(payload, from)) next[to] = payload[from];
  });

  const dbFields = [
    "primary_project_id",
    "primary_task_id",
    "extra_project_ids",
    "extra_task_ids",
    "updated_at",
  ];

  dbFields.forEach((field) => {
    if (hasOwn(payload, field)) next[field] = payload[field];
  });

  return next;
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
    extra_project_ids: note.extraProjectIds?.length ? note.extraProjectIds : null,
    extra_task_ids: note.extraTaskIds?.length ? note.extraTaskIds : null,
    pinned: note.pinned,
    status: note.status || "draft",
    icon: note.icon || null,
    archived: note.archived || false,
    tags: note.tags?.length ? note.tags : null,
  });
  if (error) throw error;
}

export async function updateNoteDB(id, payload) {
  const { error } = await supabase.from("notes").update(toNoteUpdatePayload(payload)).eq("id", id);
  if (error) throw error;
}

export async function deleteNoteDB(id) {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
