import { supabase } from "../supabase.js";

const RETRY_DELAYS = [200, 500, 1000, 1800, 3000, 5000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetrySave(error) {
  if (!error) return false;
  return error.code === "23503";
}

function summarizeSupabaseError(error) {
  if (!error) return "Neznámá chyba";
  return [error.code, error.message, error.details, error.hint].filter(Boolean).join(" · ");
}

async function runWithRetry(operation, label) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    const { error } = await operation();
    if (!error) return { ok: true, error: null, attempts: attempt + 1 };
    lastError = error;
    if (!shouldRetrySave(error) || attempt === RETRY_DELAYS.length) break;
    await delay(RETRY_DELAYS[attempt]);
  }
  console.warn(`${label} failed:`, summarizeSupabaseError(lastError), lastError);
  return { ok: false, error: lastError, attempts: RETRY_DELAYS.length + 1 };
}

export function normalizeTask(t, tagIds = []) {
  return {
    id: t.id,
    title: t.title || "",
    description: t.description || "",
    status: t.status || "todo",
    priority: t.priority ?? null,
    dueDate: t.due_date ?? null,
    projectId: t.project_id ?? null,
    tagIds,
    position: t.position ?? Date.now(),
    createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
    updatedAt: t.updated_at ? new Date(t.updated_at).getTime() : Date.now(),
    completedAt: t.completed_at ? new Date(t.completed_at).getTime() : null,
    phases: Array.isArray(t.phases) ? t.phases : [],
    subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
    starred: !!t.starred,
    recurrence: t.recurrence ?? null,
    assigneeUserId: t.assignee_user_id ?? null,
    remindAt: t.remind_at ?? null,
  };
}

export async function fetchTasks(workspaceId) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchTaskTags(taskIds) {
  if (!taskIds.length) return [];
  const { data, error } = await supabase
    .from("task_tags")
    .select("task_id, tag_id")
    .in("task_id", taskIds);
  if (error) throw error;
  return data || [];
}

export async function insertTask(tsk, userId, workspaceId) {
  const payload = {
    id: tsk.id,
    owner: userId,
    workspace_id: workspaceId,
    created_by: userId,
    project_id: tsk.projectId,
    title: tsk.title,
    description: tsk.description,
    status: tsk.status,
    priority: tsk.priority,
    due_date: tsk.dueDate,
    ...(tsk.remindAt != null ? { remind_at: tsk.remindAt } : {}),
    ...(tsk.assigneeUserId != null ? { assignee_user_id: tsk.assigneeUserId } : {}),
    position: tsk.position,
    starred: tsk.starred,
    phases: tsk.phases,
    subtasks: tsk.subtasks,
    ...(tsk.recurrence != null ? { recurrence: tsk.recurrence } : {}),
    completed_at: tsk.status === "done" ? new Date().toISOString() : null,
  };

  const result = await runWithRetry(() => supabase.from("tasks").insert(payload), "insertTask");
  if (result.ok) return { ok: true, projectLinked: true };

  // AI generátor projektů vytváří nový projekt a hned za ním více úkolů.
  // Pokud ještě není projekt zapsaný/viditelný pro FK vazbu, nechceme ztratit celý úkol.
  // Proto při FK chybě uložíme úkol do Inboxu a následně ještě zkusíme projektovou vazbu doplnit.
  if (payload.project_id && shouldRetrySave(result.error)) {
    const fallbackPayload = { ...payload, project_id: null };
    const fallbackResult = await runWithRetry(
      () => supabase.from("tasks").insert(fallbackPayload),
      "insertTask:fallbackInbox"
    );

    if (!fallbackResult.ok) throw fallbackResult.error;

    const relinkResult = await runWithRetry(
      () => supabase.from("tasks").update({ project_id: payload.project_id }).eq("id", payload.id),
      "insertTask:relinkProject"
    );

    if (!relinkResult.ok) {
      console.warn(
        "Task was saved without project relation after project FK race:",
        payload.id,
        payload.project_id,
        summarizeSupabaseError(relinkResult.error)
      );
      return { ok: true, projectLinked: false, warning: relinkResult.error };
    }

    return { ok: true, projectLinked: true, recovered: true };
  }

  throw result.error;
}

export async function updateTaskDB(id, payload) {
  const { error } = await supabase.from("tasks").update(payload).eq("id", id);
  if (error) throw error;
}

export async function deleteTaskDB(id) {
  await supabase.from("task_tags").delete().eq("task_id", id);
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function insertTaskTags(taskId, tagIds, userId) {
  if (!tagIds.length) return true;
  const rows = [...new Set(tagIds)].map((tagId) => ({ owner: userId, task_id: taskId, tag_id: tagId }));
  const result = await runWithRetry(() => supabase.from("task_tags").insert(rows), "insertTaskTags");
  if (!result.ok) {
    console.warn("Task saved, but tag relation was skipped:", taskId, tagIds, summarizeSupabaseError(result.error));
  }
  return result.ok;
}

export async function syncTaskTags(taskId, prevTagIds, nextTagIds, userId) {
  const toAdd = nextTagIds.filter((x) => !prevTagIds.includes(x));
  const toRemove = prevTagIds.filter((x) => !nextTagIds.includes(x));
  if (toAdd.length) {
    const rows = toAdd.map((tagId) => ({ owner: userId, task_id: taskId, tag_id: tagId }));
    const { error } = await supabase.from("task_tags").insert(rows);
    if (error) throw error;
  }
  if (toRemove.length) {
    const { error } = await supabase.from("task_tags").delete().eq("task_id", taskId).in("tag_id", toRemove);
    if (error) throw error;
  }
}
