import type { InquiryRowDTO } from "@/features/my-page/inquiry/types/dto/inquiry";
import {
  INQUIRY_CATEGORIES,
  type InquiryItem,
  type InquiryCategory,
} from "@/features/my-page/inquiry/types/inquiry-item";

export const toInquiryView = (row: InquiryRowDTO): InquiryItem => ({
  id: row.id,
  date: row.created_at.slice(0, 10),
  status: row.status,
  category: INQUIRY_CATEGORIES.includes(row.category as InquiryCategory)
    ? (row.category as InquiryCategory)
    : "일반",
  product:
    row.products
      ? { id: row.products.id, name: row.products.name, image: row.products.image }
      : undefined,
  title: row.title,
  content: row.content,
  answer: row.answer ?? undefined,
  answerDate: row.answer_date?.slice(0, 10) ?? undefined,
});
