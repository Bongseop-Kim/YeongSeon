export type InquiryStatusDTO = "답변대기" | "답변완료";

/** inquiries 테이블 row */
export interface AdminInquiryRowDTO {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatusDTO;
  category: string;
  product_id: number | null;
  products: { id: number; name: string; image: string } | null;
  answer: string | null;
  answer_date: string | null;
  created_at: string;
}
