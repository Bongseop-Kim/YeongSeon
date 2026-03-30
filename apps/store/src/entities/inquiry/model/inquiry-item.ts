import { INQUIRY_CATEGORIES, type InquiryCategory } from "@yeongseon/shared";

export type InquiryStatus = "답변대기" | "답변완료";
export type { InquiryCategory };
export { INQUIRY_CATEGORIES };

export const INQUIRY_STATUS = {
  PENDING: "답변대기",
  ANSWERED: "답변완료",
} as const satisfies Record<string, InquiryStatus>;

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
  product?: InquiryProduct;
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
