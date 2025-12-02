import type { OrderItem } from "@/features/order/types/order-item";

// 장바구니 아이템은 주문 아이템과 동일한 구조
export type CartItem = OrderItem;

// 이전 타입 호환성을 위한 별칭
export type ProductCartItem = Extract<CartItem, { type: "product" }>;
export type ReformCartItem = Extract<CartItem, { type: "reform" }>;

export interface CartSummary {
  totalItems: number;
  totalPrice: number;
  items: CartItem[];
}
