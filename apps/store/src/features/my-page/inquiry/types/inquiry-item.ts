import {
  INQUIRY_CATEGORIES,
  isInquiryCategory,
  type InquiryCategory,
} from "@yeongseon/shared";

export type InquiryStatus = "답변대기" | "답변완료";
export type { InquiryCategory };
export { INQUIRY_CATEGORIES, isInquiryCategory };

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
  product?: InquiryProduct; // category='상품'일 때만
  title: string;
  content: string;
  answer?: string;
  answerDate?: string;
}
