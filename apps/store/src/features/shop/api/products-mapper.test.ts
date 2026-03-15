import { describe, expect, it } from "vitest";
import type { ProductDTO } from "@yeongseon/shared/types/dto/product";
import { toProduct, toProducts } from "@/features/shop/api/products-mapper";

const record: ProductDTO = {
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
};

describe("products-mapper", () => {
  it("단일 상품 DTO를 view로 변환한다", () => {
    expect(toProduct(record)).toEqual(expect.objectContaining({ id: 1 }));
  });

  it("상품 배열 DTO를 view 배열로 변환한다", () => {
    expect(toProducts([record, { ...record, id: 2, code: "P002" }])).toEqual([
      expect.objectContaining({ id: 1 }),
      expect.objectContaining({ id: 2 }),
    ]);
  });
});
