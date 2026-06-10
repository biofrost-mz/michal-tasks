import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAiHistory,
  getAiHistory,
  sanitizeAiHistoryMetadata,
  saveAiHistoryEntry,
} from "./aiHistoryService.js";

describe("sanitizeAiHistoryMetadata", () => {
  it("removes sensitive input previews and keeps only input length by default", () => {
    const metadata = sanitizeAiHistoryMetadata({
      inputPreview: "Soukromý obsah poznámky",
      source: "test",
    });

    expect(metadata).toEqual({
      source: "test",
      inputLength: 23,
    });
  });
});

describe("saveAiHistoryEntry", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(window, "dispatchEvent").mockImplementation(() => true);
  });

  it("does not persist raw input preview text", () => {
    saveAiHistoryEntry({
      action: "draft_task",
      metadata: {
        inputPreview: "Zavolat klientovi ohledně tajné nabídky",
      },
    });

    const [entry] = getAiHistory();
    expect(entry.metadata).toEqual({ inputLength: 39 });
    expect(JSON.stringify(entry)).not.toContain("tajné nabídky");
  });

  it("clears stored history", () => {
    saveAiHistoryEntry({ action: "draft_task" });
    clearAiHistory();

    expect(getAiHistory()).toEqual([]);
  });
});
