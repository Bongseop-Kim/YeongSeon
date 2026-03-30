import { describe, expect, it } from "vitest";
import {
  parseQuoteRequestDetailRow,
  parseQuoteRequestListRows,
  toCreateQuoteRequestInput,
  toCreateQuoteRequestInputDto,
  toQuoteRequestDetail,
  toQuoteRequestListItem,
  toQuoteRequestOptions,
  toReferenceImageUrls,
} from "@/entities/quote-request";

const createQuoteRequestListRowRaw = (
  overrides?: Partial<Record<string, unknown>>,
): Record<string, unknown> => ({
  id: "quote-1",
  quoteNumber: "Q-001",
  date: "2026-03-15",
  status: "요청",
  quantity: 100,
  quotedAmount: 500000,
  contactName: "홍길동",
  contactMethod: "email",
  created_at: "2026-03-15T09:00:00Z",
  ...overrides,
});

describe("parseQuoteRequestListRows", () => {
  it("null 입력은 빈 배열을 반환한다", () => {
    expect(parseQuoteRequestListRows(null)).toEqual([]);
  });

  it("snake/camel 혼합 응답에서 목록 행을 파싱한다", () => {
    expect(parseQuoteRequestListRows([createQuoteRequestListRowRaw()])).toEqual(
      [
        {
          id: "quote-1",
          quoteNumber: "Q-001",
          date: "2026-03-15",
          status: "요청",
          quantity: 100,
          quotedAmount: 500000,
          contactName: "홍길동",
          contactMethod: "email",
          created_at: "2026-03-15T09:00:00Z",
        },
      ],
    );
  });

  describe("에러 케이스", () => {
    it("status가 허용되지 않으면 에러를 던진다", () => {
      expect(() =>
        parseQuoteRequestListRows([
          createQuoteRequestListRowRaw({ status: "대기" }),
        ]),
      ).toThrow("status 값(대기)이 허용된 상태가 아닙니다.");
    });

    it("contactMethod가 허용되지 않으면 에러를 던진다", () => {
      expect(() =>
        parseQuoteRequestListRows([
          createQuoteRequestListRowRaw({ contactMethod: "slack" }),
        ]),
      ).toThrow("contactMethod 값(slack)이 허용된 값이 아닙니다.");
    });

    it("quotedAmount가 숫자 또는 null이 아니면 에러를 던진다", () => {
      expect(() =>
        parseQuoteRequestListRows([
          createQuoteRequestListRowRaw({ quotedAmount: "500000" }),
        ]),
      ).toThrow("quotedAmount는 숫자 또는 null이어야 합니다.");
    });
  });
});

describe("quote-request 상세/입력 매핑", () => {
  it("입력값을 request와 DTO로 변환한다", () => {
    const request = toCreateQuoteRequestInput({
      shippingAddressId: "addr-1",
      options: {
        fabricProvided: false,
        reorder: false,
        fabricType: "SILK",
        designType: "PRINTING",
        tieType: "AUTO",
        interlining: "WOOL",
        interliningThickness: "THICK",
        sizeType: "ADULT",
        tieWidth: 8,
        triangleStitch: true,
        sideStitch: false,
        barTack: true,
        fold7: false,
        dimple: true,
        spoderato: false,
        brandLabel: true,
        careLabel: false,
        quantity: 100,
      },
      referenceImages: [
        { url: " https://example.com/1.jpg ", fileId: " file-1 " },
      ],
      additionalNotes: " 메모 ",
      contactName: " 홍길동 ",
      contactTitle: " 팀장 ",
      contactMethod: "email",
      contactValue: " hello@example.com ",
    });

    expect(request).toEqual(
      expect.objectContaining({
        quantity: 100,
        additionalNotes: "메모",
        contactName: "홍길동",
        contactTitle: "팀장",
        contactValue: "hello@example.com",
      }),
    );
    expect(toCreateQuoteRequestInputDto(request)).toEqual(
      expect.objectContaining({
        shipping_address_id: "addr-1",
        quantity: 100,
        reference_images: [
          { url: "https://example.com/1.jpg", file_id: "file-1" },
        ],
      }),
    );
  });

  it("상세 응답을 파싱하고 view로 변환한다", () => {
    const detail = parseQuoteRequestDetailRow({
      id: "quote-1",
      quoteNumber: "Q-001",
      date: "2026-03-15",
      status: "견적발송",
      quantity: 100,
      options: {
        tie_type: "AUTO",
        fabric_provided: true,
      },
      referenceImages: [{ url: "https://example.com/1.jpg" }, { bad: true }],
      additionalNotes: "메모",
      contactName: "홍길동",
      contactTitle: "팀장",
      contactMethod: "phone",
      contactValue: "010-1234-5678",
      quotedAmount: 100000,
      quoteConditions: "선입금",
    });

    expect(detail).not.toBeNull();
    expect(toQuoteRequestDetail(detail ?? ({} as never))).toEqual(
      expect.objectContaining({
        options: expect.objectContaining({
          tieType: "AUTO",
          fabricProvided: true,
        }),
        referenceImageUrls: ["https://example.com/1.jpg"],
      }),
    );
    expect(
      toQuoteRequestListItem({
        id: "quote-1",
        quoteNumber: "Q-001",
        date: "2026-03-15",
        status: "요청",
        quantity: 100,
        quotedAmount: null,
        contactName: "홍길동",
        contactMethod: "email",
        created_at: "2026-03-15T09:00:00Z",
      }),
    ).toEqual(
      expect.objectContaining({
        quoteNumber: "Q-001",
        contactMethod: "email",
      }),
    );
    expect(toReferenceImageUrls("bad")).toEqual([]);
  });

  it("상세 응답의 에러 케이스를 검증한다", () => {
    expect(parseQuoteRequestDetailRow(null)).toBeNull();
    expect(() => parseQuoteRequestDetailRow([])).toThrow(
      "견적 요청 상세 응답이 올바르지 않습니다: 객체가 아닙니다.",
    );
    expect(() =>
      parseQuoteRequestDetailRow({
        id: "quote-1",
        quoteNumber: "Q-001",
        date: "2026-03-15",
        status: "대기",
        quantity: 100,
        options: {},
        referenceImages: [],
        additionalNotes: "메모",
        contactName: "홍길동",
        contactTitle: "팀장",
        contactMethod: "email",
        contactValue: "hello@example.com",
        quotedAmount: null,
        quoteConditions: null,
      }),
    ).toThrow("status 값(대기)이 허용된 상태가 아닙니다.");
    expect(() =>
      parseQuoteRequestDetailRow({
        id: "quote-1",
        quoteNumber: "Q-001",
        date: "2026-03-15",
        status: "요청",
        quantity: 100,
        options: [],
        referenceImages: [],
        additionalNotes: "메모",
        contactName: "홍길동",
        contactTitle: "팀장",
        contactMethod: "email",
        contactValue: "hello@example.com",
        quotedAmount: null,
        quoteConditions: null,
      }),
    ).toThrow("options가 객체가 아닙니다.");
  });
});

describe("toQuoteRequestOptions", () => {
  it("snake_case 옵션을 camelCase로 변환한다", () => {
    expect(
      toQuoteRequestOptions({
        tie_type: "AUTO",
        interlining: "WOOL",
        design_type: "PRINTING",
        fabric_type: "SILK",
        fabric_provided: true,
        interlining_thickness: "THICK",
        triangle_stitch: true,
        side_stitch: true,
        bar_tack: true,
        dimple: true,
        spoderato: false,
        fold7: true,
        brand_label: true,
        care_label: false,
      }),
    ).toEqual({
      tieType: "AUTO",
      interlining: "WOOL",
      designType: "PRINTING",
      fabricType: "SILK",
      fabricProvided: true,
      interliningThickness: "THICK",
      triangleStitch: true,
      sideStitch: true,
      barTack: true,
      dimple: true,
      spoderato: false,
      fold7: true,
      brandLabel: true,
      careLabel: false,
    });
  });

  it("잘못된 boolean/string 값은 기본값으로 정규화한다", () => {
    expect(
      toQuoteRequestOptions({
        tie_type: 1,
        fabric_provided: "yes",
        triangle_stitch: null,
      }),
    ).toEqual({
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
});
