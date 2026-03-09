export type InquiryStatusDTO = "답변대기" | "답변완료";

export interface InquiryProductDTO {
  id: number;
  name: string;
  image: string;
}

/** inquiries 테이블 row (products join 포함) */
export interface InquiryRowDTO {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatusDTO;
  category: string;
  product_id: number | null;
  products: InquiryProductDTO | null;  // join 결과
  answer: string | null;
  answer_date: string | null;
  created_at: string;
  updated_at: string;
}
