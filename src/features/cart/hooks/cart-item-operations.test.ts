import { describe, it, expect } from "vitest";
import {
  createProduct,
  createCartItem,
  createAppliedCoupon,
  createProductOption,
} from "@/test/fixtures";
import {
  addProductToCart,
  addReformToCart,
  applyCartItemCoupon,
  removeCartItem,
  updateCartItemQuantity,
  updateProductCartItemOption,
} from "@/features/cart/hooks/cart-item-operations";

const product = createProduct();
const baseItem = createCartItem();

const generateItemId = (productId: string | number, optionId = "base") =>
  `${String(productId)}-${optionId}`;

describe("cart-item-operations", () => {
  it("add: 같은 상품/옵션은 수량을 합친다", () => {
    const result = addProductToCart(
      [baseItem],
      product,
      product.options?.[0],
      2,
      generateItemId,
    );

    expect(result.wasExistingItem).toBe(true);
    expect(result.nextItems).toHaveLength(1);
    expect(result.nextItems[0].quantity).toBe(3);
  });

  it("add: 새 상품은 배열에 추가한다", () => {
    const newProduct = createProduct({ id: 2, code: "P002", name: "새 넥타이" });
    const result = addProductToCart(
      [baseItem],
      newProduct,
      newProduct.options?.[0],
      1,
      generateItemId,
    );

    expect(result.wasExistingItem).toBe(false);
    expect(result.nextItems).toHaveLength(2);
  });

  it("addReform: 수선 아이템을 추가한다", () => {
    const reformData = {
      tie: { id: "tie-1", measurementType: "length" as const, tieLength: 145 },
      cost: 15000,
    };

    const nextItems = addReformToCart([], reformData, generateItemId);
    expect(nextItems).toHaveLength(1);
    expect(nextItems[0].type).toBe("reform");
  });

  it("remove: 아이템을 제거한다", () => {
    const nextItems = removeCartItem([baseItem], "item-1");
    expect(nextItems).toHaveLength(0);
  });

  it("update: 수량이 1 미만이면 기존 배열 참조를 유지한다", () => {
    const currentItems = [baseItem];
    const nextItems = updateCartItemQuantity(currentItems, "item-1", 0);
    expect(nextItems).toBe(currentItems);
  });

  it("applyCoupon: 쿠폰 적용 정보를 갱신한다", () => {
    const coupon = createAppliedCoupon();
    const nextItems = applyCartItemCoupon([baseItem], "item-1", coupon);
    expect(nextItems[0].appliedCoupon?.id).toBe("uc-1");
    expect(nextItems[0].appliedCouponId).toBe("uc-1");
  });

  it("updateOption: 옵션 변경 시 같은 옵션 아이템이 있으면 수량을 합친다", () => {
    const optionA = createProductOption({ id: "opt-a", name: "옵션A", additionalPrice: 1000 });
    const optionB = createProductOption({ id: "opt-b", name: "옵션B", additionalPrice: 2000 });
    const itemA = createCartItem({ id: "1-opt-a", selectedOption: optionA, quantity: 1 });
    const itemB = createCartItem({ id: "1-opt-b", selectedOption: optionB, quantity: 2 });

    const nextItems = updateProductCartItemOption(
      [itemA, itemB],
      "1-opt-a",
      optionB,
      1,
      generateItemId,
    );

    expect(nextItems).toHaveLength(1);
    expect(nextItems[0].quantity).toBe(3);
  });
});
