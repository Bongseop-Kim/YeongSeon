import { describe, expect, it } from "vitest";
import {
  normalizeKeyword,
  toDateString,
} from "@/features/order/utils/list-filters";

describe("list-filters", () => {
  it("키워드를 trim하고 소문자로 정규화한다", () => {
    expect(normalizeKeyword("  HeLLo World  ")).toBe("hello world");
    expect(normalizeKeyword()).toBe("");
  });

  it("유효한 Date만 YYYY-MM-DD 형식으로 변환한다", () => {
    expect(toDateString(new Date("2026-03-15T00:00:00Z"))).toBe("2026-03-15");
    expect(toDateString(new Date("invalid"))).toBeUndefined();
    expect(toDateString()).toBeUndefined();
  });
});
