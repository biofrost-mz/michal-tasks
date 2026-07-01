import { describe, expect, it, vi } from "vitest";
import { toProjectUpdatePayload, updateProjectPositions } from "./projectService.js";

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

describe("toProjectUpdatePayload", () => {
  it("propouští jen DB pole projektu a mapuje updatedAt", () => {
    expect(toProjectUpdatePayload({
      name: "Nový projekt",
      description: "Popis",
      status: "active",
      position: 2000,
      updatedAt: "2026-07-01T09:00:00Z",
      color: "#123456",
      createdAt: 123,
    })).toEqual({
      name: "Nový projekt",
      description: "Popis",
      status: "active",
      position: 2000,
      updated_at: "2026-07-01T09:00:00Z",
    });
  });

  it("propustí updated_at kvůli současným voláním z aplikace", () => {
    expect(toProjectUpdatePayload({
      status: "deleted",
      updated_at: "2026-07-01T09:00:00Z",
    })).toEqual({
      status: "deleted",
      updated_at: "2026-07-01T09:00:00Z",
    });
  });
});

describe("updateProjectPositions", () => {
  it("uloží pozice projektů přes DB position payload", async () => {
    mockUpdate
      .mockReturnValueOnce({ eq: mockEq })
      .mockReturnValueOnce({ eq: mockEq });
    mockEq
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    await updateProjectPositions([
      { id: "project-1", position: 1000, color: "#123456" },
      { id: "project-2", position: 2000, updatedAt: 123 },
    ]);

    expect(mockUpdate).toHaveBeenNthCalledWith(1, { position: 1000 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { position: 2000 });
    expect(mockEq).toHaveBeenNthCalledWith(1, "id", "project-1");
    expect(mockEq).toHaveBeenNthCalledWith(2, "id", "project-2");
  });
});
