import type { CartItem } from "@yeongseon/shared/types/view/cart";

export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
}
