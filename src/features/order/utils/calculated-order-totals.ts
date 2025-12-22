import type { OrderItem } from "../types/order-item";
import { calculateDiscount } from "./calculate-discount";

export const calculateOrderTotals = (items: OrderItem[]) => {
  let originalPrice = 0;
  let totalDiscount = 0;

  items.forEach((item) => {
    const unitPrice =
      item.type === "product"
        ? item.product!.price + (item.selectedOption?.additionalPrice ?? 0)
        : item.reformData!.cost;

    const itemOriginalPrice = unitPrice * item.quantity;
    originalPrice += itemOriginalPrice;

    const discount = calculateDiscount(unitPrice, item.appliedCoupon);
    totalDiscount += discount * item.quantity;
  });

  return {
    originalPrice,
    totalDiscount,
    totalPrice: originalPrice - totalDiscount,
  };
};
