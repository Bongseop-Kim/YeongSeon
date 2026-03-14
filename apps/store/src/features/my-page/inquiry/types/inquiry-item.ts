export type InquiryStatus = "답변대기" | "답변완료";
export type InquiryCategory = "일반" | "상품" | "수선" | "주문제작";

export const INQUIRY_STATUS = {
  PENDING: "답변대기",
  ANSWERED: "답변완료",
} as const satisfies Record<string, InquiryStatus>;

export const INQUIRY_CATEGORIES: InquiryCategory[] = [
  "일반",
  "상품",
  "수선",
  "주문제작",
];

export interface InquiryProduct {
  id: number;
  name: string;
  image: string;
}

export interface InquiryItem {
  id: string;
  date: string;
  status: InquiryStatus;
  category: InquiryCategory;
  product?: InquiryProduct; // category='상품'일 때만
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
