import { describe, expect, it } from "vitest";
import { formatWithComma } from "@/utils/format-number";

describe("formatWithComma", () => {
  it("숫자를 콤마 포맷으로 변환한다", () => {
    expect(formatWithComma(1234567)).toBe("1,234,567");
  });

  it("문자열 숫자를 콤마 포맷으로 변환한다", () => {
    expect(formatWithComma("1234567")).toBe("1,234,567");
  });

  it("undefined이면 빈 문자열을 반환한다", () => {
    expect(formatWithComma(undefined)).toBe("");
  });

  it("0을 정상 처리한다", () => {
    expect(formatWithComma(0)).toBe("0");
  });

  it("NaN 문자열이면 NaN 문자열을 반환한다", () => {
    expect(formatWithComma("NaN")).toBe("NaN");
  });
});
