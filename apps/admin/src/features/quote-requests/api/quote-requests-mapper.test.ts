import { describe, expect, it } from "vitest";
import {
  toAdminQuoteRequestDetail,
  toAdminQuoteRequestListItem,
  toAdminQuoteRequestStatusLog,
  toQuoteRequestOptions,
} from "@/features/quote-requests/api/quote-requests-mapper";
import {
  createAdminQuoteRequestDetailRowDTO,
  createAdminQuoteRequestListRowDTO,
  createQuoteRequestStatusLogDTO,
} from "@/test/fixtures";

describe("toQuoteRequestOptions", () => {
  it("JSON 객체를 typed 옵션으로 변환한다", () => {
    expect(
      toQuoteRequestOptions({
        tie_type: "3fold",
        interlining: "wool",
        design_type: "classic",
        fabric_type: "silk",
        fabric_provided: true,
        interlining_thickness: "thick",
        triangle_stitch: true,
        side_stitch: true,
        bar_tack: false,
        dimple: true,
        spoderato: false,
        fold7: true,
        brand_label: true,
        care_label: false,
      }),
    ).toEqual({
      tieType: "3fold",
      interlining: "wool",
      designType: "classic",
      fabricType: "silk",
      fabricProvided: true,
      interliningThickness: "thick",
      triangleStitch: true,
      sideStitch: true,
      barTack: false,
      dimple: true,
      spoderato: false,
      fold7: true,
      brandLabel: true,
      careLabel: false,
    });
  });

  it("빈 객체이면 모든 필드가 기본값이다", () => {
    expect(toQuoteRequestOptions({})).toEqual({
      tieType: "",
      interlining: "",
      designType: "",
      fabricType: "",
      fabricProvided: false,
      interliningThickness: "",
      triangleStitch: false,
      sideStitch: false,
      barTack: false,
      dimple: false,
      spoderato: false,
      fold7: false,
      brandLabel: false,
      careLabel: false,
    });
  });

  it("string이 아닌 값은 빈 문자열로 처리한다", () => {
    expect(
      toQuoteRequestOptions({
        tie_type: 123,
        interlining: true,
        design_type: null,
      }),
    ).toEqual(
      expect.objectContaining({
        tieType: "",
        interlining: "",
        designType: "",
      }),
    );
  });

  it("boolean이 아닌 값은 false로 처리한다", () => {
    expect(
      toQuoteRequestOptions({
        fabric_provided: "true",
        triangle_stitch: 1,
        brand_label: null,
      }),
    ).toEqual(
      expect.objectContaining({
        fabricProvided: false,
        triangleStitch: false,
        brandLabel: false,
      }),
    );
  });
});

describe("toAdminQuoteRequestListItem", () => {
  it("DTO를 리스트 아이템으로 변환한다", () => {
    expect(
      toAdminQuoteRequestListItem(createAdminQuoteRequestListRowDTO()),
    ).toEqual(
      expect.objectContaining({
        id: "quote-1",
        quoteNumber: "Q-20260315-001",
        date: "2026-03-15",
        status: "견적대기",
        quantity: 100,
        quotedAmount: 250000,
        customerName: "홍길동",
        contactName: "김담당",
        contactMethod: "email",
      }),
    );
  });
});

describe("toAdminQuoteRequestDetail", () => {
  it("DTO를 상세 모델로 변환한다", () => {
    expect(
      toAdminQuoteRequestDetail(createAdminQuoteRequestDetailRowDTO()),
    ).toEqual(
      expect.objectContaining({
        id: "quote-1",
        userId: "user-1",
        options: expect.objectContaining({
          tieType: "3fold",
          fabricProvided: true,
        }),
        referenceImageUrls: ["https://example.com/ref-1.jpg"],
        additionalNotes: "안감 포함",
        customerName: "홍길동",
        deliveryRequest: "평일 오전",
      }),
    );
  });

  it("referenceImages가 null이면 빈 배열로 폴백한다", () => {
    expect(
      toAdminQuoteRequestDetail(
        createAdminQuoteRequestDetailRowDTO({
          referenceImages: null as never,
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        referenceImageUrls: [],
      }),
    );
  });
});

describe("toAdminQuoteRequestStatusLog", () => {
  it("상태 로그 DTO를 UI 모델로 변환한다", () => {
    expect(
      toAdminQuoteRequestStatusLog(createQuoteRequestStatusLogDTO()),
    ).toEqual({
      id: "log-1",
      previousStatus: "견적대기",
      newStatus: "견적완료",
      memo: "금액 확정",
      createdAt: "2026-03-15T11:00:00Z",
    });
  });
});
