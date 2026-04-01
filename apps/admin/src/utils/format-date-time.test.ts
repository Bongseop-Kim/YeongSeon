import { describe, expect, it } from "vitest";
import { formatDateTime } from "@/utils/format-date-time";

describe("formatDateTime", () => {
  it("ISO 일시를 YYYY-MM-DD HH:mm 형식으로 변환한다", () => {
    expect(formatDateTime("2026-03-15T09:00:00Z")).toBe("2026-03-15 18:00");
  });

  it("값이 없으면 대시를 반환한다", () => {
    expect(formatDateTime(null)).toBe("-");
  });

  it("유효하지 않은 값이면 원문을 반환한다", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });
});
