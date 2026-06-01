import type {
  AdminCoupon,
  AdminCouponFormValues,
  CouponDiscountType,
  CouponUser,
  IssuedCouponRow,
} from "@/features/coupons/types/admin-coupon";

interface CouponMutationDto {
  name: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  description: string | null;
  expiry_date: string;
  additional_info: string | null;
  is_active: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableStringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function nullableNumberValue(value: unknown): number | null {
  if (value == null) return null;
  const parsed = numberValue(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function discountTypeValue(value: unknown): CouponDiscountType {
  return value === "fixed" ? "fixed" : "percentage";
}

export function toAdminCoupon(value: unknown): AdminCoupon {
  const row = isRecord(value) ? value : {};
  return {
    id: stringValue(row.id),
    name: stringValue(row.name),
    discountType: discountTypeValue(row.discount_type),
    discountValue: numberValue(row.discount_value),
    maxDiscountAmount: nullableNumberValue(row.max_discount_amount),
    description: nullableStringValue(row.description),
    expiryDate: stringValue(row.expiry_date),
    additionalInfo: nullableStringValue(row.additional_info),
    isActive: booleanValue(row.is_active),
    createdAt: stringValue(row.created_at),
    updatedAt: stringValue(row.updated_at),
  };
}

export function toCouponMutationDto(
  values: AdminCouponFormValues,
): CouponMutationDto {
  const maxDiscountAmount =
    values.discountType === "percentage" ? values.maxDiscountAmount : null;

  return {
    name: values.name.trim(),
    discount_type: values.discountType,
    discount_value: values.discountValue ?? 0,
    max_discount_amount: maxDiscountAmount,
    description: values.description.trim() || null,
    expiry_date: values.expiryDate,
    additional_info: values.additionalInfo.trim() || null,
    is_active: values.isActive,
  };
}

export function toCouponFormValues(coupon: AdminCoupon): AdminCouponFormValues {
  return {
    name: coupon.name,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maxDiscountAmount: coupon.maxDiscountAmount,
    description: coupon.description ?? "",
    expiryDate: coupon.expiryDate,
    additionalInfo: coupon.additionalInfo ?? "",
    isActive: coupon.isActive,
  };
}

export function toCouponUser(value: unknown): CouponUser {
  const row = isRecord(value) ? value : {};
  return {
    id: stringValue(row.id),
    name: nullableStringValue(row.name),
    phone: nullableStringValue(row.phone),
    birth: nullableStringValue(row.birth),
    createdAt: nullableStringValue(row.created_at),
  };
}

export function toIssuedCouponRow(value: unknown): IssuedCouponRow {
  const row = isRecord(value) ? value : {};
  return {
    id: stringValue(row.id),
    userId: nullableStringValue(row.userId),
    couponId: nullableStringValue(row.couponId),
    userName: nullableStringValue(row.userName),
    userPhone: nullableStringValue(row.userPhone),
    userEmail: nullableStringValue(row.userEmail),
    status: nullableStringValue(row.status),
    issuedAt: nullableStringValue(row.issuedAt),
    expiresAt: nullableStringValue(row.expiresAt),
    usedAt: nullableStringValue(row.usedAt),
  };
}
