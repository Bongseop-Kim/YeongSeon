import type { Product, ProductOption } from "@/features/shop/types/product";
import type { AppliedCoupon } from "@/features/order/types/coupon";
import type { TieItem } from "@/features/reform/types/reform";

// 주문 상태
export type OrderStatus = "진행중" | "완료" | "배송중" | "대기중";

// 일반 상품 주문 아이템
export interface ProductOrderItem {
  id: string;
  type: "product";
  product: Product;
  selectedOption?: ProductOption;
  quantity: number;
  appliedCoupon?: AppliedCoupon;
}

// 수선 주문 아이템
export interface ReformOrderItem {
  id: string;
  type: "reform";
  quantity: number;
  reformData: {
    tie: TieItem;
    cost: number;
  };
  appliedCoupon?: AppliedCoupon;
}

// 주문 아이템 (일반 상품 또는 수선)
export type OrderItem = ProductOrderItem | ReformOrderItem;

// 주문 (한 주문에 여러 상품이 포함됨)
export interface Order {
  id: string;
  orderNumber: string; // 주문 번호
  date: string; // 주문 날짜
  status: OrderStatus;
  items: OrderItem[]; // 주문에 포함된 상품들
  totalPrice: number; // 총 주문 금액
}
