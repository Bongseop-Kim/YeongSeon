import type { CartItem } from "@/features/cart/types/view/cart";

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
