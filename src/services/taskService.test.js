import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeTask, insertTask, updateTaskDB, toTaskUpdatePayload } from "./taskService.js";

// Mockujeme Supabase — testy ověřují logiku, ne síťová volání.
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: vi.fn(() => ({ eq: mockEq })),
      select: vi.fn(() => ({ in: mockIn })),
      eq: mockEq,
    })),
  },
}));

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

describe("insertTask — smoke test", () => {
  beforeEach(() => {
    mockInsert.mockReset();
  });

  it("volá supabase.insert se správným payloadem", async () => {
    mockInsert.mockResolvedValueOnce({ data: [{ id: "t1" }], error: null });

    const tsk = {
      id: "t1", title: "Nový úkol", description: "Popis",
      status: "todo", priority: "medium", dueDate: "2026-07-01",
      projectId: "proj-1", position: 5000, starred: false,
      phases: [], subtasks: [], remindAt: null, assigneeUserId: null,
    };
    const result = await insertTask(tsk, "user-1", "ws-1");

    expect(result.ok).toBe(true);
    expect(mockInsert).toHaveBeenCalledOnce();
    const payload = mockInsert.mock.calls[0][0];
    expect(payload.title).toBe("Nový úkol");
    expect(payload.owner).toBe("user-1");
    expect(payload.workspace_id).toBe("ws-1");
    expect(payload.completed_at).toBeNull();
    expect(payload).not.toHaveProperty("remind_at");
    expect(payload).not.toHaveProperty("assignee_user_id");
  });

  it("nastaví completed_at pokud je status done", async () => {
    mockInsert.mockResolvedValueOnce({ data: [{}], error: null });

    await insertTask(
      { id: "t2", title: "Hotový", status: "done", phases: [], subtasks: [] },
      "user-1", "ws-1"
    );

    const payload = mockInsert.mock.calls[0][0];
    expect(payload.completed_at).not.toBeNull();
  });

  it("vyhodí chybu pokud supabase vrátí error bez FK race condition", async () => {
    mockInsert.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "permission denied" } });

    await expect(
      insertTask({ id: "t3", title: "Fail", status: "todo", phases: [], subtasks: [] }, "u", "ws")
    ).rejects.toBeDefined();
  });
});

describe("toTaskUpdatePayload", () => {
  it("mapuje frontend pole na DB sloupce a zachová přímá task pole", () => {
    expect(toTaskUpdatePayload({
      title: "Přejmenovaný",
      projectId: "proj-1",
      dueDate: "2026-07-10",
      remindAt: null,
      assigneeUserId: "user-2",
      completedAt: "2026-07-01T08:00:00Z",
      updatedAt: "2026-07-01T09:00:00Z",
      tagIds: ["tag-1"],
      createdAt: 123,
      workspaceId: "ws-1",
    })).toEqual({
      title: "Přejmenovaný",
      project_id: "proj-1",
      due_date: "2026-07-10",
      remind_at: null,
      assignee_user_id: "user-2",
      completed_at: "2026-07-01T08:00:00Z",
      updated_at: "2026-07-01T09:00:00Z",
    });
  });

  it("propustí existující DB názvy kvůli současným voláním z aplikace", () => {
    expect(toTaskUpdatePayload({
      status: "deleted",
      due_date: null,
      updated_at: "2026-07-01T09:00:00Z",
    })).toEqual({
      status: "deleted",
      due_date: null,
      updated_at: "2026-07-01T09:00:00Z",
    });
  });
});

describe("updateTaskDB — smoke test", () => {
  it("volá supabase.update s id a payloadem", async () => {
    mockUpdate.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockResolvedValueOnce({ error: null });

    await updateTaskDB("task-99", { title: "Přejmenovaný", dueDate: "2026-07-10", tagIds: ["ui-only"] });

    expect(mockUpdate).toHaveBeenCalledWith({ title: "Přejmenovaný", due_date: "2026-07-10" });
    expect(mockEq).toHaveBeenCalledWith("id", "task-99");
  });
});
