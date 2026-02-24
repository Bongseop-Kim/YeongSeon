import type { Coupon } from "@/features/order/types/coupon";

export const formatCouponAmount = (coupon: Coupon): string => {
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}%`;
  }
  return `${coupon.discountValue.toLocaleString()}원`;
};
