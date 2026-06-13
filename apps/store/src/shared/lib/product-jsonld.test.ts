import { buildProductJsonLd } from "@/shared/lib/product-jsonld";

const baseInput = {
  name: "테스트 상품",
  image: "https://example.com/product.jpg",
  description: "상품 설명",
  sku: "SKU-001",
  price: 30000,
  url: "https://essesion.shop/shop/26",
  isSoldOut: false,
};

describe("buildProductJsonLd", () => {
  it("offers에 shippingDetails를 포함한다", () => {
    const result = buildProductJsonLd(baseInput);

    expect(result.offers.shippingDetails["@type"]).toBe("OfferShippingDetails");
    expect(result.offers.shippingDetails.shippingRate.value).toBe(0);
    expect(
      result.offers.shippingDetails.shippingDestination.addressCountry,
    ).toBe("KR");
  });

  it("offers에 hasMerchantReturnPolicy를 포함한다", () => {
    const result = buildProductJsonLd(baseInput);

    expect(result.offers.hasMerchantReturnPolicy["@type"]).toBe(
      "MerchantReturnPolicy",
    );
    expect(result.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(7);
    expect(result.offers.hasMerchantReturnPolicy.applicableCountry).toBe("KR");
  });

  it("offers에 itemCondition을 포함한다", () => {
    const result = buildProductJsonLd(baseInput);

    expect(result.offers.itemCondition).toBe("https://schema.org/NewCondition");
  });

  it("재고가 있으면 InStock으로 표기한다", () => {
    const result = buildProductJsonLd({ ...baseInput, isSoldOut: false });

    expect(result.offers.availability).toBe("https://schema.org/InStock");
  });

  it("품절이면 OutOfStock으로 표기한다", () => {
    const result = buildProductJsonLd({ ...baseInput, isSoldOut: true });

    expect(result.offers.availability).toBe("https://schema.org/OutOfStock");
  });

  // 리뷰 기능 미구현 — 가짜 평점은 구글 정책 위반이므로 포함하지 않는다(회귀 방지).
  it("aggregateRating과 review는 포함하지 않는다", () => {
    const result = buildProductJsonLd(baseInput);

    expect(result).not.toHaveProperty("aggregateRating");
    expect(result).not.toHaveProperty("review");
  });
});
