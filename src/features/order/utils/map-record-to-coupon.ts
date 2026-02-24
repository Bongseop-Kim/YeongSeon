import type { Coupon } from "@/features/order/types/coupon";
import type { CouponRecord } from "@/features/order/types/coupon-record";

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
