import type {
  Coupon,
  UserCoupon,
  UserCouponStatus,
} from "@yeongseon/shared/types/view/coupon";
import type {
  UserCouponRecord,
  CouponRecord,
} from "@/entities/coupon/model/coupon-record";
import { isRecord } from "@/shared/lib/type-guard";

// ── parse helpers (런타임 검증) ──────────────────────

const DISCOUNT_TYPES: ReadonlySet<string> = new Set(["percentage", "fixed"]);
const isDiscountType = (v: string): v is CouponRecord["discount_type"] =>
  DISCOUNT_TYPES.has(v);

const USER_COUPON_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "used",
  "expired",
  "revoked",
]);
const isUserCouponStatus = (v: string): v is UserCouponStatus =>
  USER_COUPON_STATUSES.has(v);

const parseCouponRecord = (v: unknown, i: number): CouponRecord | null => {
  if (v == null) return null;
  if (!isRecord(v)) {
    throw new Error(
      `쿠폰 조회 행(${i})의 coupon이 올바르지 않습니다: 객체가 아닙니다.`,
    );
  }
  if (
    typeof v.id !== "string" ||
    typeof v.name !== "string" ||
    typeof v.discount_type !== "string" ||
    typeof v.discount_value !== "number" ||
    typeof v.expiry_date !== "string"
  ) {
    throw new Error(
      `쿠폰 조회 행(${i})의 coupon이 올바르지 않습니다: 필수 필드(id, name, discount_type, discount_value, expiry_date) 누락.`,
    );
  }
  if (!isDiscountType(v.discount_type)) {
    throw new Error(
      `쿠폰 조회 행(${i})의 coupon이 올바르지 않습니다: discount_type 값(${v.discount_type})이 허용된 유형("percentage" | "fixed")이 아닙니다.`,
    );
  }
  return {
    id: v.id,
    name: v.name,
    discount_type: v.discount_type,
    discount_value: v.discount_value,
    max_discount_amount:
      typeof v.max_discount_amount === "number" ? v.max_discount_amount : null,
    description: typeof v.description === "string" ? v.description : null,
    expiry_date: v.expiry_date,
    additional_info:
      typeof v.additional_info === "string" ? v.additional_info : null,
  };
};

/**
 * Supabase joined 쿼리 응답 → UserCouponRecord[] 런타임 검증
 */
export const parseUserCouponRecords = (data: unknown): UserCouponRecord[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("쿠폰 조회 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  return data.map((row: unknown, i: number): UserCouponRecord => {
    if (!isRecord(row)) {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`,
      );
    }
    if (
      typeof row.id !== "string" ||
      typeof row.user_id !== "string" ||
      typeof row.coupon_id !== "string" ||
      typeof row.status !== "string" ||
      typeof row.issued_at !== "string"
    ) {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: 필수 필드(id, user_id, coupon_id, status, issued_at) 누락.`,
      );
    }
    if (!isUserCouponStatus(row.status)) {
      throw new Error(
        `쿠폰 조회 행(${i})이 올바르지 않습니다: status 값(${row.status})이 허용된 상태가 아닙니다.`,
      );
    }
    return {
      id: row.id,
      user_id: row.user_id,
      coupon_id: row.coupon_id,
      status: row.status,
      issued_at: row.issued_at,
      expires_at: typeof row.expires_at === "string" ? row.expires_at : null,
      used_at: typeof row.used_at === "string" ? row.used_at : null,
      coupon: parseCouponRecord(row.coupon, i),
    };
  });
};

// ── record → view 변환 ──────────────────────────────

export const mapRecordToCoupon = (record: CouponRecord): Coupon => ({
  id: record.id,
  name: record.name,
  discountType: record.discount_type,
  discountValue: Number(record.discount_value),
  maxDiscountAmount:
    record.max_discount_amount != null
      ? Number(record.max_discount_amount)
      : null,
  description: record.description,
  expiryDate: record.expiry_date,
  additionalInfo: record.additional_info,
});

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
