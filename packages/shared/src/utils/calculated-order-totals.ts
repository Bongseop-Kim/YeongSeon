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
  let unitPrice: number;
  if (item.type === "product") {
    unitPrice = item.product.price + (item.selectedOption?.additionalPrice ?? 0);
  } else if (item.type === "custom") {
    unitPrice = item.quantity > 0 ? item.customData.pricing.totalCost / item.quantity : 0;
  } else if (item.type === "reform") {
    unitPrice = item.reformData.cost;
  } else if (item.type === "token") {
    unitPrice = 0;
  } else {
    throw new Error(`getOrderItemPricing: 알 수 없는 item.type: ${(item as OrderItem).type}`);
  }

  const discount = calculateDiscount(unitPrice, item.appliedCoupon, item.quantity);

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

    totalDiscount += discount;
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
