export type InquiryStatus = "답변대기" | "답변완료";
export type InquiryCategory = "일반" | "상품" | "수선" | "주문제작";

export const INQUIRY_CATEGORIES: InquiryCategory[] = ["일반", "상품", "수선", "주문제작"];

// ── List UI model ──────────────────────────────────────────────

export interface AdminInquiryListItem {
  id: string;
  title: string;
  status: InquiryStatus;
  category: InquiryCategory;
  date: string;
}

// ── Detail UI model (discriminated union) ──────────────────────

interface AdminInquiryBase {
  id: string;
  title: string;
  content: string;
  date: string;
  category: InquiryCategory;
  product?: { id: number; name: string; image: string };
}

export interface AdminInquiryPending extends AdminInquiryBase {
  type: "pending";
  status: "답변대기";
}

export interface AdminInquiryAnswered extends AdminInquiryBase {
  type: "answered";
  status: "답변완료";
  answer: string;
  answerDate: string;
}

export type AdminInquiryDetail = AdminInquiryPending | AdminInquiryAnswered;

// ── Constants ──────────────────────────────────────────────────

export const INQUIRY_STATUS_COLORS: Record<InquiryStatus, string> = {
  답변대기: "warning",
  답변완료: "success",
};

export const INQUIRY_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: "답변대기", value: "답변대기" },
  { label: "답변완료", value: "답변완료" },
];
