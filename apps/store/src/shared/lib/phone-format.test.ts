import { describe, expect, it } from "vitest";
import {
  extractPhoneNumber,
  formatPhoneNumber,
} from "@/shared/lib/phone-format";

describe("phone-format", () => {
  it("숫자만 추출한다", () => {
    expect(extractPhoneNumber("010-1234-5678")).toBe("01012345678");
  });

  it("길이에 따라 전화번호를 포맷팅한다", () => {
    expect(formatPhoneNumber("010")).toBe("010");
    expect(formatPhoneNumber("0101234")).toBe("010-1234");
    expect(formatPhoneNumber("01012345678")).toBe("010-1234-5678");
    expect(formatPhoneNumber("0101234567899")).toBe("010-1234-5678");
  });
});
