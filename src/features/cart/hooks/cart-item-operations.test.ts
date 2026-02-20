import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CartItem } from "@/features/cart/types/view/cart";
import {
  addProductToCart,
  applyCartItemCoupon,
  removeCartItem,
  updateCartItemQuantity,
} from "@/features/cart/hooks/cart-item-operations";

const product = {
  id: 1,
  code: "P001",
  name: "테스트 넥타이",
  price: 10000,
  image: "image.jpg",
  category: "3fold" as const,
  color: "black" as const,
  pattern: "solid" as const,
  material: "silk" as const,
  likes: 0,
  info: "테스트 상품",
  options: [{ id: "opt-1", name: "기본", additionalPrice: 0 }],
};

const baseItem: CartItem = {
  id: "item-1",
  type: "product",
  product,
  selectedOption: product.options?.[0],
  quantity: 1,
};

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

    assert.equal(result.wasExistingItem, true);
    assert.equal(result.nextItems.length, 1);
    assert.equal(result.nextItems[0].quantity, 3);
  });

  it("remove: 아이템을 제거한다", () => {
    const nextItems = removeCartItem([baseItem], "item-1");
    assert.equal(nextItems.length, 0);
  });

  it("update: 수량이 1 미만이면 기존 배열 참조를 유지한다", () => {
    const currentItems = [baseItem];
    const nextItems = updateCartItemQuantity(currentItems, "item-1", 0);
    assert.equal(nextItems, currentItems);
  });

  it("applyCoupon: 쿠폰 적용 정보를 갱신한다", () => {
    const coupon = {
      id: "uc-1",
      userId: "u-1",
      couponId: "c-1",
      status: "active" as const,
      issuedAt: "2026-01-01",
      coupon: {
        id: "c-1",
        name: "500원 할인",
        discountType: "fixed" as const,
        discountValue: 500,
        expiryDate: "2027-01-01",
      },
    };

    const nextItems = applyCartItemCoupon([baseItem], "item-1", coupon);
    assert.equal(nextItems[0].appliedCoupon?.id, "uc-1");
    assert.equal(nextItems[0].appliedCouponId, "uc-1");
  });
});
