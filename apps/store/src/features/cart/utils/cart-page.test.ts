import { describe, it, expect } from "vitest";
import { createCartItem, createProduct } from "@/test/fixtures";
import type { Product } from "@/features/shop/types/view/product";
import { getSelectedCartItems, getRecommendedProducts } from "./cart-page";

describe("getSelectedCartItems", () => {
  it("선택된 ID에 해당하는 아이템만 반환한다", () => {
    const items = [
      createCartItem({ id: "a" }),
      createCartItem({ id: "b" }),
      createCartItem({ id: "c" }),
    ];
    const result = getSelectedCartItems(items, ["a", "c"]);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("선택 ID가 비어 있으면 빈 배열을 반환한다", () => {
    const items = [createCartItem({ id: "a" })];
    expect(getSelectedCartItems(items, [])).toHaveLength(0);
  });
});

describe("getRecommendedProducts", () => {
  const catalog: Product[] = [
    createProduct({ id: 10, category: "3fold", color: "navy", pattern: "stripe", material: "cotton" }),
    createProduct({ id: 20, category: "knit", color: "wine", pattern: "dot", material: "wool" }),
    createProduct({ id: 30, category: "3fold", color: "gray", pattern: "check", material: "polyester" }),
  ];

  it("카트가 비어 있으면 빈 배열을 반환한다", () => {
    expect(getRecommendedProducts([], catalog, 5)).toHaveLength(0);
  });

  it("카테고리가 매칭되는 상품을 추천한다", () => {
    const items = [createCartItem({ product: createProduct({ id: 1, category: "3fold" }) })];
    const result = getRecommendedProducts(items, catalog, 10);
    expect(result.some((p) => p.id === 10)).toBe(true);
    expect(result.some((p) => p.id === 30)).toBe(true);
  });

  it("limit을 초과하지 않는다", () => {
    const items = [createCartItem({ product: createProduct({ id: 1, category: "3fold" }) })];
    const result = getRecommendedProducts(items, catalog, 1);
    expect(result).toHaveLength(1);
  });
});
