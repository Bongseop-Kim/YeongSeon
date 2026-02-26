import type { ShippingAddress } from "@/features/shipping/types/shipping-address";
import type {
  ShippingAddressRecord,
  CreateShippingAddressData,
  UpdateShippingAddressData,
} from "@/features/shipping/types/shipping-address-record";

/**
 * DB 레코드 → ShippingAddress (View)
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
    record.delivery_request = data.deliveryRequest;
  if (data.deliveryMemo !== undefined)
    record.delivery_memo = data.deliveryMemo;
  if (data.isDefault !== undefined) record.is_default = data.isDefault;

  return record;
};
