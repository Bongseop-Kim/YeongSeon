import type { CartItem } from "@/features/cart/types/cart";

export interface CreateOrderRequest {
  items: CartItem[];
  shippingAddressId: string;
  totals: {
    originalPrice: number;
    totalDiscount: number;
    totalPrice: number;
  };
}

export interface CreateOrderResponse {
  orderId: string;
  orderNumber: string;
}
