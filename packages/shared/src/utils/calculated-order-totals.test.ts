import { describe, it, expect } from "vitest";
import {
  createProductOrderItem,
  createReformOrderItem,
  createAppliedCoupon,
  createProduct,
  createProductOption,
} from "../test/fixtures";
import {
  getOrderItemPricing,
  calculateOrderTotals,
  calculateOrderSummary,
} from "./calculated-order-totals";

describe("getOrderItemPricing", () => {
  it("상품+옵션 추가금을 합산한다", () => {
    const item = createProductOrderItem({
      product: createProduct({ price: 10000 }),
      selectedOption: createProductOption({ additionalPrice: 2000 }),
    });
    const { unitPrice } = getOrderItemPricing(item);
    expect(unitPrice).toBe(12000);
  });

  it("수선 아이템은 cost를 반환한다", () => {
    const item = createReformOrderItem({
      reformData: { tie: { id: "t-1", measurementType: "length", tieLength: 145 }, cost: 15000 },
    });
    const { unitPrice } = getOrderItemPricing(item);
    expect(unitPrice).toBe(15000);
  });
});

describe("calculateOrderTotals", () => {
  it("빈 배열은 모두 0을 반환한다", () => {
    const totals = calculateOrderTotals([]);
    expect(totals).toEqual({ originalPrice: 0, totalDiscount: 0, totalPrice: 0 });
  });

  it("다중 아이템의 합계를 계산한다", () => {
    const items = [
      createProductOrderItem({ product: createProduct({ price: 10000 }), quantity: 2 }),
      createReformOrderItem({ reformData: { tie: { id: "t-1" }, cost: 5000 }, quantity: 1 }),
    ];
    const totals = calculateOrderTotals(items);
    expect(totals.originalPrice).toBe(25000);
    expect(totals.totalPrice).toBe(25000);
  });

  it("할인을 수량만큼 반영한다", () => {
    const coupon = createAppliedCoupon({
      coupon: { id: "c-1", name: "할인", discountType: "fixed", discountValue: 1000, expiryDate: "2027-01-01" },
    });
    const items = [
      createProductOrderItem({
        product: createProduct({ price: 10000 }),
        selectedOption: createProductOption({ additionalPrice: 0 }),
        quantity: 3,
        appliedCoupon: coupon,
      }),
    ];
    const totals = calculateOrderTotals(items);
    expect(totals.totalDiscount).toBe(3000);
    expect(totals.totalPrice).toBe(27000);
  });
});

describe("calculateOrderSummary", () => {
  it("총수량을 포함한 요약을 반환한다", () => {
    const items = [
      createProductOrderItem({ quantity: 2 }),
      createReformOrderItem({ quantity: 3 }),
    ];
    const summary = calculateOrderSummary(items);
    expect(summary.totalQuantity).toBe(5);
  });
});
