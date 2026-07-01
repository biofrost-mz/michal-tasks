import { supabase } from "../supabase.js";

const RETRY_DELAYS = [160, 320, 640, 1000, 1400];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetrySave(error) {
  if (!error) return false;
  return error.code === "23503" || error.code === "40001" || error.code === "40P01";
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj ?? {}, key);
}

async function runWithRetry(operation, label) {
  let lastError = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
    const { error } = await operation();
    if (!error) return { ok: true, error: null };
    lastError = error;
    if (!shouldRetrySave(error) || attempt === RETRY_DELAYS.length) break;
    await delay(RETRY_DELAYS[attempt]);
  }
  console.warn(`${label} failed:`, lastError);
  return { ok: false, error: lastError };
}

export function formatDbError(error, fallback = "Databázová operace selhala") {
  if (!error) return fallback;
  const parts = [error.message, error.details, error.hint, error.code].filter(Boolean);
  return parts.join(" · ") || fallback;
}

export function normalizeProject(p, i = 0) {
  let color = null;
  let desc = p.description || "";
  const match = desc.match(/\[color:(#[a-fA-F0-9]{6})\]/);
  if (match) {
    color = match[1];
    desc = desc.replace(/\[color:(#[a-fA-F0-9]{6})\]/, "").trim();
  }
  return {
    id: p.id,
    name: p.name,
    description: desc,
    status: p.status || "active",
    tags: [],
    position: p.position ?? (i + 1) * 1000,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    updatedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
    color: color,
  };
}

export function toProjectUpdatePayload(payload = {}) {
  const next = {};
  const directFields = ["name", "description", "status", "position"];

  directFields.forEach((field) => {
    if (hasOwn(payload, field)) next[field] = payload[field];
  });

  if (hasOwn(payload, "updatedAt")) next.updated_at = payload.updatedAt;
  if (hasOwn(payload, "updated_at")) next.updated_at = payload.updated_at;

  return next;
}

export async function insertProject(proj, userId, workspaceId) {
  const payload = {
    id: proj.id,
    owner: userId,
    workspace_id: workspaceId,
    created_by: userId,
    name: proj.name,
    description: proj.description,
    status: proj.status,
    position: proj.position,
  };

  const result = await runWithRetry(
    () => supabase.from("projects").insert(payload),
    "insertProject"
  );

  if (!result.ok) throw new Error(formatDbError(result.error, "Projekt se nepodařilo uložit"));
}

export async function updateProjectDB(id, payload) {
  const { error } = await supabase.from("projects").update(toProjectUpdatePayload(payload)).eq("id", id);
  if (error) throw error;
}

export async function deleteProjectDB(id) {
  await supabase.from("tasks").update({ project_id: null }).eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
