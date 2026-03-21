import type { AdminInquiryRowDTO } from "@yeongseon/shared";
import { formatDate, isInquiryCategory } from "@yeongseon/shared";
import {
  type AdminInquiryListItem,
  type AdminInquiryDetail,
  type InquiryCategory,
} from "@/features/inquiries/types/admin-inquiry";

const toInquiryCategory = (v: string | null): InquiryCategory => {
  if (v !== null && isInquiryCategory(v)) return v;
  return "일반";
};

export function toAdminInquiryListItem(
  dto: AdminInquiryRowDTO,
): AdminInquiryListItem {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    category: toInquiryCategory(dto.category),
    date: formatDate(dto.created_at),
  };
}

export function toAdminInquiryDetail(
  dto: AdminInquiryRowDTO,
): AdminInquiryDetail {
  const category = toInquiryCategory(dto.category);
  const product = dto.products
    ? {
        id: dto.products.id,
        name: dto.products.name,
        image: dto.products.image,
      }
    : undefined;

  if (dto.status === "답변완료" && dto.answer && dto.answer_date) {
    return {
      type: "answered",
      id: dto.id,
      title: dto.title,
      content: dto.content,
      status: dto.status,
      date: formatDate(dto.created_at),
      category,
      product,
      answer: dto.answer,
      answerDate: formatDate(dto.answer_date),
    };
  }
  return {
    type: "pending",
    id: dto.id,
    title: dto.title,
    content: dto.content,
    status: "답변대기",
    date: formatDate(dto.created_at),
    category,
    product,
  };
}
