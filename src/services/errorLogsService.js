const ERR_KEY = "mt3:system_errors";
const REMOTE_ERROR_LOGGING_ENABLED =
  import.meta.env.PROD || import.meta.env.VITE_ENABLE_REMOTE_ERROR_LOGGING === "true";
const sentRecently = new Map();

async function getSupabaseClient() {
  const module = await import("../supabase.js");
  return module.supabase;
}

function currentUrl() {
  if (typeof window === "undefined") return null;
  return window.location.href;
}

function dispatchErrorLogEvent(errorLog = null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: errorLog }));
}

export function sanitizeErrorLog(errorLog) {
  return {
    severity: errorLog.severity || "error",
    type: errorLog.type || "client_error",
    message: String(errorLog.message || "Neznámá chyba").slice(0, 1200),
    filename: errorLog.filename || null,
    lineno: Number.isFinite(Number(errorLog.lineno)) ? Number(errorLog.lineno) : null,
    colno: Number.isFinite(Number(errorLog.colno)) ? Number(errorLog.colno) : null,
    stack: errorLog.stack ? String(errorLog.stack).slice(0, 6000) : null,
    url: currentUrl(),
    appVersion: import.meta.env.VITE_APP_VERSION || null,
    metadata: {
      source: "global_error_logger",
      ...(errorLog.metadata || {}),
    },
  };
}

function shouldSendRemote(errorLog) {
  const key = `${errorLog.type}:${errorLog.message}:${errorLog.filename}`;
  const now = Date.now();
  const lastSent = sentRecently.get(key) || 0;

  if (now - lastSent < 30_000) return false;
  sentRecently.set(key, now);
  return true;
}

export async function sendRemoteErrorLog(errorLog) {
  if (!REMOTE_ERROR_LOGGING_ENABLED || !shouldSendRemote(errorLog)) return false;

  try {
    const supabase = await getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return false;

    const { error } = await supabase.functions.invoke("client-error-log", {
      body: sanitizeErrorLog(errorLog),
    });

    if (error) {
      console.warn("Nepodařilo se odeslat chybový log do Supabase:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Nepodařilo se odeslat chybový log do Supabase:", error);
    return false;
  }
}

export function getLocalErrorLogs() {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn("Nepodařilo se načíst chybové logy:", error);
    return [];
  }
}

export function saveLocalErrorLog(errorLog) {
  try {
    const list = getLocalErrorLogs();
    list.unshift(errorLog);
    if (list.length > 50) list.pop();
    localStorage.setItem(ERR_KEY, JSON.stringify(list));
    dispatchErrorLogEvent(errorLog);
    return true;
  } catch (error) {
    console.warn("Nepodařilo se uložit chybový log:", error);
    return false;
  }
}

export function clearLocalErrorLogs() {
  try {
    localStorage.removeItem(ERR_KEY);
    dispatchErrorLogEvent(null);
    return true;
  } catch (error) {
    console.warn("Nepodařilo se vymazat chybové logy:", error);
    return false;
  }
}

export function saveErrorLog(errorLog) {
  const saved = saveLocalErrorLog(errorLog);
  sendRemoteErrorLog(errorLog);
  return saved;
}

export async function fetchRemoteErrorLogs(limit = 50) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase
    .from("app_error_logs")
    .select("id, created_at, severity, type, message, filename, lineno, colno, stack, url, user_agent, app_version, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function deleteRemoteErrorLogsByIds(ids) {
  if (!ids?.length) return 0;
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("app_error_logs").delete().in("id", ids);
  if (error) throw error;
  return ids.length;
}

export async function deleteRemoteErrorLogsOlderThan(days = 30) {
  const supabase = await getSupabaseClient();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("app_error_logs").delete().lt("created_at", cutoff);
  if (error) throw error;
  return cutoff;
}

export function createSimulatedErrorLog() {
  return {
    id: Date.now(),
    type: "simulated",
    message: "Testovací chyba vyvolaná z administrace",
    stack: "AdminPage.simulateError → test",
    timestamp: new Date().toISOString(),
    url: currentUrl(),
  };
}
