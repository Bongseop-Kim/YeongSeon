export interface CouponCreateInput {
  name: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_discount_amount?: number | null;
  description?: string | null;
  expiry_date: string;
  additional_info?: string | null;
  is_active: boolean;
}

export interface IssueCouponInput {
  user_id: string;
  coupon_id: string;
  expires_at?: string | null;
}
