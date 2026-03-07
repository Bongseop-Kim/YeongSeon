import type { CartItem } from "@yeongseon/shared/types/view/cart";

export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
}

export interface CreateOrderResponse {
  paymentGroupId: string;
  totalAmount: number;
  orders: Array<{ orderId: string; orderNumber: string; orderType: string }>;
}
