import type { UserCoupon, UserCouponStatus } from "@yeongseon/shared/types/view/coupon";
import type { UserCouponRecord, CouponRecord } from "@/features/order/types/coupon-record";
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
  return data.map((row: unknown, i: number): UserCouponRecord => {
    if (!isRecord(row)) {
      throw new Error(`쿠폰 조회 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`);
    }
    if (
      typeof row.id !== "string" ||
      typeof row.user_id !== "string" ||
      typeof row.coupon_id !== "string" ||
      typeof row.status !== "string" ||
      typeof row.issued_at !== "string"
    ) {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: 필수 필드(id, user_id, coupon_id, status, issued_at) 누락.`
      );
    }
    if (row.coupon != null && typeof row.coupon !== "object") {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: coupon이 올바른 객체가 아닙니다.`
      );
    }
    return {
      id: row.id,
      user_id: row.user_id,
      coupon_id: row.coupon_id,
      status: row.status as UserCouponStatus,
      issued_at: row.issued_at,
      expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
      used_at: typeof row.used_at === "string" ? row.used_at : null,
      coupon: (row.coupon ?? null) as CouponRecord | null,
    };
  });
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
