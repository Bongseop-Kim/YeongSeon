export type InquiryCategory = "일반" | "상품" | "수선" | "주문제작";

export const INQUIRY_CATEGORIES = [
  "일반",
  "상품",
  "수선",
  "주문제작",
] as const satisfies readonly InquiryCategory[];

export const isInquiryCategory = (value: string): value is InquiryCategory =>
  INQUIRY_CATEGORIES.some((category) => category === value);
