import { describe, expect, it } from "vitest";
import { getNextRecurrenceDueDate, shouldCreateRecurringTask } from "./recurrenceService.js";

describe("getNextRecurrenceDueDate", () => {
  it("spočítá další den pro denní opakování", () => {
    expect(getNextRecurrenceDueDate("daily", "2026-07-02")).toBe("2026-07-03");
  });

  it("spočítá další týden a dva týdny", () => {
    expect(getNextRecurrenceDueDate("weekly", "2026-07-02")).toBe("2026-07-09");
    expect(getNextRecurrenceDueDate("biweekly", "2026-07-02")).toBe("2026-07-16");
  });

  it("u měsíčního opakování drží lokální YYYY-MM-DD formát", () => {
    expect(getNextRecurrenceDueDate("monthly", "2026-07-02")).toBe("2026-08-02");
  });

  it("použije fallback datum, pokud úkol nemá termín", () => {
    expect(getNextRecurrenceDueDate("daily", null, new Date(2026, 6, 2))).toBe("2026-07-03");
  });

  it("ignoruje neznámé opakování", () => {
    expect(getNextRecurrenceDueDate("yearly", "2026-07-02")).toBeNull();
  });
});

describe("shouldCreateRecurringTask", () => {
  it("vytvoří kopii jen při prvním přechodu do hotovo", () => {
    const recurringTask = { status: "todo", recurrence: "weekly" };

    expect(shouldCreateRecurringTask({ status: "todo" }, recurringTask, { status: "done" })).toBe(true);
    expect(shouldCreateRecurringTask({ status: "done" }, recurringTask, { status: "done" })).toBe(false);
  });

  it("nevytvoří kopii bez platného opakování", () => {
    expect(shouldCreateRecurringTask(
      { status: "todo" },
      { status: "done", recurrence: null },
      { status: "done" },
    )).toBe(false);
  });
});
