export interface Coupon {
  id: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number | null;
  description?: string | null;
  expiryDate: string;
  additionalInfo?: string | null;
}

export type UserCouponStatus = "active" | "used" | "expired" | "revoked";

export interface UserCoupon {
  id: string; // user_coupons.id
  userId: string;
  couponId: string;
  status: UserCouponStatus;
  issuedAt: string;
  expiresAt?: string | null;
  usedAt?: string | null;
  coupon: Coupon;
}

export type AppliedCoupon = UserCoupon;
