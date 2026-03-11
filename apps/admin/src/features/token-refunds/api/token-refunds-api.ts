import { supabase } from "@/lib/supabase";
import type { AdminTokenRefundRequest, TokenRefundStatus } from "../types/admin-token-refund";

interface TokenRefundRequestDTO {
  id: string;
  user_id: string;
  order_id: string;
  order_number: string;
  paid_token_amount: number;
  bonus_token_amount: number;
  refund_amount: number;
  status: TokenRefundStatus;
  reason: string | null;
  admin_memo: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  payment_key: string | null;
}

function toAdminTokenRefundRequest(dto: TokenRefundRequestDTO): AdminTokenRefundRequest {
  return {
    id:               dto.id,
    userId:           dto.user_id,
    orderId:          dto.order_id,
    orderNumber:      dto.order_number,
    paidTokenAmount:  dto.paid_token_amount,
    bonusTokenAmount: dto.bonus_token_amount,
    refundAmount:     dto.refund_amount,
    status:           dto.status,
    reason:           dto.reason,
    adminMemo:        dto.admin_memo,
    processedBy:      dto.processed_by,
    processedAt:      dto.processed_at,
    createdAt:        dto.created_at,
    paymentKey:       dto.payment_key,
  };
}

export async function getTokenRefundRequests(
  status?: TokenRefundStatus
): Promise<AdminTokenRefundRequest[]> {
  const { data, error } = await supabase.rpc("get_token_refund_requests_admin", {
    p_status: status ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as TokenRefundRequestDTO[];
  return rows.map(toAdminTokenRefundRequest);
}

export async function approveTokenRefund(refundRequestId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const functionUrl = `${supabaseUrl}/functions/v1/cancel-token-payment`;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ refundRequestId }),
  });

  const result = await response.json() as { error?: string; details?: string };

  if (!response.ok) {
    throw new Error(result.error ?? `환불 처리 실패 (${response.status})`);
  }
}

export async function rejectTokenRefund(
  requestId: string,
  adminMemo?: string
): Promise<void> {
  const { error } = await supabase.rpc("reject_token_refund_admin", {
    p_request_id: requestId,
    p_admin_memo: adminMemo ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
