import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@yeongseon/shared/types/dto/order-input";
import type {
  OrderItemRowDTO,
  OrderItemDTO,
  OrderViewDTO,
} from "@yeongseon/shared/types/dto/order-view";
import type { Order } from "@yeongseon/shared/types/view/order";
import {
  toAppliedCouponView,
  toProductOptionView,
  toProductView,
  toTieItemView,
} from "@/features/shared/api/shared-mapper";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number]
): CreateOrderInputDTO["items"][number] => {
  const baseRecord = {
    item_id: item.id,
    quantity: item.quantity,
    applied_user_coupon_id: item.appliedCoupon?.id ?? item.appliedCouponId ?? null,
  };

  if (item.type === "product") {
    return {
      ...baseRecord,
      item_type: "product",
      product_id: item.product.id,
      selected_option_id: item.selectedOption?.id || null,
      reform_data: null,
    };
  }

  return {
    ...baseRecord,
    item_type: "reform",
    product_id: null,
    selected_option_id: null,
    reform_data:
      item.reformData &&
      item.reformData.tie &&
      typeof item.reformData.tie === "object"
        ? {
            tie: {
              ...item.reformData.tie,
              image:
                typeof item.reformData.tie.image === "string"
                  ? item.reformData.tie.image
                  : undefined,
            },
            cost: item.reformData.cost,
          }
        : null,
  };
};

const toOrderItem = (item: OrderItemDTO): Order["items"][number] => {
  if (item.type === "product") {
    if (!item.product) {
      throw new Error("Product data is required for product order items.");
    }
    return {
      ...item,
      product: toProductView(item.product),
      selectedOption: item.selectedOption
        ? toProductOptionView(item.selectedOption)
        : undefined,
      appliedCoupon: toAppliedCouponView(item.appliedCoupon),
    };
  }

  if (!item.reformData) {
    throw new Error("Reform data is required for reform order items.");
  }

  return {
    ...item,
    reformData: {
      ...item.reformData,
      tie: toTieItemView(item.reformData.tie),
    },
    appliedCoupon: toAppliedCouponView(item.appliedCoupon),
  };
};

export const toOrderView = (order: OrderViewDTO): Order => ({
  ...order,
  items: order.items.map(toOrderItem),
});

export const fromOrderItemRowDTO = (item: OrderItemRowDTO): OrderItemDTO => {
  if (item.type === "product") {
    const product = item.product ?? {
      id: -1,
      code: "DELETED",
      name: "삭제된 상품",
      price: 0,
      image: "",
      deleted: true,
      category: "3fold",
      color: "black",
      pattern: "solid",
      material: "silk",
      likes: 0,
      info: "",
      options: [],
    };
    return {
      id: item.id,
      type: "product",
      product,
      selectedOption: item.selectedOption ?? undefined,
      quantity: item.quantity,
      appliedCoupon: item.appliedCoupon ?? undefined,
    };
  }

  if (!item.reformData) {
    throw new Error("주문 수선 데이터가 올바르지 않습니다.");
  }

  return {
    id: item.id,
    type: "reform",
    quantity: item.quantity,
    reformData: item.reformData,
    appliedCoupon: item.appliedCoupon ?? undefined,
  };
};
