import type { AppliedCoupon } from "../types/view/coupon";

const isExpired = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const now = new Date();
  const expireDate = new Date(expiresAt);
  return expireDate.getTime() < now.getTime();
};

// 쿠폰 할인 금액 계산 (발급 쿠폰 상태/만료 검증 포함)
export const calculateDiscount = (
  price: number,
  appliedCoupon: AppliedCoupon | undefined
): number => {
  if (
    !appliedCoupon ||
    appliedCoupon.status !== "active" ||
    isExpired(appliedCoupon.expiresAt)
  ) {
    return 0;
  }

  const coupon = appliedCoupon.coupon;
  if (!coupon) return 0;

  if (coupon.discountType === "percentage") {
    const discountAmount = Math.floor(price * (coupon.discountValue / 100));
    const cappedAmount =
      coupon.maxDiscountAmount != null
        ? Math.min(discountAmount, coupon.maxDiscountAmount)
        : discountAmount;
    return Math.min(cappedAmount, price);
  } else {
    const cappedAmount =
      coupon.maxDiscountAmount != null
        ? Math.min(coupon.discountValue, coupon.maxDiscountAmount)
        : coupon.discountValue;
    return Math.min(cappedAmount, price);
  }
};
