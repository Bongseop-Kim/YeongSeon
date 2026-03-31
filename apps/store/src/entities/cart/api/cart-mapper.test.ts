import { describe, expect, it } from "vitest";
import {
  toCartItemInputDTO,
  toCartItemView,
} from "@/entities/cart/api/cart-mapper";
import {
  createAppliedCoupon,
  createCartItem,
  createCoupon,
  createProduct,
  createProductOption,
  createReformCartItem,
} from "@/test/fixtures";

describe("toCartItemView", () => {
  it("product 장바구니 항목을 view로 변환한다", () => {
    expect(
      toCartItemView({
        id: "item-1",
        type: "product",
        product: {
          id: 1,
          code: "P001",
          name: "테스트 넥타이",
          price: 10000,
          image: "image.jpg",
          category: "3fold",
          color: "black",
          pattern: "solid",
          material: "silk",
          likes: 0,
          info: "테스트 상품",
        },
        selectedOption: {
          id: "opt-1",
          name: "기본",
          additionalPrice: 500,
        },
        quantity: 2,
        reformData: null,
        appliedCoupon: {
          id: "uc-1",
          userId: "user-1",
          couponId: "coupon-1",
          status: "active",
          issuedAt: "2026-03-15",
          expiresAt: null,
          usedAt: null,
          coupon: {
            id: "coupon-1",
            name: "500원 할인",
            discountType: "fixed",
            discountValue: 500,
            maxDiscountAmount: null,
            description: null,
            expiryDate: "2027-01-01",
            additionalInfo: null,
          },
        },
      }),
    ).toEqual(
      expect.objectContaining({
        type: "product",
        quantity: 2,
        selectedOption: expect.objectContaining({ id: "opt-1" }),
        appliedCoupon: expect.objectContaining({
          coupon: expect.objectContaining({ discountValue: 500 }),
        }),
      }),
    );
  });

  it("reform 장바구니 항목을 view로 변환한다", () => {
    expect(
      toCartItemView({
        id: "item-2",
        type: "reform",
        product: null,
        selectedOption: null,
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-1",
            image: "image.jpg",
            measurementType: "length",
            tieLength: 145,
          },
          cost: 15000,
        },
        appliedCoupon: undefined,
      }),
    ).toEqual(
      expect.objectContaining({
        type: "reform",
        reformData: expect.objectContaining({
          cost: 15000,
          tie: expect.objectContaining({ id: "tie-1" }),
        }),
      }),
    );
  });

  it("reform 장바구니 항목의 tie.image를 문자열이 아니면 제거한다", () => {
    expect(
      toCartItemView({
        id: "item-2",
        type: "reform",
        product: null,
        selectedOption: null,
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-1",
            image: 123 as unknown as string,
            measurementType: "length",
            tieLength: 145,
          },
          cost: 15000,
        },
        appliedCoupon: undefined,
      }),
    ).toEqual(
      expect.objectContaining({
        reformData: expect.objectContaining({
          tie: expect.objectContaining({
            id: "tie-1",
            image: undefined,
          }),
        }),
      }),
    );
  });

  it("product 타입에서 product가 없으면 에러를 던진다", () => {
    expect(() =>
      toCartItemView({
        id: "item-1",
        type: "product",
        product: null,
        selectedOption: null,
        quantity: 1,
        reformData: null,
        appliedCoupon: undefined,
      }),
    ).toThrow("Product data is required for product cart items.");
  });

  it("reform 타입에서 reformData가 없으면 에러를 던진다", () => {
    expect(() =>
      toCartItemView({
        id: "item-2",
        type: "reform",
        product: null,
        selectedOption: null,
        quantity: 1,
        reformData: null,
        appliedCoupon: undefined,
      }),
    ).toThrow("Reform data is required for reform cart items.");
  });
});

describe("toCartItemInputDTO", () => {
  it("product 장바구니 항목을 DTO로 변환한다", () => {
    const item = createCartItem({
      product: createProduct(),
      selectedOption: createProductOption({ additionalPrice: 500 }),
      appliedCoupon: createAppliedCoupon({
        coupon: createCoupon({ discountValue: 500 }),
      }),
      quantity: 2,
    });

    expect(toCartItemInputDTO(item)).toEqual(
      expect.objectContaining({
        type: "product",
        quantity: 2,
        selectedOption: expect.objectContaining({ id: "opt-1" }),
        appliedCouponId: "uc-1",
      }),
    );
  });

  it("reform 장바구니 항목을 DTO로 변환한다", () => {
    const item = createReformCartItem();

    expect(toCartItemInputDTO(item)).toEqual(
      expect.objectContaining({
        type: "reform",
        product: null,
        selectedOption: null,
        reformData: expect.objectContaining({
          cost: 15000,
          tie: expect.objectContaining({ id: "tie-1" }),
        }),
      }),
    );
  });
});
