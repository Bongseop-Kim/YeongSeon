import type { OrderItem } from "../types/order-item";
import { calculateDiscount } from "@/features/order/types/coupon";

// OrderItem의 상세 정보 가져오기
export const getOrderItemDetails = (item: OrderItem): string => {
  if (item.type === "product") {
    const parts = [item.product.name];
    if (item.selectedOption) {
      parts.push(item.selectedOption.name);
    }
    return parts.join(" · ");
  } else {
    // reform 타입
    const { tie } = item.reformData;
    const details = [];
    if (tie.measurementType === "length" && tie.tieLength) {
      details.push(`길이 ${tie.tieLength}cm`);
    } else if (tie.measurementType === "height" && tie.wearerHeight) {
      details.push(`신장 ${tie.wearerHeight}cm 기준`);
    }
    return details.join(" · ") || "수선";
  }
};

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
