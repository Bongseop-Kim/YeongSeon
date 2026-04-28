import { describe, expect, it } from "vitest";
import { hasJsonBlockContent } from "@/features/generation-logs/components/generation-log-detail-page";

describe("hasJsonBlockContent", () => {
  it("빈 객체는 표시 가능한 JSON 옵션으로 보지 않는다", () => {
    expect(hasJsonBlockContent({})).toBe(false);
  });

  it("값이 있는 객체와 배열은 표시 가능한 JSON 옵션으로 본다", () => {
    expect(hasJsonBlockContent({ pattern: "classic" })).toBe(true);
    expect(hasJsonBlockContent([])).toBe(true);
  });

  it("null과 undefined는 표시 가능한 JSON 옵션으로 보지 않는다", () => {
    expect(hasJsonBlockContent(null)).toBe(false);
    expect(hasJsonBlockContent(undefined)).toBe(false);
  });
});
