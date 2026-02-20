import type { InquiryRowDTO } from "@/features/my-page/inquiry/types/dto/inquiry";
import type { InquiryItem } from "@/features/my-page/inquiry/types/inquiry-item";

/**
 * InquiryRowDTO → InquiryItem (View)
 */
export const toInquiryView = (row: InquiryRowDTO): InquiryItem => ({
  id: row.id,
  date: row.created_at.slice(0, 10), // YYYY-MM-DD
  status: row.status,
  title: row.title,
  content: row.content,
  answer: row.answer ?? undefined,
  answerDate: row.answer_date?.slice(0, 10) ?? undefined,
});
