import { describe, expect, it, vi } from "vitest";
import { toProjectUpdatePayload } from "./projectService.js";

vi.mock("../supabase.js", () => ({ supabase: {} }));

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
