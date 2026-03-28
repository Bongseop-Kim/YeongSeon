import { describe, expect, it } from "vitest";
import {
  toCreateCustomOrderInput,
  toCreateCustomOrderInputDto,
  toCreateCustomOrderOptionsInput,
} from "@/features/custom-order/api/custom-order-mapper";

describe("toCreateCustomOrderOptionsInput", () => {
  it("유효한 enum/boolean/number 값을 정규화한다", () => {
    expect(
      toCreateCustomOrderOptionsInput({
        fabricProvided: true,
        reorder: false,
        fabricType: "SILK",
        designType: "PRINTING",
        tieType: "AUTO",
        interlining: "WOOL",
        interliningThickness: "THICK",
        sizeType: "ADULT",
        tieWidth: 8.5,
        triangleStitch: true,
        sideStitch: false,
        barTack: true,
        fold7: false,
        dimple: true,
        spoderato: false,
        brandLabel: true,
        careLabel: false,
        quantity: 10,
      }),
    ).toEqual({
      fabricProvided: true,
      reorder: false,
      fabricType: "SILK",
      designType: "PRINTING",
      tieType: "AUTO",
      interlining: "WOOL",
      interliningThickness: "THICK",
      sizeType: "ADULT",
      tieWidth: 8.5,
      triangleStitch: true,
      sideStitch: false,
      barTack: true,
      fold7: false,
      dimple: true,
      spoderato: false,
      brandLabel: true,
      careLabel: false,
    });
  });

  it("잘못된 enum은 null로, 잘못된 tieWidth는 기본값 8로 정규화한다", () => {
    expect(
      toCreateCustomOrderOptionsInput({
        fabricProvided: "yes" as never,
        reorder: 1 as never,
        fabricType: "COTTON" as never,
        designType: "DIGITAL" as never,
        tieType: "MANUAL" as never,
        interlining: "POLY" as never,
        interliningThickness: "MID" as never,
        sizeType: "KID" as never,
        tieWidth: Number.NaN,
        triangleStitch: 1 as never,
        sideStitch: null as never,
        barTack: undefined as never,
        fold7: "true" as never,
        dimple: 0 as never,
        spoderato: "false" as never,
        brandLabel: null as never,
        careLabel: undefined as never,
        quantity: 10,
      }),
    ).toEqual({
      fabricProvided: false,
      reorder: false,
      fabricType: null,
      designType: null,
      tieType: null,
      interlining: null,
      interliningThickness: null,
      sizeType: null,
      tieWidth: 8,
      triangleStitch: false,
      sideStitch: false,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,
      brandLabel: false,
      careLabel: false,
    });
  });
});

describe("toCreateCustomOrderInput / toCreateCustomOrderInputDto — 쿠폰", () => {
  const baseInput = {
    shippingAddressId: "addr-1",
    options: {
      fabricProvided: false,
      reorder: false,
      fabricType: "SILK" as const,
      designType: "PRINTING" as const,
      tieType: "AUTO" as const,
      interlining: "WOOL" as const,
      interliningThickness: "THICK" as const,
      sizeType: "ADULT" as const,
      tieWidth: 8,
      triangleStitch: false,
      sideStitch: false,
      barTack: false,
      fold7: false,
      dimple: false,
      spoderato: false,
      brandLabel: false,
      careLabel: false,
      quantity: 5,
    },
    referenceImages: [],
    additionalNotes: "",
  };

  it("userCouponId가 주어지면 request와 DTO에 포함된다", () => {
    const request = toCreateCustomOrderInput({
      ...baseInput,
      userCouponId: "coupon-uuid-1",
    });
    expect(request.userCouponId).toBe("coupon-uuid-1");

    const dto = toCreateCustomOrderInputDto(request);
    expect(dto.user_coupon_id).toBe("coupon-uuid-1");
  });

  it("userCouponId가 없으면 request와 DTO에 포함되지 않는다", () => {
    const request = toCreateCustomOrderInput(baseInput);
    expect(request.userCouponId).toBeUndefined();

    const dto = toCreateCustomOrderInputDto(request);
    expect(dto.user_coupon_id).toBeUndefined();
  });

  it("공백뿐인 userCouponId는 request에서 제외한다", () => {
    const request = toCreateCustomOrderInput({
      ...baseInput,
      userCouponId: "   ",
    });
    expect(request.userCouponId).toBeUndefined();

    const dto = toCreateCustomOrderInputDto(request);
    expect(dto.user_coupon_id).toBeUndefined();
  });

  it("userCouponId 앞뒤 공백을 trim해서 전달한다", () => {
    const request = toCreateCustomOrderInput({
      ...baseInput,
      userCouponId: "  coupon-uuid-1  ",
    });
    expect(request.userCouponId).toBe("coupon-uuid-1");

    const dto = toCreateCustomOrderInputDto(request);
    expect(dto.user_coupon_id).toBe("coupon-uuid-1");
  });
});

describe("toCreateCustomOrderInput / toCreateCustomOrderInputDto", () => {
  it("custom order 입력을 request와 DTO로 변환한다", () => {
    const request = toCreateCustomOrderInput({
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
        quantity: 10,
      },
      referenceImages: [
        { url: " https://example.com/1.jpg ", fileId: " file-1 " },
      ],
      additionalNotes: " 메모 ",
    });

    expect(request).toEqual(
      expect.objectContaining({
        quantity: 10,
        additionalNotes: "메모",
      }),
    );
    expect(toCreateCustomOrderInputDto(request)).toEqual(
      expect.objectContaining({
        shipping_address_id: "addr-1",
        reference_images: [
          { url: "https://example.com/1.jpg", file_id: "file-1" },
        ],
      }),
    );
  });
});
