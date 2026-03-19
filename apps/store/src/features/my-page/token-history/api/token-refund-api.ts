import { supabase } from "@/lib/supabase";

export type NotRefundableReason =
  | "tokens_used"
  | "pending_refund"
  | "approved_refund"
  | "active_refund"
  | "no_paid_tokens";

export interface RefundableTokenOrder {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  paidTokensGranted: number;
  bonusTokensGranted: number;
  isRefundable: boolean;
  notRefundableReason: NotRefundableReason | null;
  pendingRequestId: string | null;
}

interface RefundableOrderDTO {
  order_id: string;
  order_number: string;
  created_at: string;
  total_price: number;
  paid_tokens_granted: number;
  bonus_tokens_granted: number;
  is_refundable: boolean;
  not_refundable_reason: NotRefundableReason | null;
  pending_request_id: string | null;
}

export async function getRefundableTokenOrders(): Promise<
  RefundableTokenOrder[]
> {
  const { data, error } = await supabase.rpc("get_refundable_token_orders");

  if (error) {
    throw new Error(`환불 주문 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as RefundableOrderDTO[];
  return rows.map((r) => ({
    orderId: r.order_id,
    orderNumber: r.order_number,
    createdAt: r.created_at,
    totalPrice: r.total_price,
    paidTokensGranted: r.paid_tokens_granted,
    bonusTokensGranted: r.bonus_tokens_granted,
    isRefundable: r.is_refundable,
    notRefundableReason: r.not_refundable_reason,
    pendingRequestId: r.pending_request_id,
  }));
}

export async function requestTokenRefund(orderId: string): Promise<void> {
  const { error } = await supabase.rpc("request_token_refund", {
    p_order_id: orderId,
    p_reason: null,
  });

  if (error) {
    throw new Error(`환불 신청 실패: ${error.message}`);
  }
}

export async function cancelTokenRefund(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_token_refund", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`환불 취소 실패: ${error.message}`);
  }
}
