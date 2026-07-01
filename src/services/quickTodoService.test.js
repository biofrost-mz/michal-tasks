import { describe, expect, it, vi, beforeEach } from "vitest";
import { toQuickTodoUpdatePayload, updateQuickTodoDB } from "./quickTodoService.js";

const mockUpdate = vi.fn();
const mockEq = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  },
}));

describe("toQuickTodoUpdatePayload", () => {
  it("mapuje frontend pole na DB sloupce", () => {
    expect(toQuickTodoUpdatePayload({
      text: "Nový název",
      done: false,
      priority: "high",
      dueDate: "2026-07-10",
      tags: ["prace"],
      description: "Detail",
    })).toEqual({
      text: "Nový název",
      done: false,
      priority: "high",
      due_date: "2026-07-10",
      tags: ["prace"],
      description: "Detail",
    });
  });

  it("nepropouští neznámá frontend/UI pole do Supabase update", () => {
    expect(toQuickTodoUpdatePayload({
      text: "Název",
      dueDate: null,
      due_date: "nesmí projít",
      createdAt: 123,
      unknown: true,
    })).toEqual({
      text: "Název",
      due_date: null,
    });
  });
});

describe("updateQuickTodoDB", () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockEq.mockReset();
  });

  it("volá Supabase update s DB payloadem", async () => {
    mockUpdate.mockReturnValueOnce({ eq: mockEq });
    mockEq.mockResolvedValueOnce({ error: null });

    await updateQuickTodoDB("qt-1", { text: "Přejmenováno", dueDate: "2026-07-10" });

    expect(mockUpdate).toHaveBeenCalledWith({ text: "Přejmenováno", due_date: "2026-07-10" });
    expect(mockEq).toHaveBeenCalledWith("id", "qt-1");
  });
});
