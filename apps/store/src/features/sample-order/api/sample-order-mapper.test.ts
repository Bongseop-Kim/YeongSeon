import { describe, expect, it } from "vitest";
import {
  toCreateSampleOrderInput,
  toCreateSampleOrderInputDto,
  parseSampleOrderResponse,
} from "@/features/sample-order/api/sample-order-mapper";
import type {
  CreateSampleOrderRequest,
  SampleOrderOptionsDto,
} from "@/features/sample-order/types/sample-order-input";

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

describe("parseSampleOrderResponse", () => {
  it("유효한 응답에서 orderId와 orderNumber를 반환한다", () => {
    const result = parseSampleOrderResponse({
      order_id: "order-uuid-1",
      order_number: "SAMPLE-001",
    });
    expect(result).toEqual({
      orderId: "order-uuid-1",
      orderNumber: "SAMPLE-001",
    });
  });

  it("객체가 아닌 값이면 에러를 던진다", () => {
    expect(() => parseSampleOrderResponse(null)).toThrow("객체가 아닙니다");
    expect(() => parseSampleOrderResponse("string")).toThrow("객체가 아닙니다");
    expect(() => parseSampleOrderResponse([1, 2])).toThrow("객체가 아닙니다");
  });

  it("order_id가 누락되거나 빈 문자열이면 에러를 던진다", () => {
    expect(() =>
      parseSampleOrderResponse({ order_number: "SAMPLE-001" }),
    ).toThrow("order_id");
    expect(() =>
      parseSampleOrderResponse({ order_id: "", order_number: "SAMPLE-001" }),
    ).toThrow("order_id");
  });

  it("order_number가 누락되거나 빈 문자열이면 에러를 던진다", () => {
    expect(() =>
      parseSampleOrderResponse({ order_id: "order-uuid-1" }),
    ).toThrow("order_number");
    expect(() =>
      parseSampleOrderResponse({ order_id: "order-uuid-1", order_number: "" }),
    ).toThrow("order_number");
  });
});
