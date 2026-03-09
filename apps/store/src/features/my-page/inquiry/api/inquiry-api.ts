import { supabase } from "@/lib/supabase";
import type { InquiryRowDTO, InquiryProductDTO } from "@/features/my-page/inquiry/types/dto/inquiry";
import type { InquiryItem, InquiryCategory } from "@/features/my-page/inquiry/types/inquiry-item";
import { toInquiryView } from "./inquiry-mapper";

const INQUIRY_SELECT = `
  id, user_id, title, content, status, category, product_id,
  answer, answer_date, created_at, updated_at,
  products(id, name, image)
`;

export const getInquiries = async (): Promise<InquiryItem[]> => {
  const { data, error } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`문의 목록 조회 실패: ${error.message}`);
  const rows = (data as unknown as InquiryRowDTO[] | null) ?? [];
  return rows.map(toInquiryView);
};

export const createInquiry = async (params: {
  userId: string;
  category: InquiryCategory;
  productId?: number;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase.from("inquiries").insert({
    user_id: params.userId,
    category: params.category,
    product_id: params.productId ?? null,
    title: params.title,
    content: params.content,
  });
  if (error) throw new Error(`문의 등록 실패: ${error.message}`);
};

export const updateInquiry = async (params: {
  id: string;
  category: InquiryCategory;
  productId?: number;
  title: string;
  content: string;
}): Promise<void> => {
  const { error } = await supabase
    .from("inquiries")
    .update({
      category: params.category,
      product_id: params.productId ?? null,
      title: params.title,
      content: params.content,
    })
    .eq("id", params.id);
  if (error) throw new Error(`문의 수정 실패: ${error.message}`);
};

export const deleteInquiry = async (id: string): Promise<void> => {
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error(`문의 삭제 실패: ${error.message}`);
};

/** 상품 검색 (문의 폼용) */
export const searchProductsForInquiry = async (
  query: string
): Promise<InquiryProductDTO[]> => {
  let req = supabase
    .from("products")
    .select("id, name, image")
    .order("id", { ascending: false })
    .limit(10);

  if (query.trim()) {
    req = req.ilike("name", `%${query.trim()}%`);
  }

  const { data, error } = await req;
  if (error) throw new Error(`상품 검색 실패: ${error.message}`);
  return (data ?? []) as InquiryProductDTO[];
};
