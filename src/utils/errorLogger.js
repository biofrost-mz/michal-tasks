// Globální zachytávač chyb pro aplikaci Michal Tasks
import { supabase } from "../supabase.js";

const ERR_KEY = "mt3:system_errors";
const REMOTE_ERROR_LOGGING_ENABLED =
  import.meta.env.PROD || import.meta.env.VITE_ENABLE_REMOTE_ERROR_LOGGING === "true";
const sentRecently = new Map();

function sanitizeErrorLog(errorLog) {
  return {
    severity: errorLog.severity || "error",
    type: errorLog.type || "client_error",
    message: String(errorLog.message || "Neznámá chyba").slice(0, 1200),
    filename: errorLog.filename || null,
    lineno: Number.isFinite(Number(errorLog.lineno)) ? Number(errorLog.lineno) : null,
    colno: Number.isFinite(Number(errorLog.colno)) ? Number(errorLog.colno) : null,
    stack: errorLog.stack ? String(errorLog.stack).slice(0, 6000) : null,
    url: window.location.href,
    appVersion: import.meta.env.VITE_APP_VERSION || null,
    metadata: {
      source: "global_error_logger",
    },
  };
}

function shouldSendRemote(errorLog) {
  const key = `${errorLog.type}:${errorLog.message}:${errorLog.filename}`;
  const now = Date.now();
  const lastSent = sentRecently.get(key) || 0;

  if (now - lastSent < 30_000) {
    return false;
  }

  sentRecently.set(key, now);
  return true;
}

async function sendRemoteError(errorLog) {
  if (!REMOTE_ERROR_LOGGING_ENABLED || !shouldSendRemote(errorLog)) return;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) return;

    const { error } = await supabase.functions.invoke("client-error-log", {
      body: sanitizeErrorLog(errorLog),
    });

    if (error) {
      console.warn("Nepodařilo se odeslat chybový log do Supabase:", error);
    }
  } catch (e) {
    console.warn("Nepodařilo se odeslat chybový log do Supabase:", e);
  }
}

// Bezpečné načtení chyb z LocalStorage
export function getErrorLogs() {
  try {
    const raw = localStorage.getItem(ERR_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Nepodařilo se načíst chybové logy:", e);
    return [];
  }
}

// Uložení nové chyby s limitem 50 záznamů
export function saveError(errorLog) {
  try {
    const list = getErrorLogs();

    // Vložení na začátek (nejnovější nahoře)
    list.unshift(errorLog);

    // Omezení délky na 50 záznamů pro prevenci zaplnění LocalStorage
    if (list.length > 50) {
      list.pop();
    }

    localStorage.setItem(ERR_KEY, JSON.stringify(list));
    sendRemoteError(errorLog);

    // Vyvolání vlastního eventu pro real-time aktualizaci v AdminPage
    window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: errorLog }));
  } catch (e) {
    console.warn("Nepodařilo se uložit chybový log:", e);
  }
}

// Vyčištění chyb
export function clearErrorLogs() {
  try {
    localStorage.removeItem(ERR_KEY);
    window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: null }));
  } catch (e) {
    console.warn("Nepodařilo se vymazat chybové logy:", e);
  }
}

// Inicializace globálních posluchačů
export function initGlobalErrorLogging() {
  if (typeof window === "undefined") return;

  // Zachycení běžných JS chyb (window.onerror)
  window.addEventListener("error", (event) => {
    // Ignorujeme chyby z cizích skriptů / rozšíření prohlížeče (CORS)
    if (!event.message || event.message.includes("Script error")) return;

    const errorLog = {
      id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      type: "unhandled_error",
      message: event.message,
      filename: event.filename ? event.filename.split("/").pop() : "neznámý",
      lineno: event.lineno || 0,
      colno: event.colno || 0,
      stack: event.error?.stack || null,
    };

    saveError(errorLog);
  });

  // Zachycení zamítnutých slibů (Promises) bez catch handleru
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message || String(event.reason || "Zamítnutý Promise");

    const errorLog = {
      id: Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      type: "promise_rejection",
      message: message,
      filename: "promise",
      lineno: 0,
      colno: 0,
      stack: event.reason?.stack || null,
    };

    saveError(errorLog);
  });
}

// Funkce pro simulaci chyb (pro účely testování administračního rozhraní)
export function simulateError() {
  setTimeout(() => {
    throw new Error("Testovací simulovaná chyba systému Atlas OS!");
  }, 10);
}

export function simulatePromiseRejection() {
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error("Testovací selhání asynchronní operace (Promise Rejection)!"));
    }, 10);
  });
}
