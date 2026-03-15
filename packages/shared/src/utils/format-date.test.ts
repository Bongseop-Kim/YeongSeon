import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate } from "@/utils/format-date";

describe("formatDate", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("UTC 기준 오늘 날짜는 오늘을 반환한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    expect(formatDate("2026-03-15T00:00:00Z")).toBe("오늘");
  });

  it("UTC 기준 어제 날짜는 어제를 반환한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    expect(formatDate("2026-03-14T23:59:59Z")).toBe("어제");
  });

  it("오늘과 어제가 아니면 한국어 날짜 포맷을 반환한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00Z"));

    expect(formatDate("2026-03-10T08:30:00Z")).toBe("26. 03. 10. 화요일");
  });

  it("유효하지 않은 입력은 원본 문자열을 반환하고 에러를 기록한다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(errorSpy).toHaveBeenCalledWith("Invalid date string: not-a-date");
  });
});
