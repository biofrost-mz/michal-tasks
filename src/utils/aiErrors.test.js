import { describe, expect, it } from "vitest";
import { getAiErrorMessage, parseAiJsonResult } from "./aiErrors.js";

describe("getAiErrorMessage", () => {
  it("recognizes overloaded Gemini model errors", () => {
    const info = getAiErrorMessage(new Error('Gemini 503: {"error":{"message":"This model is currently experiencing high demand","status":"UNAVAILABLE"}}'));

    expect(info.type).toBe("model_overloaded");
    expect(info.severity).toBe("warning");
    expect(info.title).toBe("AI model je přetížený");
  });

  it("recognizes missing or invalid API key configuration", () => {
    const info = getAiErrorMessage(new Error("invalid x-api-key"));

    expect(info.type).toBe("configuration");
    expect(info.severity).toBe("error");
  });

  it("recognizes missing edge function errors", () => {
    const info = getAiErrorMessage({ status: 404, message: "Function not found" });

    expect(info.type).toBe("not_deployed");
  });
});

describe("parseAiJsonResult", () => {
  it("parses JSON wrapped in a markdown code block", () => {
    const parsed = parseAiJsonResult('```json\n{"priority":"high","reason":"Test"}\n```');

    expect(parsed).toEqual({ priority: "high", reason: "Test" });
  });

  it("throws an enhanced parse error for invalid JSON", () => {
    expect(() => parseAiJsonResult("not json")).toThrow("AI odpověď není validní JSON.");
  });
});
