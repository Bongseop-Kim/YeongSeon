import type { UserCoupon } from "@yeongseon/shared/types/view/coupon";
import type { UserCouponRecord } from "@/features/order/types/coupon-record";
import { mapRecordToCoupon } from "./map-record-to-coupon";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

/**
 * Supabase joined 쿼리 응답 → UserCouponRecord[] 런타임 검증
 */
export const parseUserCouponRecords = (
  data: unknown
): UserCouponRecord[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("쿠폰 조회 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  for (let i = 0; i < data.length; i++) {
    const row: unknown = data[i];
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.coupon_id !== "string"
    ) {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: 필수 필드(id, coupon_id) 누락.`
      );
    }
  }
  return data as UserCouponRecord[];
};

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
