import type { Coupon } from "../types/view/coupon";

const SYSTEM_COUPON_LABELS: Record<string, string> = {
  SAMPLE_DISCOUNT_SEWING: "봉제 샘플 할인 쿠폰",
  SAMPLE_DISCOUNT_FABRIC_PRINTING: "원단 샘플 할인 쿠폰 (날염)",
  SAMPLE_DISCOUNT_FABRIC_YARN_DYED: "원단 샘플 할인 쿠폰 (선염)",
  SAMPLE_DISCOUNT_FABRIC_AND_SEWING_PRINTING: "원단+봉제 샘플 할인 쿠폰 (날염)",
  SAMPLE_DISCOUNT_FABRIC_AND_SEWING_YARN_DYED:
    "원단+봉제 샘플 할인 쿠폰 (선염)",
};

export const formatCouponName = (coupon: Pick<Coupon, "name">): string =>
  SYSTEM_COUPON_LABELS[coupon.name] ?? coupon.name;
