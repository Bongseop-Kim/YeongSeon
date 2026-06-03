import type { AdminInquiryRowDTO } from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import {
  toAdminInquiryDetail,
  toAdminInquiryListItem,
} from "@/features/inquiries/api/inquiries-mapper";
import type {
  AdminInquiryDetail,
  AdminInquiryListItem,
  InquiryStatus,
} from "@/features/inquiries/types/admin-inquiry";

interface AdminInquiryListResult {
  rows: AdminInquiryListItem[];
  total: number;
}

export async function getAdminInquiries(params: {
  page: number;
  pageSize: number;
  status?: InquiryStatus | null;
}): Promise<AdminInquiryListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as AdminInquiryRowDTO[]).map(toAdminInquiryListItem),
    total: count ?? 0,
  };
}

export async function getAdminInquiryDetail(
  id: string,
): Promise<AdminInquiryDetail> {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*, products(id, name, image)")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return toAdminInquiryDetail(data as AdminInquiryRowDTO);
}

interface AnswerInquiryParams {
  inquiryId: string;
  answer: string;
}

/**
 * inquiries 테이블 직접 UPDATE
 *
 * 직접 쓰기 근거:
 * - RLS USING: public.is_admin() → 관리자만 접근 가능
 * - RLS WITH CHECK: status = '답변완료' AND answer IS NOT NULL AND answer_date IS NOT NULL
 *   → 불완전한 답변 상태 방지
 * - GRANT UPDATE (status, answer, answer_date): 컬럼 수준 제한
 */
export async function answerInquiry({
  inquiryId,
  answer,
}: AnswerInquiryParams): Promise<void> {
  const { error } = await supabase
    .from("inquiries")
    .update({
      status: "답변완료",
      answer,
      answer_date: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (error) {
    throw new Error(error.message);
  }
}
