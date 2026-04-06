import { describe, expect, it } from "vitest";
import {
  toCreateSampleOrderInput,
  toCreateSampleOrderInputDto,
  parseSampleOrderResponse,
} from "@/entities/sample-order";
import type {
  CreateSampleOrderRequest,
  SampleOrderOptionsDto,
} from "@/entities/sample-order";

const baseOptions: SampleOrderOptionsDto = {
  fabricType: "SILK",
  designType: "PRINTING",
  tieType: "AUTO",
  interlining: "WOOL",
};

const baseRequest: CreateSampleOrderRequest = {
  shippingAddressId: "addr-1",
  sampleType: "fabric",
  options: baseOptions,
  referenceImages: [{ url: "https://example.com/img.jpg", fileId: "fid-1" }],
  additionalNotes: "메모",
};

describe("toCreateSampleOrderInput", () => {
  it("additionalNotes를 trim한다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      additionalNotes: "  앞뒤 공백  ",
    });
    expect(result.additionalNotes).toBe("앞뒤 공백");
  });

  it("중복 이미지 URL을 정규화한다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      referenceImages: [
        { url: "https://example.com/img.jpg", fileId: "fid-1" },
        { url: "https://example.com/img.jpg", fileId: "fid-2" },
      ],
    });
    expect(result.referenceImages).toHaveLength(1);
    expect(result.referenceImages[0].fileId).toBe("fid-1");
  });

  it("빈 URL 이미지를 제거한다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      referenceImages: [
        { url: "", fileId: "fid-1" },
        { url: "https://example.com/img.jpg", fileId: "fid-2" },
      ],
    });
    expect(result.referenceImages).toHaveLength(1);
  });

  it("나머지 필드를 그대로 전달한다", () => {
    const result = toCreateSampleOrderInput(baseRequest);
    expect(result.shippingAddressId).toBe("addr-1");
    expect(result.sampleType).toBe("fabric");
    expect(result.options).toEqual(baseOptions);
  });
});

describe("toCreateSampleOrderInputDto", () => {
  it("camelCase 필드를 snake_case DTO로 변환한다", () => {
    const dto = toCreateSampleOrderInputDto(baseRequest);
    expect(dto.shipping_address_id).toBe("addr-1");
    expect(dto.sample_type).toBe("fabric");
    expect(dto.additional_notes).toBe("메모");
  });

  it("options를 snake_case로 변환한다", () => {
    const dto = toCreateSampleOrderInputDto(baseRequest);
    expect(dto.options).toEqual({
      fabric_type: "SILK",
      design_type: "PRINTING",
      tie_type: "AUTO",
      interlining: "WOOL",
    });
  });

  it("referenceImages를 DbImageRef 배열로 변환한다", () => {
    const dto = toCreateSampleOrderInputDto(baseRequest);
    expect(dto.reference_images).toEqual([
      { url: "https://example.com/img.jpg", file_id: "fid-1" },
    ]);
  });

  it("options null 값을 그대로 전달한다", () => {
    const dto = toCreateSampleOrderInputDto({
      ...baseRequest,
      options: {
        fabricType: null,
        designType: null,
        tieType: null,
        interlining: null,
      },
    });
    expect(dto.options).toEqual({
      fabric_type: null,
      design_type: null,
      tie_type: null,
      interlining: null,
    });
  });
});

describe("toCreateSampleOrderInput / toCreateSampleOrderInputDto — 쿠폰", () => {
  it("userCouponId가 주어지면 input과 DTO에 포함된다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      userCouponId: "coupon-uuid-1",
    });
    expect(result.userCouponId).toBe("coupon-uuid-1");

    const dto = toCreateSampleOrderInputDto(result);
    expect(dto.user_coupon_id).toBe("coupon-uuid-1");
  });

  it("userCouponId가 없으면 input과 DTO에 포함되지 않는다", () => {
    const result = toCreateSampleOrderInput(baseRequest);
    expect(result.userCouponId).toBeUndefined();

    const dto = toCreateSampleOrderInputDto(result);
    expect(dto.user_coupon_id).toBeUndefined();
  });

  it("공백뿐인 userCouponId는 input과 DTO에서 제외한다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      userCouponId: "   ",
    });
    expect(result.userCouponId).toBeUndefined();

    const dto = toCreateSampleOrderInputDto({
      ...result,
      userCouponId: "   ",
    });
    expect(dto.user_coupon_id).toBeUndefined();
  });

  it("userCouponId 앞뒤 공백을 trim해서 전달한다", () => {
    const result = toCreateSampleOrderInput({
      ...baseRequest,
      userCouponId: "  coupon-uuid-1  ",
    });
    expect(result.userCouponId).toBe("coupon-uuid-1");

    const dto = toCreateSampleOrderInputDto(result);
    expect(dto.user_coupon_id).toBe("coupon-uuid-1");
  });
});

describe("parseSampleOrderResponse", () => {
  it("유효한 응답에서 orderId(payment_group_id)와 orderNumber, totalAmount를 반환한다", () => {
    const result = parseSampleOrderResponse({
      order_id: "order-uuid-1",
      payment_group_id: "pg-uuid-1",
      order_number: "SAMPLE-001",
      total_amount: 30000,
    });
    expect(result).toEqual({
      orderId: "pg-uuid-1",
      orderNumber: "SAMPLE-001",
      totalAmount: 30000,
    });
  });

  it("객체가 아닌 값이면 에러를 던진다", () => {
    expect(() => parseSampleOrderResponse(null)).toThrow("객체가 아닙니다");
    expect(() => parseSampleOrderResponse("string")).toThrow("객체가 아닙니다");
    expect(() => parseSampleOrderResponse([1, 2])).toThrow("객체가 아닙니다");
  });

  it("payment_group_id가 누락되거나 빈 문자열이면 에러를 던진다", () => {
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        order_number: "SAMPLE-001",
        total_amount: 30000,
      }),
    ).toThrow("payment_group_id");
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        payment_group_id: "",
        order_number: "SAMPLE-001",
        total_amount: 30000,
      }),
    ).toThrow("payment_group_id");
  });

  it("order_number가 누락되거나 빈 문자열이면 에러를 던진다", () => {
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        payment_group_id: "pg-uuid-1",
        total_amount: 30000,
      }),
    ).toThrow("order_number");
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        payment_group_id: "pg-uuid-1",
        order_number: "",
        total_amount: 30000,
      }),
    ).toThrow("order_number");
  });

  it("total_amount가 누락되거나 숫자가 아니면 에러를 던진다", () => {
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        payment_group_id: "pg-uuid-1",
        order_number: "SAMPLE-001",
      }),
    ).toThrow("total_amount");
    expect(() =>
      parseSampleOrderResponse({
        order_id: "order-uuid-1",
        payment_group_id: "pg-uuid-1",
        order_number: "SAMPLE-001",
        total_amount: "30000",
      }),
    ).toThrow("total_amount");
  });
});
