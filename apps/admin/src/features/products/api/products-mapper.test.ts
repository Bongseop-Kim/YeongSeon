import { describe, expect, it } from "vitest";
import {
  fromAdminProductOption,
  toAdminProductListItem,
  toAdminProductOption,
} from "@/features/products/api/products-mapper";
import {
  createProductOptionRow,
  createProductsTableRow,
} from "@/test/fixtures";

describe("toAdminProductListItem", () => {
  it("DTO를 UI 모델로 변환한다", () => {
    expect(toAdminProductListItem(createProductsTableRow())).toEqual(
      expect.objectContaining({
        id: 1,
        image: "https://example.com/tie.jpg",
        code: "P001",
        name: "테스트 넥타이",
        category: "3fold",
        color: "navy",
        material: "silk",
        price: 39000,
        stock: 12,
      }),
    );
  });
});

describe("toAdminProductOption", () => {
  it("DTO를 UI 모델로 변환한다", () => {
    expect(toAdminProductOption(createProductOptionRow())).toEqual(
      expect.objectContaining({
        name: "기본 옵션",
        additionalPrice: 5000,
        stock: 3,
      }),
    );
  });

  it("name이 null이면 빈 문자열로 폴백한다", () => {
    expect(
      toAdminProductOption({
        ...createProductOptionRow(),
        name: null,
      }),
    ).toEqual(
      expect.objectContaining({
        name: "",
      }),
    );
  });

  it("additional_price가 null이면 0으로 폴백한다", () => {
    expect(
      toAdminProductOption({
        ...createProductOptionRow(),
        additional_price: null,
      }),
    ).toEqual(
      expect.objectContaining({
        additionalPrice: 0,
      }),
    );
  });
});

describe("fromAdminProductOption", () => {
  it("UI 모델을 DTO로 역변환한다", () => {
    expect(
      fromAdminProductOption(
        {
          name: "고급 옵션",
          additionalPrice: 7000,
          stock: 5,
        },
        10,
      ),
    ).toEqual({
      product_id: 10,
      name: "고급 옵션",
      additional_price: 7000,
      stock: 5,
    });
  });

  it("productId를 product_id로 설정한다", () => {
    expect(
      fromAdminProductOption(
        {
          name: "기본 옵션",
          additionalPrice: 0,
          stock: null,
        },
        99,
      ),
    ).toEqual(
      expect.objectContaining({
        product_id: 99,
      }),
    );
  });
});
