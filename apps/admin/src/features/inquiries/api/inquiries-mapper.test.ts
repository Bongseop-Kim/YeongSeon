import { describe, expect, it } from "vitest";
import {
  toAdminInquiryDetail,
  toAdminInquiryListItem,
} from "@/features/inquiries/api/inquiries-mapper";
import { createAdminInquiryRowDTO } from "@/test/fixtures";

describe("toAdminInquiryListItem", () => {
  it("DTO를 리스트 아이템으로 변환한다", () => {
    expect(toAdminInquiryListItem(createAdminInquiryRowDTO())).toEqual(
      expect.objectContaining({
        id: "inquiry-1",
        title: "배송 문의",
        status: "답변대기",
        category: "상품",
        date: expect.any(String),
      }),
    );
  });

  it("category가 null이면 '일반'으로 폴백한다", () => {
    expect(
      toAdminInquiryListItem(
        createAdminInquiryRowDTO({
          category: null as never,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        category: "일반",
      }),
    );
  });
});

describe("toAdminInquiryDetail", () => {
  it("답변완료 상태이면 type: answered를 반환한다", () => {
    expect(
      toAdminInquiryDetail(
        createAdminInquiryRowDTO({
          status: "답변완료",
          answer: "오늘 출고됩니다.",
          answer_date: "2026-03-16T09:00:00Z",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        type: "answered",
        status: "답변완료",
        answer: "오늘 출고됩니다.",
        answerDate: expect.any(String),
      }),
    );
  });

  it("답변대기 상태이면 type: pending을 반환한다", () => {
    expect(toAdminInquiryDetail(createAdminInquiryRowDTO())).toEqual(
      expect.objectContaining({
        type: "pending",
        status: "답변대기",
      }),
    );
  });

  it("답변완료인데 answer가 null이면 pending으로 처리한다", () => {
    expect(
      toAdminInquiryDetail(
        createAdminInquiryRowDTO({
          status: "답변완료",
          answer: null,
          answer_date: "2026-03-16T09:00:00Z",
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        type: "pending",
        status: "답변대기",
      }),
    );
  });

  it("products가 있으면 product 객체를 포함한다", () => {
    expect(toAdminInquiryDetail(createAdminInquiryRowDTO())).toEqual(
      expect.objectContaining({
        product: {
          id: 1,
          name: "테스트 넥타이",
          image: "https://example.com/product.jpg",
        },
      }),
    );
  });

  it("products가 없으면 product가 undefined이다", () => {
    expect(
      toAdminInquiryDetail(
        createAdminInquiryRowDTO({
          product_id: null,
          products: null,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        product: undefined,
      }),
    );
  });
});
