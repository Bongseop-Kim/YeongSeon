export type InquiryStatusDTO = "답변대기" | "답변완료";

/** inquiries 테이블 row */
export interface InquiryRowDTO {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatusDTO;
  answer: string | null;
  answer_date: string | null;
  created_at: string;
  updated_at: string;
}
