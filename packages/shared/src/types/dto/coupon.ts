export interface CouponDTO {
  id: string;
  name: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxDiscountAmount?: number | null;
  description?: string | null;
  expiryDate: string;
  additionalInfo?: string | null;
}

export type UserCouponStatusDTO = "active" | "used" | "expired" | "revoked";

export interface UserCouponDTO {
  id: string;
  userId: string;
  couponId: string;
  status: UserCouponStatusDTO;
  issuedAt: string;
  expiresAt?: string | null;
  usedAt?: string | null;
  coupon: CouponDTO;
}

export type AppliedCouponDTO = UserCouponDTO;
