import { supabase } from "../supabase.js";

export async function uploadFile(file, userId) {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("attachments").upload(path, file);
  if (error) throw error;
  return path;
}

export async function insertAttachmentDB(att, userId, workspaceId) {
  const { error } = await supabase.from("attachments").insert({
    id: att.id,
    owner: userId,
    workspace_id: workspaceId,
    task_id: att.taskId,
    project_id: att.projectId,
    note_id: att.noteId,
    name: att.name,
    size: att.size,
    mime_type: att.mimeType,
    storage_path: att.storagePath,
  });
  if (error) {
    // Roll back the uploaded file
    await supabase.storage.from("attachments").remove([att.storagePath]);
    throw error;
  }
}

export async function deleteAttachmentDB(att) {
  await supabase.storage.from("attachments").remove([att.storagePath]);
  await supabase.from("attachments").delete().eq("id", att.id);
}
