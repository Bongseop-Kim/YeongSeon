import { describe, expect, it } from "vitest";
import { createCoupon } from "../test/fixtures";
import { formatCouponName } from "./format-coupon-name";

describe("formatCouponName", () => {
  it("시스템 샘플 쿠폰 코드는 소비자용 한국어 이름으로 포맷한다", () => {
    expect(
      formatCouponName(createCoupon({ name: "SAMPLE_DISCOUNT_SEWING" })),
    ).toBe("봉제 샘플 할인 쿠폰");
    expect(
      formatCouponName(
        createCoupon({
          name: "SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING",
        }),
      ),
    ).toBe("원단+봉제 샘플 할인 쿠폰 (날염)");
  });

  it("일반 쿠폰명은 그대로 유지한다", () => {
    expect(formatCouponName(createCoupon({ name: "신규 가입 쿠폰" }))).toBe(
      "신규 가입 쿠폰",
    );
  });
});
