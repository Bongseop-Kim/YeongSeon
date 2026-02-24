import type { OrderItem } from "./view/order";

// 클레임 상태
export type ClaimStatus = "접수" | "처리중" | "완료" | "거부";

// 클레임 타입
export type ClaimType = "cancel" | "return" | "exchange";

// 클레임 아이템
export interface ClaimItem {
  id: string;
  claimNumber: string; // 클레임 번호
  date: string; // 클레임 신청일
  status: ClaimStatus;
  type: ClaimType;
  orderId: string; // 원본 주문 ID
  orderNumber: string; // 원본 주문 번호
  item: OrderItem; // 클레임 대상 상품
  reason: string; // 클레임 사유
}

// 클레임 그룹 (같은 주문의 클레임들을 묶음)
export interface ClaimGroup {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  claims: ClaimItem[];
}
