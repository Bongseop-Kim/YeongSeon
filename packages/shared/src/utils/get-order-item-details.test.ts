import { describe, it, expect } from "vitest";
import {
  createProductOrderItem,
  createReformOrderItem,
  createCustomOrderItem,
  createSampleOrderItem,
  createTokenOrderItem,
  createProduct,
  createProductOption,
} from "@/test/fixtures";
import { getOrderItemDetails } from "@/utils/get-order-item-details";

const createCustomData = (
  overrides?: Partial<
    NonNullable<Parameters<typeof createCustomOrderItem>[0]>["customData"]
  >,
) => ({
  options: {
    fabricType: "실크",
    designType: "클래식",
    tieType: null,
    interlining: null,
    fabricProvided: false,
    triangleStitch: false,
    sideStitch: false,
    barTack: false,
    dimple: false,
    spoderato: false,
    fold7: false,
    brandLabel: false,
    careLabel: false,
    ...overrides?.options,
  },
  pricing: {
    sewingCost: 0,
    fabricCost: 0,
    totalCost: 0,
    ...overrides?.pricing,
  },
  referenceImageUrls: overrides?.referenceImageUrls ?? [],
  additionalNotes: overrides?.additionalNotes ?? null,
});

describe("getOrderItemDetails", () => {
  it("상품+옵션 이름을 중간점으로 연결한다", () => {
    const item = createProductOrderItem({
      product: createProduct({ name: "실크 넥타이" }),
      selectedOption: createProductOption({ name: "네이비" }),
    });
    expect(getOrderItemDetails(item)).toBe("실크 넥타이 · 네이비");
  });

  it("옵션이 없으면 상품 이름만 반환한다", () => {
    const item = createProductOrderItem({
      product: createProduct({ name: "실크 넥타이" }),
      selectedOption: undefined,
    });
    expect(getOrderItemDetails(item)).toBe("실크 넥타이");
  });

  it("주문 제작: fabricType과 designType을 중간점으로 연결한다", () => {
    const item = createCustomOrderItem({
      customData: createCustomData(),
    });
    expect(getOrderItemDetails(item)).toBe("실크 · 클래식");
  });

  it("주문 제작: fabricType만 있으면 fabricType만 반환한다", () => {
    const item = createCustomOrderItem({
      customData: createCustomData({
        options: {
          fabricType: "울",
          designType: null,
        },
      }),
    });
    expect(getOrderItemDetails(item)).toBe("울");
  });

  it("주문 제작: 옵션이 모두 없으면 '주문 제작'을 반환한다", () => {
    const item = createCustomOrderItem({
      customData: createCustomData({
        options: {
          fabricType: null,
          designType: null,
        },
      }),
    });
    expect(getOrderItemDetails(item)).toBe("주문 제작");
  });

  it("샘플: fabricType과 tieType을 중간점으로 연결한다", () => {
    const item = createSampleOrderItem({
      sampleData: {
        sampleType: "fabric",
        options: {
          fabricType: "실크",
          designType: null,
          tieType: "3폴드",
          interlining: null,
        },
        pricing: { totalCost: 5000 },
        referenceImageUrls: [],
        additionalNotes: null,
      },
    });
    expect(getOrderItemDetails(item)).toBe("fabric · 실크 · 3폴드");
  });

  it("샘플: 옵션이 없으면 sampleType만 반환한다", () => {
    const item = createSampleOrderItem({
      sampleData: {
        sampleType: "sewing",
        options: {
          fabricType: null,
          designType: null,
          tieType: null,
          interlining: null,
        },
        pricing: { totalCost: 5000 },
        referenceImageUrls: [],
        additionalNotes: null,
      },
    });
    expect(getOrderItemDetails(item)).toBe("sewing");
  });

  it("토큰 구매는 '토큰 구매'를 반환한다", () => {
    const item = createTokenOrderItem();
    expect(getOrderItemDetails(item)).toBe("토큰 구매");
  });

  it("수선 length 타입의 상세를 반환한다", () => {
    const item = createReformOrderItem({
      reformData: {
        tie: { id: "t-1", measurementType: "length", tieLength: 145 },
        cost: 15000,
      },
    });
    expect(getOrderItemDetails(item)).toBe("길이 145cm");
  });

  it("수선 height 타입의 상세를 반환한다", () => {
    const item = createReformOrderItem({
      reformData: {
        tie: { id: "t-1", measurementType: "height", wearerHeight: 170 },
        cost: 15000,
      },
    });
    expect(getOrderItemDetails(item)).toBe("신장 170cm 기준");
  });

  it("수선 측정 정보가 없으면 '수선'을 반환한다", () => {
    const item = createReformOrderItem({
      reformData: {
        tie: { id: "t-1" },
        cost: 15000,
      },
    });
    expect(getOrderItemDetails(item)).toBe("수선");
  });
});
