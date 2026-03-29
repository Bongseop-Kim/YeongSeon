/**
 * 배송지 레코드 타입 (Supabase 테이블 구조)
 */
export interface ShippingAddressRecord {
  id: string;
  created_at: string;
  recipient_name: string;
  recipient_phone: string;
  address: string;
  address_detail: string | null;
  postal_code: string;
  delivery_request: string | null;
  delivery_memo: string | null;
  is_default: boolean;
  user_id: string;
}
