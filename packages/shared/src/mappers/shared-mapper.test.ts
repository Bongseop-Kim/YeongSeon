import { describe, expect, it } from "vitest";
import {
  normalizeItemRow,
  parseCustomOrderData,
  parseSampleOrderData,
  toAppliedCouponDTO,
  toAppliedCouponView,
  toCouponDTO,
  toCouponView,
  toOrderItemView,
  toProductDTO,
  toProductOptionDTO,
  toProductOptionView,
  toProductView,
  toTieItemDTO,
  toTieItemView,
} from "./shared-mapper";
import {
  createAppliedCoupon,
  createCustomOrderData,
  createNullableItemRow,
  createOrderItemDTO,
  createProduct,
  createProductOption,
  createSampleOrderItemDTO,
} from "../test/fixtures";

describe("normalizeItemRow", () => {
  it("product 타입은 삭제된 상품 fallback을 채운다", () => {
    expect(
      normalizeItemRow(
        createNullableItemRow({
          product: null,
          selectedOption: null,
        }),
      ),
    ).toEqual({
      id: "item-1",
      type: "product",
      product: expect.objectContaining({
        id: -1,
        code: "DELETED",
        name: "삭제된 상품",
        deleted: true,
      }),
      selectedOption: undefined,
      quantity: 1,
      appliedCoupon: undefined,
    });
  });

  it("reform 타입은 reformData를 유지한다", () => {
    expect(
      normalizeItemRow(
        createNullableItemRow({
          type: "reform",
          product: null,
          selectedOption: null,
          reformData: {
            tie: { id: "tie-1", measurementType: "height", wearerHeight: 180 },
            cost: 21000,
          },
        }),
      ),
    ).toEqual({
      id: "item-1",
      type: "reform",
      quantity: 1,
      reformData: {
        tie: { id: "tie-1", measurementType: "height", wearerHeight: 180 },
        cost: 21000,
      },
      appliedCoupon: undefined,
    });
  });

  it("custom 타입은 customData를 유지한다", () => {
    expect(
      normalizeItemRow(
        createNullableItemRow({
          type: "custom",
          product: null,
          selectedOption: null,
          customData: createCustomOrderData(),
        }),
      ),
    ).toEqual({
      id: "item-1",
      type: "custom",
      quantity: 1,
      customData: createCustomOrderData(),
      appliedCoupon: undefined,
    });
  });

  it("token 타입은 최소 필드만 반환한다", () => {
    expect(
      normalizeItemRow(
        createNullableItemRow({
          type: "token",
          product: null,
          selectedOption: null,
        }),
      ),
    ).toEqual({
      id: "item-1",
      type: "token",
      quantity: 1,
      appliedCoupon: undefined,
    });
  });

  it("sample 타입은 sampleData를 유지한다", () => {
    const sampleData = createSampleOrderItemDTO().sampleData;
    expect(
      normalizeItemRow(
        createNullableItemRow({
          type: "sample",
          product: null,
          selectedOption: null,
          sampleData,
        }),
      ),
    ).toEqual({
      id: "item-1",
      type: "sample",
      quantity: 1,
      sampleData,
      appliedCoupon: undefined,
    });
  });

  describe("에러 케이스", () => {
    it("custom 타입에서 customData가 없으면 에러를 던진다", () => {
      expect(() =>
        normalizeItemRow(
          createNullableItemRow({
            type: "custom",
            product: null,
            selectedOption: null,
            customData: null,
          }),
        ),
      ).toThrow("주문 제작 데이터가 올바르지 않습니다.");
    });

    it("reform 타입에서 reformData가 없으면 에러를 던진다", () => {
      expect(() =>
        normalizeItemRow(
          createNullableItemRow({
            type: "reform",
            product: null,
            selectedOption: null,
            reformData: null,
          }),
        ),
      ).toThrow("주문 수선 데이터가 올바르지 않습니다.");
    });

    it("sample 타입에서 sampleData가 없으면 에러를 던진다", () => {
      expect(() =>
        normalizeItemRow(
          createNullableItemRow({
            type: "sample",
            product: null,
            selectedOption: null,
            sampleData: null,
          }),
        ),
      ).toThrow("샘플 주문 데이터가 올바르지 않습니다.");
    });
  });
});

describe("toOrderItemView", () => {
  it("product 타입 DTO를 view 모델로 변환한다", () => {
    expect(
      toOrderItemView(
        createOrderItemDTO({
          overrides: {
            product: createProduct({ name: "실크 넥타이" }),
            selectedOption: createProductOption({ name: "네이비" }),
            appliedCoupon: createAppliedCoupon(),
          },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        type: "product",
        product: expect.objectContaining({ name: "실크 넥타이" }),
        selectedOption: expect.objectContaining({ name: "네이비" }),
        appliedCoupon: expect.objectContaining({ id: "uc-1" }),
      }),
    );
  });

  it("custom 타입 DTO를 그대로 유지하되 쿠폰만 view로 변환한다", () => {
    expect(
      toOrderItemView(
        createOrderItemDTO({
          type: "custom",
          overrides: {
            appliedCoupon: createAppliedCoupon(),
          },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        type: "custom",
        customData: expect.objectContaining({
          pricing: expect.objectContaining({ totalCost: 20000 }),
        }),
        appliedCoupon: expect.objectContaining({ id: "uc-1" }),
      }),
    );
  });

  it("product 타입에서 selectedOption이 없으면 undefined로 반환한다", () => {
    expect(
      toOrderItemView(
        createOrderItemDTO({
          overrides: { selectedOption: undefined },
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        type: "product",
        selectedOption: undefined,
      }),
    );
  });

  it("sample 타입 DTO를 view 모델로 변환한다", () => {
    const dto = createSampleOrderItemDTO();
    expect(toOrderItemView(dto)).toEqual(
      expect.objectContaining({
        type: "sample",
        sampleData: expect.objectContaining({
          sampleType: "fabric",
        }),
        appliedCoupon: undefined,
      }),
    );
  });

  it("token 타입 DTO를 view 모델로 변환한다", () => {
    expect(toOrderItemView(createOrderItemDTO({ type: "token" }))).toEqual(
      expect.objectContaining({
        type: "token",
        appliedCoupon: undefined,
      }),
    );
  });

  it("reform 타입 DTO를 view 모델로 변환한다", () => {
    expect(toOrderItemView(createOrderItemDTO({ type: "reform" }))).toEqual(
      expect.objectContaining({
        type: "reform",
        reformData: expect.objectContaining({
          tie: expect.objectContaining({ id: "tie-1" }),
        }),
        appliedCoupon: undefined,
      }),
    );
  });
});

describe("단순 변환 함수", () => {
  it("상품/옵션 DTO와 View를 상호 변환한다", () => {
    const product = createProduct();
    const option = createProductOption();

    expect(toProductOptionView(option)).toEqual(option);
    expect(toProductOptionDTO(option)).toEqual(option);
    expect(toProductView(product)).toEqual(product);
    expect(toProductDTO(product)).toEqual(product);
  });

  it("쿠폰 DTO와 View를 상호 변환한다", () => {
    const appliedCoupon = createAppliedCoupon();

    expect(toCouponView(appliedCoupon.coupon)).toEqual(appliedCoupon.coupon);
    expect(toCouponDTO(appliedCoupon.coupon)).toEqual(appliedCoupon.coupon);
    expect(toAppliedCouponView(appliedCoupon)).toEqual(appliedCoupon);
    expect(toAppliedCouponDTO(appliedCoupon)).toEqual(appliedCoupon);
    expect(toAppliedCouponView()).toBeUndefined();
    expect(toAppliedCouponDTO()).toBeUndefined();
  });

  it("수선 타이 DTO와 View를 상호 변환하고 checked는 DTO에서 제거한다", () => {
    const tie = {
      id: "tie-1",
      image: "image.jpg",
      fileId: "file-1",
      measurementType: "length" as const,
      tieLength: 145,
      wearerHeight: undefined,
      notes: "메모",
      checked: true,
      hasLengthReform: true,
      hasWidthReform: true,
      targetWidth: 9,
    };

    expect(toTieItemView(tie)).toEqual(tie);
    expect(toTieItemDTO(tie)).toEqual({
      id: "tie-1",
      image: "image.jpg",
      fileId: "file-1",
      measurementType: "length",
      tieLength: 145,
      wearerHeight: undefined,
      notes: "메모",
      hasLengthReform: true,
      hasWidthReform: true,
      targetWidth: 9,
    });
  });
});

describe("parseCustomOrderData", () => {
  it("유효한 raw 데이터를 DTO로 변환한다", () => {
    expect(
      parseCustomOrderData({
        options: {
          tie_type: "3fold",
          interlining: "wool",
          design_type: "classic",
          fabric_type: "silk",
          fabric_provided: true,
          triangle_stitch: true,
          side_stitch: false,
          bar_tack: true,
          dimple: true,
          spoderato: false,
          fold7: false,
          brand_label: true,
          care_label: false,
        },
        pricing: {
          sewing_cost: 12000,
          fabric_cost: 8000,
          total_cost: 20000,
        },
        sample: true,
        sample_type: "paper",
        reference_images: [
          { url: "https://example.com/1.jpg" },
          { url: "https://example.com/2.jpg" },
          { file_id: "ignored" },
        ],
        additional_notes: "메모",
      }),
    ).toEqual({
      options: {
        tieType: "3fold",
        interlining: "wool",
        designType: "classic",
        fabricType: "silk",
        fabricProvided: true,
        triangleStitch: true,
        sideStitch: false,
        barTack: true,
        dimple: true,
        spoderato: false,
        fold7: false,
        brandLabel: true,
        careLabel: false,
      },
      pricing: {
        sewingCost: 12000,
        fabricCost: 8000,
        totalCost: 20000,
      },
      sample: true,
      sampleType: "paper",
      referenceImageUrls: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
      ],
      additionalNotes: "메모",
    });
  });

  describe("에러 케이스", () => {
    it("options 또는 pricing이 객체가 아니면 에러를 던진다", () => {
      expect(() =>
        parseCustomOrderData({
          options: null,
          pricing: {},
        }),
      ).toThrow("custom order data 검증 실패: options 필드 오류");
    });

    it("필수 pricing 값이 빠지면 에러를 던진다", () => {
      expect(() =>
        parseCustomOrderData({
          options: {},
          pricing: {
            sewing_cost: 12000,
            fabric_cost: 8000,
          },
        }),
      ).toThrow("custom order data 검증 실패: pricing.total_cost 필드 오류");
    });
  });
});

describe("parseSampleOrderData", () => {
  it("유효한 raw 데이터를 DTO로 변환한다", () => {
    expect(
      parseSampleOrderData({
        sample_type: "fabric",
        options: {
          fabric_type: "silk",
          design_type: "classic",
          tie_type: "3fold",
          interlining: "wool",
        },
        pricing: { total_cost: 5000 },
        reference_images: [
          { url: "https://example.com/1.jpg" },
          { file_id: "ignored" },
        ],
        additional_notes: "샘플 메모",
      }),
    ).toEqual({
      sampleType: "fabric",
      options: {
        fabricType: "silk",
        designType: "classic",
        tieType: "3fold",
        interlining: "wool",
      },
      pricing: { totalCost: 5000 },
      referenceImageUrls: ["https://example.com/1.jpg"],
      additionalNotes: "샘플 메모",
    });
  });

  it("options가 객체가 아니면 빈 객체로 처리한다", () => {
    expect(
      parseSampleOrderData({
        sample_type: "sewing",
        options: "invalid",
        pricing: { total_cost: 3000 },
      }),
    ).toEqual(
      expect.objectContaining({
        sampleType: "sewing",
        options: {
          fabricType: null,
          designType: null,
          tieType: null,
          interlining: null,
        },
        pricing: { totalCost: 3000 },
      }),
    );
  });

  describe("에러 케이스", () => {
    it("sample_type이 유효하지 않으면 에러를 던진다", () => {
      expect(() =>
        parseSampleOrderData({
          sample_type: "invalid",
          pricing: { total_cost: 5000 },
        }),
      ).toThrow("sample order data 검증 실패: sample_type 필드 오류");
    });

    it("total_cost가 숫자가 아니면 에러를 던진다", () => {
      expect(() =>
        parseSampleOrderData({
          sample_type: "fabric",
          pricing: { total_cost: "5000" },
        }),
      ).toThrow("sample order data 검증 실패: pricing.total_cost 필드 오류");
    });

    it("fabric 계열 샘플에 design_type이 없으면 에러를 던진다", () => {
      expect(() =>
        parseSampleOrderData({
          sample_type: "fabric",
          options: {
            fabric_type: "silk",
          },
          pricing: { total_cost: 5000 },
        }),
      ).toThrow(
        "sample order data 검증 실패: fabric/fabric_and_sewing 샘플은 options.design_type이 필요합니다",
      );
    });
  });
});
