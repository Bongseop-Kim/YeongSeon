import type { AdminInquiryRowDTO } from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared";
import type {
  AdminInquiryListItem,
  AdminInquiryDetail,
  InquiryCategory,
} from "../types/admin-inquiry";

export function toAdminInquiryListItem(
  dto: AdminInquiryRowDTO
): AdminInquiryListItem {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    category: (dto.category ?? "일반") as InquiryCategory,
    date: formatDate(dto.created_at),
  };
}

export function toAdminInquiryDetail(
  dto: AdminInquiryRowDTO
): AdminInquiryDetail {
  const category = (dto.category ?? "일반") as InquiryCategory;
  const product = dto.products
    ? { id: dto.products.id, name: dto.products.name, image: dto.products.image }
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
