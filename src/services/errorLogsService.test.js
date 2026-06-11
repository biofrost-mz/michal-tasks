import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase.js", () => ({ supabase: {} }));
import {
  clearLocalErrorLogs,
  createSimulatedErrorLog,
  getLocalErrorLogs,
  sanitizeErrorLog,
  saveLocalErrorLog,
} from "./errorLogsService.js";

function installLocalStorageMock() {
  const store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key) => store.get(key) || null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
  });
  vi.stubGlobal("window", {
    location: { href: "https://tasks.example.test/admin" },
    dispatchEvent: vi.fn(),
  });
  vi.stubGlobal("CustomEvent", class CustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init?.detail;
    }
  });
}

describe("errorLogsService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installLocalStorageMock();
  });

  it("sanitizes error logs before remote submit", () => {
    const sanitized = sanitizeErrorLog({
      severity: "fatal",
      type: "runtime",
      message: "x".repeat(1400),
      filename: "App.jsx",
      lineno: "12",
      colno: "5",
      stack: "stack".repeat(2000),
      metadata: { module: "test" },
    });

    expect(sanitized.severity).toBe("fatal");
    expect(sanitized.type).toBe("runtime");
    expect(sanitized.message.length).toBe(1200);
    expect(sanitized.stack.length).toBe(6000);
    expect(sanitized.lineno).toBe(12);
    expect(sanitized.colno).toBe(5);
    expect(sanitized.url).toBe("https://tasks.example.test/admin");
    expect(sanitized.metadata).toMatchObject({ source: "global_error_logger", module: "test" });
  });

  it("saves and reads local error logs", () => {
    saveLocalErrorLog({ id: "1", message: "První chyba" });
    saveLocalErrorLog({ id: "2", message: "Druhá chyba" });

    const logs = getLocalErrorLogs();
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toBe("Druhá chyba");
    expect(logs[1].message).toBe("První chyba");
  });

  it("keeps only the latest 50 local logs", () => {
    for (let i = 0; i < 55; i += 1) {
      saveLocalErrorLog({ id: String(i), message: `Chyba ${i}` });
    }

    const logs = getLocalErrorLogs();
    expect(logs).toHaveLength(50);
    expect(logs[0].message).toBe("Chyba 54");
    expect(logs.at(-1).message).toBe("Chyba 5");
  });

  it("clears local error logs", () => {
    saveLocalErrorLog({ id: "1", message: "Chyba" });
    clearLocalErrorLogs();

    expect(getLocalErrorLogs()).toEqual([]);
  });

  it("creates simulated bug report log", () => {
    const log = createSimulatedErrorLog();

    expect(log.type).toBe("simulated");
    expect(log.message).toContain("Testovací chyba");
    expect(log.url).toBe("https://tasks.example.test/admin");
  });
});
