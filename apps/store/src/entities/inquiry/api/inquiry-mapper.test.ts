import { describe, expect, it } from "vitest";
import { toInquiryView } from "@/entities/inquiry/api/inquiry-mapper";

describe("toInquiryView", () => {
  it("유효한 카테고리와 상품 정보를 view로 변환한다", () => {
    expect(
      toInquiryView({
        id: "inq-1",
        user_id: "user-1",
        created_at: "2026-03-15T09:00:00Z",
        updated_at: "2026-03-15T09:00:00Z",
        status: "답변완료",
        category: "상품",
        title: "배송 문의",
        content: "언제 오나요?",
        product_id: 1,
        answer: "오늘 발송됩니다.",
        answer_date: "2026-03-16T10:00:00Z",
        products: {
          id: 1,
          name: "테스트 넥타이",
          image: "image.jpg",
        },
      }),
    ).toEqual({
      id: "inq-1",
      date: "2026-03-15",
      status: "답변완료",
      category: "상품",
      product: {
        id: 1,
        name: "테스트 넥타이",
        image: "image.jpg",
      },
      title: "배송 문의",
      content: "언제 오나요?",
      answer: "오늘 발송됩니다.",
      answerDate: "2026-03-16",
    });
  });

  it("알 수 없는 category는 '일반'으로 폴백한다", () => {
    const result = toInquiryView({
      id: "inq-3",
      user_id: "user-1",
      created_at: "2026-03-15T09:00:00Z",
      updated_at: "2026-03-15T09:00:00Z",
      status: "답변대기",
      category: "알수없는카테고리",
      title: "문의",
      content: "내용",
      product_id: null,
      answer: null,
      answer_date: null,
      products: null,
    });
    expect(result.category).toBe("일반");
  });

  it("알 수 없는 카테고리와 nullable 필드를 기본값으로 정규화한다", () => {
    expect(
      toInquiryView({
        id: "inq-2",
        user_id: "user-1",
        created_at: "2026-03-15T09:00:00Z",
        updated_at: "2026-03-15T09:00:00Z",
        status: "답변대기",
        category: "unknown",
        title: "문의",
        content: "내용",
        product_id: null,
        answer: null,
        answer_date: null,
        products: null,
      }),
    ).toEqual(
      expect.objectContaining({
        category: "일반",
        product: undefined,
        answer: undefined,
        answerDate: undefined,
      }),
    );
  });
});
