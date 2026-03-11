export type TokenRefundStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface AdminTokenRefundRequest {
  id: string;
  userId: string;
  orderId: string;
  orderNumber: string;
  paidTokenAmount: number;
  bonusTokenAmount: number;
  refundAmount: number;
  status: TokenRefundStatus;
  reason: string | null;
  adminMemo: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  paymentKey: string | null;
}
