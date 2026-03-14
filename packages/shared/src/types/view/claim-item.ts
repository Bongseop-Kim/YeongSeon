import type { OrderItem } from "./order";

export type ClaimStatus =
  | "접수"
  | "처리중"
  | "수거요청"
  | "수거완료"
  | "재발송"
  | "완료"
  | "거부";

export type ClaimType = "cancel" | "return" | "exchange" | "token_refund";

export interface TokenRefundData {
  paidTokenAmount: number;
  bonusTokenAmount: number;
  refundAmount: number;
}

export interface ClaimItem {
  id: string;
  claimNumber: string;
  date: string;
  status: ClaimStatus;
  type: ClaimType;
  orderId: string;
  orderNumber: string;
  item: OrderItem;
  reason: string;
  refundData: TokenRefundData | null;
}

export interface ClaimGroup {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  claims: ClaimItem[];
}
