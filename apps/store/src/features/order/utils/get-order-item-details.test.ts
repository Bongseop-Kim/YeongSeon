import { describe, it, expect } from "vitest";
import {
  createProductOrderItem,
  createReformOrderItem,
  createProduct,
  createProductOption,
} from "@/test/fixtures";
import { getOrderItemDetails } from "./get-order-item-details";

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
