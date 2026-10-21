import { describe, it, expect } from "vitest";
import { naturalDateLabel, parseNaturalDate } from "./naturalDate.js";
import { startOfToday } from "../utils.js";
import { formatDateKey } from "../locale.js";

function keyForOffset(days) {
  const d = startOfToday();
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

describe("naturalDateLabel — relativní popisky bez posunu o den", () => {
  it("dnešní datum → 'dnes'", () => {
    expect(naturalDateLabel(keyForOffset(0))).toBe("dnes");
  });
  it("zítřek → 'zítra'", () => {
    expect(naturalDateLabel(keyForOffset(1))).toBe("zítra");
  });
  it("pozítří → 'pozítří'", () => {
    expect(naturalDateLabel(keyForOffset(2))).toBe("pozítří");
  });
  it("prázdný vstup → prázdný řetězec", () => {
    expect(naturalDateLabel("")).toBe("");
  });
});

describe("parseNaturalDate + label konzistence", () => {
  it("'dneska' → dnešní klíč a popisek 'dnes'", () => {
    const { date } = parseNaturalDate("dneska");
    expect(date).toBe(keyForOffset(0));
    expect(naturalDateLabel(date)).toBe("dnes");
  });
  it("'zitra' → zítřejší klíč a popisek 'zítra'", () => {
    const { date } = parseNaturalDate("zitra");
    expect(date).toBe(keyForOffset(1));
    expect(naturalDateLabel(date)).toBe("zítra");
  });
});
