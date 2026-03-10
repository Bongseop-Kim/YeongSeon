import { describe, it, expect } from "vitest";
import { createAppliedCoupon } from "../test/fixtures";
import { calculateDiscount } from "./calculate-discount";

describe("calculateDiscount", () => {
  it("쿠폰이 없으면 0을 반환한다", () => {
    expect(calculateDiscount(10000, undefined)).toBe(0);
  });

  it("status가 active가 아니면 0을 반환한다", () => {
    const coupon = createAppliedCoupon({ status: "used" });
    expect(calculateDiscount(10000, coupon)).toBe(0);
  });

  it("만료된 쿠폰은 0을 반환한다", () => {
    const coupon = createAppliedCoupon({ expiresAt: "2020-01-01" });
    expect(calculateDiscount(10000, coupon)).toBe(0);
  });

  it("expiresAt이 null이면 만료되지 않은 것으로 처리한다", () => {
    const coupon = createAppliedCoupon({
      expiresAt: null,
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 500, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(500);
  });

  it("정액 할인을 적용한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 3000, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(3000);
  });

  it("정액 할인에 maxDiscountAmount cap을 적용한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 5000, maxDiscountAmount: 2000, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(2000);
  });

  it("할인이 가격을 초과하면 가격만큼만 할인한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 15000, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(10000);
  });

  it("비율 할인을 적용한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "percentage", discountValue: 10, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(1000);
  });

  it("비율 할인에 maxDiscountAmount cap을 적용한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "percentage", discountValue: 50, maxDiscountAmount: 3000, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(3000);
  });

  it("100% 할인은 가격 전액을 할인한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "percentage", discountValue: 100, expiryDate: "2027-01-01" },
    });
    expect(calculateDiscount(10000, coupon)).toBe(10000);
  });

  it("qty>1일 때 maxDiscountAmount를 라인 단위로 적용한다 (정액)", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 5000, maxDiscountAmount: 8000, expiryDate: "2027-01-01" },
    });
    // perUnit=5000, line=5000*3=15000, capped=8000, finalUnit=floor(8000/3)=2666, remainder=8000%3=2
    // total=2666*3+2=8000
    expect(calculateDiscount(10000, coupon, 3)).toBe(8000);
  });

  it("qty>1일 때 maxDiscountAmount를 라인 단위로 적용한다 (비율)", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "percentage", discountValue: 50, maxDiscountAmount: 10000, expiryDate: "2027-01-01" },
    });
    // perUnit=floor(10000*0.5)=5000, line=5000*3=15000, capped=10000, finalUnit=floor(10000/3)=3333, remainder=10000%3=1
    // total=3333*3+1=10000
    expect(calculateDiscount(10000, coupon, 3)).toBe(10000);
  });
});
