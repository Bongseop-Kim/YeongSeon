import type { CartItem } from "@yeongseon/shared/types/view/cart";

interface CreateOrderDirectShippingRequest {
  method: "direct";
  pickup?: null;
}

interface CreateOrderPickupShippingRequest {
  method: "pickup";
  pickup: {
    recipientName: string;
    recipientPhone: string;
    postalCode: string | null;
    address: string;
    detailAddress: string | null;
  };
}

export type CreateOrderRepairShippingRequest =
  | CreateOrderDirectShippingRequest
  | CreateOrderPickupShippingRequest;

export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
  /** 수선 아이템이 있을 때만 전달. 방문 수거는 결제 전(주문 생성 시)에만 신청 가능. */
  repairShipping?: CreateOrderRepairShippingRequest | null;
}

export interface CreateOrderResponse {
  paymentGroupId: string;
  totalAmount: number;
  orders: Array<{ orderId: string; orderNumber: string; orderType: string }>;
}
