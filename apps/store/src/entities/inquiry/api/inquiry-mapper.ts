import { isInquiryCategory } from "@yeongseon/shared";
import type { InquiryRowDTO } from "@/entities/inquiry/model/dto/inquiry";
import type { InquiryItem } from "@/entities/inquiry/model/inquiry-item";

export const toInquiryView = (row: InquiryRowDTO): InquiryItem => ({
  id: row.id,
  date: row.created_at.slice(0, 10),
  status: row.status,
  category: isInquiryCategory(row.category) ? row.category : "일반",
  product: row.products
    ? {
        id: row.products.id,
        name: row.products.name,
        image: row.products.image,
      }
    : undefined,
  title: row.title,
  content: row.content,
  answer: row.answer ?? undefined,
  answerDate: row.answer_date?.slice(0, 10) ?? undefined,
});
