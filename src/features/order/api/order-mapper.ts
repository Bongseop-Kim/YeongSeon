import type { CreateOrderRequest } from "@/features/order/types/view/order-input";
import type { CreateOrderInputDTO } from "@/features/order/types/dto/order-input";
import type {
  OrderItemDTO,
  OrderViewDTO,
} from "@/features/order/types/dto/order-view";
import type { Order } from "@/features/order/types/view/order";
import { getOrderItemPricing } from "@/features/order/utils/calculated-order-totals";
import {
  toAppliedCouponView,
  toProductOptionView,
  toProductView,
  toTieItemView,
} from "@/features/shared/api/shared-mapper";

export const toOrderItemInputDTO = (
  item: CreateOrderRequest["items"][number]
): CreateOrderInputDTO["p_order_items"][number] => {
  const { unitPrice, discount } = getOrderItemPricing(item);

  const baseRecord = {
    item_id: item.id,
    quantity: item.quantity,
    unit_price: unitPrice,
    discount_amount: discount,
    applied_user_coupon_id: item.appliedCoupon?.id || null,
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
    reform_data: {
      tie: {
        ...item.reformData.tie,
        image:
          typeof item.reformData.tie.image === "string"
            ? item.reformData.tie.image
            : undefined,
      },
      cost: item.reformData.cost,
    },
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
