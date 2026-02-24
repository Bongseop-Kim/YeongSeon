import { describe, it, expect } from "vitest";
import { getClaimTypeLabel } from "./claim-utils";

describe("getClaimTypeLabel", () => {
  it("cancel은 '취소'를 반환한다", () => {
    expect(getClaimTypeLabel("cancel")).toBe("취소");
  });

  it("return은 '반품'을 반환한다", () => {
    expect(getClaimTypeLabel("return")).toBe("반품");
  });

  it("exchange는 '교환'을 반환한다", () => {
    expect(getClaimTypeLabel("exchange")).toBe("교환");
  });
});
