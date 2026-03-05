import type { UserCouponStatus } from "@yeongseon/shared/types/view/coupon";

export interface CouponRecord {
  id: string;
  name: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount: number | null;
  description: string | null;
  expiry_date: string;
  additional_info: string | null;
}

export interface UserCouponRecord {
  id: string;
  user_id: string;
  coupon_id: string;
  status: UserCouponStatus;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  coupon: CouponRecord | null;
}
