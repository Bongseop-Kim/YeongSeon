import type { OrderItem } from "../types/view/order";
import { calculateDiscount } from "./calculate-discount";

export interface OrderTotals {
  originalPrice: number;
  totalDiscount: number;
  shippingCost: number;
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

export const calculateOrderTotals = (
  items: OrderItem[],
  shippingCost = 0
): OrderTotals => {
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
    shippingCost,
    totalPrice: originalPrice - totalDiscount + shippingCost,
  };
};

export const calculateOrderSummary = (
  items: OrderItem[],
  shippingCost = 0
): OrderSummary => ({
  totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
  ...calculateOrderTotals(items, shippingCost),
});
