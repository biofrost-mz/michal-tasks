// Globální zachytávač chyb pro aplikaci Michal Tasks

const ERR_KEY = "mt3:system_errors";

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
    
    // Vyvolání vlastního eventu pro real-time aktualizaci v AdminPage
    window.dispatchEvent(new CustomEvent("mt3:error_logged", { detail: errorLog }));
  } catch (e) {
    console.warn("Nepodařilo se uložit chybový log:", e);
  }
}

// Vyčištění chyb
export function clearErrorLogs() {
  try {
    localStorage.setItem(ERR_KEY, JSON.stringify([]));
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
