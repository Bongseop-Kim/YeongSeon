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
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string | null;
  itemType: "product" | "reform";
  productName: string | null;
}
