import { supabase } from "@/lib/supabase";

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
