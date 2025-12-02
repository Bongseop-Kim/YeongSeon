import type { CartItem } from "@/types/cart";

// 주문 상태
export type OrderStatus = "진행중" | "완료" | "배송중" | "대기중";

// 주문에 포함된 상품 아이템 (CartItem을 재사용)
export type OrderItem = CartItem;

// 주문 (한 주문에 여러 상품이 포함됨)
export interface Order {
  id: string;
  orderNumber: string; // 주문 번호
  date: string; // 주문 날짜
  status: OrderStatus;
  items: OrderItem[]; // 주문에 포함된 상품들
  totalPrice: number; // 총 주문 금액
}
