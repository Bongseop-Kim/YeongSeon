import { supabase } from "@/lib/supabase";
import type { InquiryRowDTO } from "../types/dto/inquiry";
import type { InquiryItem } from "../types/inquiry-item";
import { toInquiryView } from "./inquiry-mapper";

/**
 * 문의 목록 조회
 */
export const getInquiries = async (): Promise<InquiryItem[]> => {
  const { data, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`문의 목록 조회 실패: ${error.message}`);
  }

  const rows = (data as InquiryRowDTO[] | null) ?? [];
  return rows.map(toInquiryView);
};

/**
 * 문의 등록
 */
export const createInquiry = async (params: {
  userId: string;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase.from("inquiries").insert({
    user_id: params.userId,
    title: params.title,
    content: params.content,
  });

  if (error) {
    throw new Error(`문의 등록 실패: ${error.message}`);
  }
};

/**
 * 문의 수정 (답변대기 상태에서만 RLS 허용)
 */
export const updateInquiry = async (params: {
  id: string;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("inquiries")
    .update({ title: params.title, content: params.content })
    .eq("id", params.id);

  if (error) {
    throw new Error(`문의 수정 실패: ${error.message}`);
  }
};

/**
 * 문의 삭제 (답변대기 상태에서만 RLS 허용)
 */
export const deleteInquiry = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`문의 삭제 실패: ${error.message}`);
  }
};
