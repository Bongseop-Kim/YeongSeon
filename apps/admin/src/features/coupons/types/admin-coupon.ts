export type CouponDiscountType = "percentage" | "fixed";

export interface AdminCoupon {
  id: string;
  name: string;
  displayName: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  description: string | null;
  expiryDate: string;
  additionalInfo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCouponFormValues {
  name: string;
  displayName: string;
  discountType: CouponDiscountType;
  discountValue: number | null;
  maxDiscountAmount: number | null;
  description: string;
  expiryDate: string;
  additionalInfo: string;
  isActive: boolean;
}

export interface AdminCouponListResult {
  rows: AdminCoupon[];
  total: number;
}

export function createDefaultCouponFormValues(): AdminCouponFormValues {
  return {
    name: "",
    displayName: "",
    discountType: "percentage",
    discountValue: null,
    maxDiscountAmount: null,
    description: "",
    expiryDate: "",
    additionalInfo: "",
    isActive: true,
  };
}

export interface CouponUser {
  id: string;
  name: string | null;
  phone: string | null;
  birth: string | null;
  createdAt: string | null;
}

export interface IssuedCouponRow {
  id: string;
  userId: string | null;
  couponId: string | null;
  userName: string | null;
  userPhone: string | null;
  userEmail: string | null;
  status: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  usedAt: string | null;
}

export const COUPON_PRESET_KEYS = [
  "all",
  "new30",
  "birthdayThisMonth",
  "purchased",
  "notPurchased",
  "dormant",
] as const;

export type CouponPresetKey = (typeof COUPON_PRESET_KEYS)[number];

export function isCouponPresetKey(value: string): value is CouponPresetKey {
  return COUPON_PRESET_KEYS.some((key) => key === value);
}

export const COUPON_PRESET_LABELS: Record<CouponPresetKey, string> = {
  all: "전체 고객",
  new30: "신규 가입 (30일)",
  birthdayThisMonth: "생일 고객 (이번 달)",
  purchased: "구매 고객",
  notPurchased: "미구매 고객",
  dormant: "휴면 고객",
};
