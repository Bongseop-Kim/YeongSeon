import type { TokenRefundDataDTO } from "./claim-view";

/** admin_claim_status_log_view row */
export interface ClaimStatusLogDTO {
  id: string;
  claimId: string;
  orderId: string;
  claimNumber: string;
  claimType: "cancel" | "return" | "exchange" | "token_refund";
  changedBy: string | null;
  previousStatus: string;
  newStatus: string;
  memo: string | null;
  isRollback: boolean;
  createdAt: string;
}

/** admin_claim_list_view row */
export interface AdminClaimListRowDTO {
  id: string;
  userId: string;
  claimNumber: string;
  date: string;
  status: string;
  type: "cancel" | "return" | "exchange" | "token_refund";
  reason: string;
  description: string | null;
  claimQuantity: number;
  created_at: string;
  updated_at: string;
  returnCourierCompany: string | null;
  returnTrackingNumber: string | null;
  resendCourierCompany: string | null;
  resendTrackingNumber: string | null;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderCourierCompany: string | null;
  orderTrackingNumber: string | null;
  orderShippedAt: string | null;
  customerName: string;
  customerPhone: string | null;
  itemType: "product" | "reform" | "token";
  productName: string | null;
  refund_data: TokenRefundDataDTO | null;
}
