import { describe, expect, it, vi } from "vitest";
import { normalizeTask } from "./taskService.js";

// Supabase client se vytváří při importu modulu — mockujeme ho,
// aby testy nežádaly o env proměnné ani síťové spojení.
vi.mock("../supabase.js", () => ({ supabase: {} }));

describe("normalizeTask", () => {
  it("mapuje plný DB řádek na frontend objekt", () => {
    const raw = {
      id: "task-1",
      title: "Zavolat klientovi",
      description: "Ohledně nabídky",
      status: "in_progress",
      priority: "high",
      due_date: "2026-06-15",
      project_id: "proj-1",
      position: 1000,
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-05T12:00:00Z",
      completed_at: null,
      phases: [{ id: "p1", title: "Fáze 1" }],
      subtasks: [{ id: "s1", title: "Subtask" }],
      starred: true,
      recurrence: "weekly",
      assignee_user_id: "user-42",
      remind_at: "2026-06-14T08:00:00Z",
    };

    const task = normalizeTask(raw, ["tag-a", "tag-b"]);

    expect(task.id).toBe("task-1");
    expect(task.title).toBe("Zavolat klientovi");
    expect(task.description).toBe("Ohledně nabídky");
    expect(task.status).toBe("in_progress");
    expect(task.priority).toBe("high");
    expect(task.dueDate).toBe("2026-06-15");
    expect(task.projectId).toBe("proj-1");
    expect(task.tagIds).toEqual(["tag-a", "tag-b"]);
    expect(task.position).toBe(1000);
    expect(task.completedAt).toBeNull();
    expect(task.phases).toEqual([{ id: "p1", title: "Fáze 1" }]);
    expect(task.subtasks).toEqual([{ id: "s1", title: "Subtask" }]);
    expect(task.starred).toBe(true);
    expect(task.recurrence).toBe("weekly");
    expect(task.assigneeUserId).toBe("user-42");
    expect(task.remindAt).toBe("2026-06-14T08:00:00Z");
    expect(typeof task.createdAt).toBe("number");
    expect(typeof task.updatedAt).toBe("number");
  });

  it("doplňuje výchozí hodnoty pro chybějící/null pole", () => {
    const task = normalizeTask({ id: "task-2" });

    expect(task.title).toBe("");
    expect(task.description).toBe("");
    expect(task.status).toBe("todo");
    expect(task.priority).toBeNull();
    expect(task.dueDate).toBeNull();
    expect(task.projectId).toBeNull();
    expect(task.tagIds).toEqual([]);
    expect(task.phases).toEqual([]);
    expect(task.subtasks).toEqual([]);
    expect(task.starred).toBe(false);
    expect(task.recurrence).toBeNull();
    expect(task.assigneeUserId).toBeNull();
    expect(task.remindAt).toBeNull();
    expect(task.completedAt).toBeNull();
  });

  it("completedAt je číslo (timestamp) pokud je vyplněno", () => {
    const task = normalizeTask({ id: "task-3", completed_at: "2026-06-10T09:00:00Z" });

    expect(typeof task.completedAt).toBe("number");
    expect(task.completedAt).toBeGreaterThan(0);
  });

  it("starred je vždy boolean bez ohledu na truthy/falsy hodnotu", () => {
    expect(normalizeTask({ id: "t", starred: 1 }).starred).toBe(true);
    expect(normalizeTask({ id: "t", starred: 0 }).starred).toBe(false);
    expect(normalizeTask({ id: "t", starred: null }).starred).toBe(false);
  });

  it("phases a subtasks jsou prázdné pole pokud není předáno pole", () => {
    const task = normalizeTask({ id: "task-5", phases: null, subtasks: "broken" });

    expect(task.phases).toEqual([]);
    expect(task.subtasks).toEqual([]);
  });

  it("position fallback na aktuální čas pokud chybí", () => {
    const before = Date.now();
    const task = normalizeTask({ id: "task-6" });
    const after = Date.now();

    expect(task.position).toBeGreaterThanOrEqual(before);
    expect(task.position).toBeLessThanOrEqual(after);
  });

  it("createdAt a updatedAt fallback na aktuální čas pokud chybí", () => {
    const before = Date.now();
    const task = normalizeTask({ id: "task-7" });
    const after = Date.now();

    expect(task.createdAt).toBeGreaterThanOrEqual(before);
    expect(task.createdAt).toBeLessThanOrEqual(after);
    expect(task.updatedAt).toBeGreaterThanOrEqual(before);
    expect(task.updatedAt).toBeLessThanOrEqual(after);
  });
});
