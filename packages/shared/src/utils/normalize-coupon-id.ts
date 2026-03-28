export const normalizeCouponId = (couponId?: string): string | undefined => {
  if (typeof couponId !== "string") {
    return undefined;
  }

  const trimmedCouponId = couponId.trim();
  return trimmedCouponId.length > 0 ? trimmedCouponId : undefined;
};
