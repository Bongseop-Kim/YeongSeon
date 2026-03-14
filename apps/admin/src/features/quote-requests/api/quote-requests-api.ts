import { supabase } from "@/lib/supabase";

export interface UpdateQuoteRequestStatusParams {
  quoteRequestId: string;
  newStatus: string;
  quotedAmount: number | null;
  quoteConditions: string | null;
  adminMemo: string | null;
  memo: string | null;
}

export async function updateQuoteRequestStatus(
  params: UpdateQuoteRequestStatusParams,
): Promise<void> {
  const { error } = await supabase.rpc("admin_update_quote_request_status", {
    p_quote_request_id: params.quoteRequestId,
    p_new_status: params.newStatus,
    p_quoted_amount: params.quotedAmount,
    p_quote_conditions: params.quoteConditions,
    p_admin_memo: params.adminMemo,
    p_memo: params.memo,
  });

  if (error) {
    throw new Error(error.message);
  }
}
