export type InquiryStatus = "답변대기" | "답변완료";

export const INQUIRY_STATUS = {
  PENDING: "답변대기",
  ANSWERED: "답변완료",
} as const satisfies Record<string, InquiryStatus>;

export interface InquiryItem {
  id: string;
  date: string;
  status: InquiryStatus;
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
