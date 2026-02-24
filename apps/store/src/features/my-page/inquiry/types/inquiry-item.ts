export type InquiryStatus = "답변대기" | "답변완료";

export interface InquiryItem {
  id: string;
  date: string;
  status: InquiryStatus;
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
