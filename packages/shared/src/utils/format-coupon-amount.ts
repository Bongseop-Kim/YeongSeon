import type { Coupon } from "../types/view/coupon";

export const formatCouponAmount = (coupon: Coupon): string => {
  if (coupon.discountType === "percentage") {
    return `${coupon.discountValue}%`;
  }
  return `${coupon.discountValue.toLocaleString()}원`;
};
