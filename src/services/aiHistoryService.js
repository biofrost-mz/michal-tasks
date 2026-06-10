const AI_HISTORY_KEY = "zentero:ai_history";
const MAX_HISTORY = 80;

function safeJsonParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

export function getAiHistory() {
  if (typeof localStorage === "undefined") return [];
  return safeJsonParse(localStorage.getItem(AI_HISTORY_KEY), []);
}

export function saveAiHistoryEntry(entry) {
  if (typeof localStorage === "undefined") return null;
  const normalized = {
    id: entry.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: entry.createdAt || nowIso(),
    action: entry.action || "unknown",
    functionName: entry.functionName || null,
    status: entry.status || "success",
    durationMs: Number.isFinite(Number(entry.durationMs)) ? Number(entry.durationMs) : null,
    model: entry.model || entry.meta?.model || null,
    source: entry.source || entry.meta?.source || null,
    provider: entry.provider || entry.meta?.provider || null,
    fallback: Boolean(entry.fallback || entry.meta?.fallback),
    summary: entry.summary || "",
    error: entry.error ? String(entry.error).slice(0, 800) : null,
    metadata: entry.metadata || {},
  };
  const next = [normalized, ...getAiHistory()].slice(0, MAX_HISTORY);
  localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("zentero:ai_history_updated", { detail: normalized }));
  return normalized;
}

export function clearAiHistory() {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(AI_HISTORY_KEY);
  window.dispatchEvent(new CustomEvent("zentero:ai_history_updated", { detail: null }));
}

export function summarizeAiResult(result) {
  if (!result) return "Bez výsledku";
  if (Array.isArray(result)) return `${result.length} položek`;
  if (typeof result === "string") return result.slice(0, 120);
  if (result.tasks?.length) return `${result.tasks.length} úkolů`;
  if (result.title) return result.title;
  if (result.priority) return `Priorita: ${result.priority}`;
  return "Výsledek vrácen";
}
