import { describe, expect, it, vi } from "vitest";
import { toTagUpdatePayload } from "./tagService.js";

vi.mock("../supabase.js", () => ({ supabase: {} }));

describe("toTagUpdatePayload", () => {
  it("propouští jen DB pole tagu a mapuje updatedAt", () => {
    expect(toTagUpdatePayload({
      name: "Práce",
      color: "#0f766e",
      updatedAt: "2026-07-01T09:00:00Z",
      createdAt: 123,
      workspaceId: "ws-1",
    })).toEqual({
      name: "Práce",
      color: "#0f766e",
      updated_at: "2026-07-01T09:00:00Z",
    });
  });

  it("propustí updated_at kvůli současným voláním z aplikace", () => {
    expect(toTagUpdatePayload({
      name: "Osobní",
      updated_at: "2026-07-01T09:00:00Z",
    })).toEqual({
      name: "Osobní",
      updated_at: "2026-07-01T09:00:00Z",
    });
  });
});
