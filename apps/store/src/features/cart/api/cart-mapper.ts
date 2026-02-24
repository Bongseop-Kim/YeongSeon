import type { CartItem } from "@yeongseon/shared/types/view/cart";
import type { CartItemViewDTO } from "@yeongseon/shared/types/dto/cart-view";
import type { CartItemInputDTO } from "@yeongseon/shared/types/dto/cart-input";
import {
  toAppliedCouponDTO,
  toAppliedCouponView,
  toProductDTO,
  toProductView,
  toProductOptionDTO,
  toProductOptionView,
  toTieItemDTO,
  toTieItemView,
} from "@/features/shared/api/shared-mapper";

export const toCartItemView = (record: CartItemViewDTO): CartItem => {
  if (record.type === "product") {
    if (!record.product) {
      throw new Error("Product data is required for product cart items.");
    }
    return {
      id: record.id,
      type: "product",
      product: toProductView(record.product),
      selectedOption: record.selectedOption
        ? toProductOptionView(record.selectedOption)
        : undefined,
      quantity: record.quantity,
      appliedCoupon: toAppliedCouponView(record.appliedCoupon),
      appliedCouponId: record.appliedCouponId ?? null,
    };
  }

  if (!record.reformData) {
    throw new Error("Reform data is required for reform cart items.");
  }

  return {
    id: record.id,
    type: "reform",
    quantity: record.quantity,
    reformData: {
      tie: toTieItemView(record.reformData.tie),
      cost: record.reformData.cost,
    },
    appliedCoupon: toAppliedCouponView(record.appliedCoupon),
    appliedCouponId: record.appliedCouponId ?? null,
  };
};

export const toCartItemInputDTO = (item: CartItem): CartItemInputDTO => {
  if (item.type === "product") {
    return {
      id: item.id,
      type: "product",
      product: toProductDTO(item.product),
      selectedOption: item.selectedOption
        ? toProductOptionDTO(item.selectedOption)
        : null,
      quantity: item.quantity,
      reformData: null,
      appliedCoupon: toAppliedCouponDTO(item.appliedCoupon),
      appliedCouponId: item.appliedCouponId ?? null,
    };
  }

  return {
    id: item.id,
    type: "reform",
    product: null,
    selectedOption: null,
    quantity: item.quantity,
    reformData: {
      tie: toTieItemDTO(item.reformData.tie),
      cost: item.reformData.cost,
    },
    appliedCoupon: toAppliedCouponDTO(item.appliedCoupon),
    appliedCouponId: item.appliedCouponId ?? null,
  };
};
