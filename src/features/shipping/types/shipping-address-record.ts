/**
 * 배송지 레코드 타입 (Supabase 테이블 구조)
 */
export interface ShippingAddressRecord {
  id: string;
  created_at: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  address_detail: string;
  postal_code: string;
  delivery_request: string | null;
  delivery_memo: string | null;
  is_default: boolean;
  user_id: string;
}

/**
 * 배송지 생성 데이터 타입
 */
export interface CreateShippingAddressData {
  recipientName: string;
  recipientPhone: string;
  address: string;
  detailAddress: string;
  postalCode: string;
  deliveryRequest?: string;
  deliveryMemo?: string;
  isDefault: boolean;
}

/**
 * 배송지 업데이트 데이터 타입
 */
export interface UpdateShippingAddressData {
  recipientName?: string;
  recipientPhone?: string;
  address?: string;
  detailAddress?: string;
  postalCode?: string;
  deliveryRequest?: string | null;
  deliveryMemo?: string | null;
  isDefault?: boolean;
}
