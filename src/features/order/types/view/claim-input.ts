import type { ClaimType } from "@/features/order/types/claim-item";

export interface CreateClaimRequest {
  type: ClaimType;
  orderId: string;
  itemId: string; // order_items.item_id (text, 프론트 ID)
  reason: string;
  description?: string;
  quantity?: number;
}

export interface CreateClaimResponse {
  claimId: string;
  claimNumber: string;
}
