import type { OrderItem } from "@/features/order/types/view/order";
import { calculateDiscount } from "./calculate-discount";

export const getOrderItemPricing = (item: OrderItem) => {
  const unitPrice =
    item.type === "product"
      ? item.product.price + (item.selectedOption?.additionalPrice ?? 0)
      : item.reformData.cost;

  const discount = calculateDiscount(unitPrice, item.appliedCoupon);

  return { unitPrice, discount };
};

export const calculateOrderTotals = (items: OrderItem[]) => {
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
