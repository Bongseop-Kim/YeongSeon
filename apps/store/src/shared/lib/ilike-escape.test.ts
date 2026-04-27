import { describe, expect, it } from "vitest";
import { escapeIlikePattern } from "@/shared/lib/ilike-escape";

describe("escapeIlikePattern", () => {
  it("ilike 와일드카드(%, _)와 백슬래시를 이스케이프한다", () => {
    expect(escapeIlikePattern("100% off_a\\b")).toBe("100\\% off\\_a\\\\b");
  });

  it("이스케이프 대상이 없으면 입력을 그대로 반환한다", () => {
    expect(escapeIlikePattern("plain text")).toBe("plain text");
  });
});
