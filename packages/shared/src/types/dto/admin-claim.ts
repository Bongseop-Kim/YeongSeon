/** admin_claim_status_log_view row */
export interface ClaimStatusLogDTO {
  id: string;
  claimId: string;
  changedBy: string;
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
  type: "cancel" | "return" | "exchange";
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
  itemType: "product" | "reform";
  productName: string | null;
}
