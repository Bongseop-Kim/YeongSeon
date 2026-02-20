import type { UserCoupon } from "@/features/order/types/coupon";
import type { UserCouponRecord } from "@/features/order/types/coupon-record";
import { mapRecordToCoupon } from "./map-record-to-coupon";

export const mapRecordToUserCoupon = (record: UserCouponRecord): UserCoupon => {
  if (!record.coupon) {
    throw new Error("쿠폰 정책 정보를 찾을 수 없습니다.");
  }

  return {
    id: record.id,
    userId: record.user_id,
    couponId: record.coupon_id,
    status: record.status,
    issuedAt: record.issued_at,
    expiresAt: record.expires_at,
    usedAt: record.used_at,
    coupon: mapRecordToCoupon(record.coupon),
  };
};
