import type {
  AdminQuoteRequestDetailRowDTO,
  AdminQuoteRequestListRowDTO,
  QuoteRequestStatusLogDTO,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import {
  toAdminQuoteRequestDetail,
  toAdminQuoteRequestListItem,
  toAdminQuoteRequestStatusLog,
} from "@/features/quote-requests/api/quote-requests-mapper";
import type {
  AdminQuoteRequestDetail,
  AdminQuoteRequestListItem,
  AdminQuoteRequestStatusLog,
} from "@/features/quote-requests/types/admin-quote-request";

interface AdminQuoteRequestListResult {
  rows: AdminQuoteRequestListItem[];
  total: number;
}

export async function getAdminQuoteRequests(params: {
  page: number;
  pageSize: number;
  quoteNumber?: string | null;
  status?: string | null;
}): Promise<AdminQuoteRequestListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("admin_quote_request_list_view")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);

  const quoteNumber = params.quoteNumber?.trim();
  if (quoteNumber) {
    query = query.ilike("quoteNumber", `%${quoteNumber}%`);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as AdminQuoteRequestListRowDTO[]).map(
      toAdminQuoteRequestListItem,
    ),
    total: count ?? 0,
  };
}

export async function getAdminQuoteRequestDetail(
  id: string,
): Promise<AdminQuoteRequestDetail> {
  const { data, error } = await supabase
    .from("admin_quote_request_detail_view")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return toAdminQuoteRequestDetail(data as AdminQuoteRequestDetailRowDTO);
}

export async function getAdminQuoteRequestStatusLogs(
  quoteRequestId: string,
): Promise<AdminQuoteRequestStatusLog[]> {
  const { data, error } = await supabase
    .from("admin_quote_request_status_log_view")
    .select("*")
    .eq("quoteRequestId", quoteRequestId)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as QuoteRequestStatusLogDTO[]).map(
    toAdminQuoteRequestStatusLog,
  );
}

interface UpdateQuoteRequestStatusParams {
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
