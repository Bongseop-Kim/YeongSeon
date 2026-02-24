export interface ShippingAddress {
  id: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  detailAddress: string;
  postalCode: string;
  deliveryRequest?: string;
  deliveryMemo?: string;
  isDefault: boolean;
}
