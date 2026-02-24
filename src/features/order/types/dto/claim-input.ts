export interface CreateClaimInputDTO {
  p_type: string;
  p_order_id: string;
  p_item_id: string;
  p_reason: string;
  p_description?: string | null;
  p_quantity?: number | null;
}
