import type {
  ShippingAddress,
  ShippingAddressInput,
} from "@/entities/shipping/model/shipping-address";
import type { ShippingAddressRecord } from "@/entities/shipping/model/shipping-address-record";

/**
 * DB 레코드 → ShippingAddress (View)
 *
 * View 타입은 optional 필드(`?: string`)이므로 falsy → undefined 변환.
 * DB 레코드(`string | null`)와 View optional 필드의 의미 차이를 반영한다.
 */
export const toShippingAddressView = (
  record: ShippingAddressRecord,
): ShippingAddress => ({
  id: record.id,
  recipientName: record.recipient_name,
  recipientPhone: record.recipient_phone,
  address: record.address,
  detailAddress: record.address_detail ?? undefined,
  postalCode: record.postal_code,
  deliveryRequest: record.delivery_request || undefined,
  deliveryMemo: record.delivery_memo || undefined,
  isDefault: record.is_default,
});

/**
 * ShippingAddressInput → upsert_shipping_address RPC 파라미터
 */
export const toUpsertShippingAddressParams = (
  id: string | null,
  data: ShippingAddressInput,
) => ({
  p_id: id ?? undefined,
  p_recipient_name: data.recipientName,
  p_recipient_phone: data.recipientPhone,
  p_address: data.address,
  p_address_detail: data.detailAddress ?? null,
  p_postal_code: data.postalCode,
  p_delivery_request: data.deliveryRequest ?? null,
  p_delivery_memo: data.deliveryMemo ?? null,
  p_is_default: data.isDefault,
});
