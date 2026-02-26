import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type {
  ShippingAddressRecord,
  CreateShippingAddressData,
  UpdateShippingAddressData,
} from "@/features/shipping/types/shipping-address-record";

/**
 * DB 레코드 → ShippingAddress (View)
 *
 * View 타입은 optional 필드(`?: string`)이므로 falsy → undefined 변환.
 * DB 레코드(`string | null`)와 View optional 필드의 의미 차이를 반영한다.
 */
export const toShippingAddressView = (
  record: ShippingAddressRecord
): ShippingAddress => ({
  id: record.id,
  recipientName: record.recipient_name,
  recipientPhone: record.recipient_phone,
  address: record.address,
  detailAddress: record.address_detail,
  postalCode: record.postal_code,
  deliveryRequest: record.delivery_request || undefined,
  deliveryMemo: record.delivery_memo || undefined,
  isDefault: record.is_default,
});

/**
 * CreateShippingAddressData (View) → insert record
 *
 * DB 레코드는 `string | null` 컬럼이므로 falsy → null 변환.
 */
export const toCreateShippingAddressRecord = (
  userId: string,
  data: CreateShippingAddressData
): Omit<ShippingAddressRecord, "id" | "created_at"> => ({
  user_id: userId,
  recipient_name: data.recipientName,
  recipient_phone: data.recipientPhone,
  address: data.address,
  address_detail: data.detailAddress,
  postal_code: data.postalCode,
  delivery_request: data.deliveryRequest || null,
  delivery_memo: data.deliveryMemo || null,
  is_default: data.isDefault,
});

/**
 * UpdateShippingAddressData (View) → partial update record
 */
export const toUpdateShippingAddressRecord = (
  data: UpdateShippingAddressData
): Partial<ShippingAddressRecord> => {
  const record: Partial<ShippingAddressRecord> = {};

  if (data.recipientName !== undefined)
    record.recipient_name = data.recipientName;
  if (data.recipientPhone !== undefined)
    record.recipient_phone = data.recipientPhone;
  if (data.address !== undefined) record.address = data.address;
  if (data.detailAddress !== undefined)
    record.address_detail = data.detailAddress;
  if (data.postalCode !== undefined) record.postal_code = data.postalCode;
  if (data.deliveryRequest !== undefined)
    record.delivery_request = data.deliveryRequest || null;
  if (data.deliveryMemo !== undefined)
    record.delivery_memo = data.deliveryMemo || null;
  if (data.isDefault !== undefined) record.is_default = data.isDefault;

  return record;
};
