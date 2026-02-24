import type { OrderItem } from "@yeongseon/shared/types/view/order";
import { calculateDiscount } from "./calculate-discount";

export interface OrderTotals {
  originalPrice: number;
  totalDiscount: number;
  totalPrice: number;
}

export interface OrderSummary extends OrderTotals {
  totalQuantity: number;
}

export const getOrderItemPricing = (item: OrderItem) => {
  const unitPrice =
    item.type === "product"
      ? item.product.price + (item.selectedOption?.additionalPrice ?? 0)
      : item.reformData.cost;

  const discount = calculateDiscount(unitPrice, item.appliedCoupon);

  return { unitPrice, discount };
};

export const calculateOrderTotals = (items: OrderItem[]): OrderTotals => {
  let originalPrice = 0;
  let totalDiscount = 0;

  items.forEach((item) => {
    const { unitPrice, discount } = getOrderItemPricing(item);
    const itemOriginalPrice = unitPrice * item.quantity;
    originalPrice += itemOriginalPrice;

    totalDiscount += discount * item.quantity;
  });

  return {
    originalPrice,
    totalDiscount,
    totalPrice: originalPrice - totalDiscount,
  };
};

export const calculateOrderSummary = (items: OrderItem[]): OrderSummary => ({
  totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  ...calculateOrderTotals(items),
});
