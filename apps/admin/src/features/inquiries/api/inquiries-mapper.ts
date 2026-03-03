import type { AdminInquiryRowDTO } from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared";
import type {
  AdminInquiryListItem,
  AdminInquiryDetail,
} from "../types/admin-inquiry";

export function toAdminInquiryListItem(
  dto: AdminInquiryRowDTO
): AdminInquiryListItem {
  return {
    id: dto.id,
    title: dto.title,
    status: dto.status,
    date: formatDate(dto.created_at),
  };
}

export function toAdminInquiryDetail(
  dto: AdminInquiryRowDTO
): AdminInquiryDetail {
  if (dto.status === "답변완료" && dto.answer && dto.answer_date) {
    return {
      type: "answered",
      id: dto.id,
      title: dto.title,
      content: dto.content,
      status: dto.status,
      date: formatDate(dto.created_at),
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
  };
}
