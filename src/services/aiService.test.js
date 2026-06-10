import { describe, expect, it } from "vitest";
import { buildAiConsoleBody, getAiConsoleAction } from "./aiService.js";

describe("getAiConsoleAction", () => {
  it("falls back to draft task action for unknown ids", () => {
    const action = getAiConsoleAction("unknown-action");

    expect(action.id).toBe("draft_task");
    expect(action.functionName).toBe("ai-task-assist");
  });
});

describe("buildAiConsoleBody", () => {
  it("builds draft task request body", () => {
    const body = buildAiConsoleBody("draft_task", "Zavolat klientovi zítra", {
      availableTags: ["prace"],
      availableProjects: ["Klienti"],
    });

    expect(body.action).toBe("draft_task");
    expect(body.text).toBe("Zavolat klientovi zítra");
    expect(body.availableTags).toEqual(["prace"]);
    expect(body.availableProjects).toEqual(["Klienti"]);
    expect(body.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds note request body", () => {
    const body = buildAiConsoleBody("note_summary", "Poznámka k poradě", {
      workspaceId: "workspace-1",
    });

    expect(body.action).toBe("note_summary");
    expect(body.note.title).toBe("Testovací poznámka");
    expect(body.note.content).toBe("Poznámka k poradě");
    expect(body.workspaceId).toBe("workspace-1");
  });

  it("builds project planner request body", () => {
    const body = buildAiConsoleBody("project_planner", "Vytvořit nový web", {
      availableTags: ["web", "design"],
    });

    expect(body).toEqual({
      userPrompt: "Vytvořit nový web",
      availableTags: ["web", "design"],
    });
  });

  it("builds task action request body", () => {
    const body = buildAiConsoleBody("priority", "Vyřešit kritický bug v AI", {
      workspaceId: "workspace-1",
      availableTags: ["ai"],
    });

    expect(body.action).toBe("priority");
    expect(body.task.title).toBe("Vyřešit kritický bug v AI");
    expect(body.task.description).toBe("Vyřešit kritický bug v AI");
    expect(body.availableTags).toEqual(["ai"]);
    expect(body.workspaceId).toBe("workspace-1");
  });
});
