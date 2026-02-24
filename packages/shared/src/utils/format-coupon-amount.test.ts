import { describe, it, expect } from "vitest";
import { createCoupon } from "../test/fixtures";
import { formatCouponAmount } from "./format-coupon-amount";

describe("formatCouponAmount", () => {
  it("percentage 타입은 %로 포맷한다", () => {
    const coupon = createCoupon({ discountType: "percentage", discountValue: 10 });
    expect(formatCouponAmount(coupon)).toBe("10%");
  });

  it("fixed 타입은 원으로 포맷한다", () => {
    const coupon = createCoupon({ discountType: "fixed", discountValue: 500 });
    expect(formatCouponAmount(coupon)).toBe("500원");
  });

  it("큰 금액은 콤마를 포함한다", () => {
    const coupon = createCoupon({ discountType: "fixed", discountValue: 10000 });
    expect(formatCouponAmount(coupon)).toBe("10,000원");
  });
});
