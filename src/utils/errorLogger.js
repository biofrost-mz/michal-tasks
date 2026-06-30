// Globální zachytávač chyb pro aplikaci Michal Tasks
import {
  clearLocalErrorLogs,
  getLocalErrorLogs,
  saveErrorLog,
} from "../services/errorLogsService.js";

export function getErrorLogs() {
  return getLocalErrorLogs();
}

export function saveError(errorLog) {
  saveErrorLog(errorLog);
}

export function clearErrorLogs() {
  clearLocalErrorLogs();
}

// Inicializace globálních posluchačů
export function initGlobalErrorLogging() {
  if (typeof window === "undefined") return;
  if (window.__mtGlobalErrorLoggingInitialized) return;
  window.__mtGlobalErrorLoggingInitialized = true;

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
