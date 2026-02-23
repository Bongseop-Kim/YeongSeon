import type { CartItem } from "@/features/cart/types/view/cart";

export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
}
