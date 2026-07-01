import { describe, expect, it, vi } from "vitest";
import { normalizeNote, toNoteUpdatePayload } from "./noteService.js";

vi.mock("../supabase.js", () => ({ supabase: {} }));

describe("normalizeNote", () => {
  it("mapuje plný DB řádek na frontend objekt", () => {
    const raw = {
      id: "note-1",
      title: "Poradu ke Q3",
      content: "Obsah poznámky",
      primary_project_id: "proj-1",
      primary_task_id: "task-1",
      extra_project_ids: ["proj-2"],
      extra_task_ids: ["task-2"],
      pinned: true,
      status: "active",
      icon: "📝",
      archived: false,
      tags: ["tag-a"],
      created_at: "2026-06-01T10:00:00Z",
      updated_at: "2026-06-05T12:00:00Z",
    };

    const note = normalizeNote(raw);

    expect(note.id).toBe("note-1");
    expect(note.title).toBe("Poradu ke Q3");
    expect(note.content).toBe("Obsah poznámky");
    expect(note.primaryProjectId).toBe("proj-1");
    expect(note.primaryTaskId).toBe("task-1");
    expect(note.extraProjectIds).toEqual(["proj-2"]);
    expect(note.extraTaskIds).toEqual(["task-2"]);
    expect(note.pinned).toBe(true);
    expect(note.status).toBe("active");
    expect(note.icon).toBe("📝");
    expect(note.archived).toBe(false);
    expect(note.tags).toEqual(["tag-a"]);
    expect(typeof note.createdAt).toBe("number");
    expect(typeof note.updatedAt).toBe("number");
  });

  it("doplňuje výchozí hodnoty pro chybějící pole", () => {
    const note = normalizeNote({ id: "note-2" });

    expect(note.title).toBe("");
    expect(note.content).toBe("");
    expect(note.primaryProjectId).toBeNull();
    expect(note.primaryTaskId).toBeNull();
    expect(note.extraProjectIds).toEqual([]);
    expect(note.extraTaskIds).toEqual([]);
    expect(note.pinned).toBe(false);
    expect(note.status).toBe("draft");
    expect(note.icon).toBeNull();
    expect(note.archived).toBe(false);
    expect(note.tags).toEqual([]);
  });

  it("pinned a archived jsou vždy boolean", () => {
    const note = normalizeNote({ id: "n", pinned: 1, archived: 0 });

    expect(note.pinned).toBe(true);
    expect(note.archived).toBe(false);
  });

  it("createdAt a updatedAt jsou timestamps", () => {
    const note = normalizeNote({ id: "note-3", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-06-01T00:00:00Z" });

    expect(note.createdAt).toBe(new Date("2026-01-01T00:00:00Z").getTime());
    expect(note.updatedAt).toBe(new Date("2026-06-01T00:00:00Z").getTime());
  });

  it("createdAt fallback na aktuální čas pokud chybí", () => {
    const before = Date.now();
    const note = normalizeNote({ id: "note-4" });
    const after = Date.now();

    expect(note.createdAt).toBeGreaterThanOrEqual(before);
    expect(note.createdAt).toBeLessThanOrEqual(after);
  });
});

describe("toNoteUpdatePayload", () => {
  it("mapuje frontend vazby na DB sloupce", () => {
    expect(toNoteUpdatePayload({
      title: "Nový název",
      primaryProjectId: "proj-1",
      primaryTaskId: null,
      extraProjectIds: ["proj-2"],
      extraTaskIds: [],
      updatedAt: "2026-07-01T09:00:00Z",
      createdAt: 123,
      workspaceId: "ws-1",
    })).toEqual({
      title: "Nový název",
      primary_project_id: "proj-1",
      primary_task_id: null,
      extra_project_ids: ["proj-2"],
      extra_task_ids: [],
      updated_at: "2026-07-01T09:00:00Z",
    });
  });

  it("propustí existující DB názvy kvůli současným voláním z aplikace", () => {
    expect(toNoteUpdatePayload({
      status: "deleted",
      updated_at: "2026-07-01T09:00:00Z",
      primary_project_id: null,
    })).toEqual({
      status: "deleted",
      updated_at: "2026-07-01T09:00:00Z",
      primary_project_id: null,
    });
  });
});
