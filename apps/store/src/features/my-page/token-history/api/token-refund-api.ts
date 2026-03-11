import { supabase } from "@/lib/supabase";

export type TokenRefundStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface RefundableTokenOrder {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  totalPrice: number;
  paidTokensGranted: number;
  bonusTokensGranted: number;
  isRefundable: boolean;
}

export interface TokenRefundRequest {
  requestId: string;
  refundAmount: number;
  paidTokenAmount: number;
  bonusTokenAmount: number;
}

interface RefundableOrderDTO {
  order_id: string;
  order_number: string;
  created_at: string;
  total_price: number;
  paid_tokens_granted: number;
  bonus_tokens_granted: number;
  is_refundable: boolean;
}

interface RequestRefundDTO {
  request_id: string;
  refund_amount: number;
  paid_token_amount: number;
  bonus_token_amount: number;
}

export async function getRefundableTokenOrders(): Promise<RefundableTokenOrder[]> {
  const { data, error } = await supabase.rpc("get_refundable_token_orders");

  if (error) {
    throw new Error(`환불 가능 주문 조회 실패: ${error.message}`);
  }

  const rows = (data ?? []) as RefundableOrderDTO[];
  return rows.map((r) => ({
    orderId:            r.order_id,
    orderNumber:        r.order_number,
    createdAt:          r.created_at,
    totalPrice:         r.total_price,
    paidTokensGranted:  r.paid_tokens_granted,
    bonusTokensGranted: r.bonus_tokens_granted,
    isRefundable:       r.is_refundable,
  }));
}

export async function requestTokenRefund(
  orderId: string,
  reason?: string
): Promise<TokenRefundRequest> {
  const { data, error } = await supabase.rpc("request_token_refund", {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });

  if (error) {
    throw new Error(`환불 신청 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("환불 신청 결과를 받을 수 없습니다.");
  }

  const dto = data as RequestRefundDTO;
  return {
    requestId:        dto.request_id,
    refundAmount:     dto.refund_amount,
    paidTokenAmount:  dto.paid_token_amount,
    bonusTokenAmount: dto.bonus_token_amount,
  };
}

export async function cancelTokenRefund(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_token_refund", {
    p_request_id: requestId,
  });

  if (error) {
    throw new Error(`환불 취소 실패: ${error.message}`);
  }
}
