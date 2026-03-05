export interface ShippingAddress {
  id: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  detailAddress?: string;
  postalCode: string;
  deliveryRequest?: string;
  deliveryMemo?: string;
  isDefault: boolean;
}

// 생성/수정 공용 Input 타입 (RPC 전송용)
export interface ShippingAddressInput {
  recipientName: string;
  recipientPhone: string;
  address: string;
  detailAddress?: string;
  postalCode: string;
  deliveryRequest?: string;
  deliveryMemo?: string;
  isDefault: boolean;
}
