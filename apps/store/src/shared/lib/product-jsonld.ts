// 상품 상세 페이지의 schema.org Product JSON-LD를 생성한다.
// 구글 검색의 "판매자 등록정보"(merchant listing) 가이드를 따른다:
// https://developers.google.com/search/docs/appearance/structured-data/merchant-listing

// 배송 정책: sale 주문은 서버(create_order RPC)에서 shipping_cost=0으로 생성되어
// 본토 기준 항상 무료배송이다. 구조화 데이터는 실제 결제 금액과 일치해야 하므로 0원으로 표기한다.
const SHIPPING_DETAILS = {
  "@type": "OfferShippingDetails",
  shippingRate: {
    "@type": "MonetaryAmount",
    value: 0,
    currency: "KRW",
  },
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "KR",
  },
  deliveryTime: {
    "@type": "ShippingDeliveryTime",
    handlingTime: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 2,
      unitCode: "DAY",
    },
    transitTime: {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 3,
      unitCode: "DAY",
    },
  },
} as const;

// 반품 정책: 환불정책 페이지(refund-policy) 기준 — 수령일로부터 7일 이내,
// 단순 변심 시 반품 배송비는 고객 부담.
const MERCHANT_RETURN_POLICY = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: "KR",
  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
  merchantReturnDays: 7,
  returnMethod: "https://schema.org/ReturnByMail",
  returnFees: "https://schema.org/ReturnShippingFeesCustomerResponsibility",
} as const;

export interface ProductJsonLdInput {
  name: string;
  image: string;
  description: string;
  sku: string;
  price: number;
  url: string;
  isSoldOut: boolean;
}

// aggregateRating / review는 의도적으로 포함하지 않는다.
// 현재 리뷰 기능이 미구현이라 실제 평점·후기 데이터가 없으며,
// 가짜 평점을 넣는 것은 구글 구조화 데이터 정책 위반(수동 조치 위험)이다.
// 리뷰 기능 구축 후 실제 데이터로 추가해야 한다.
export const buildProductJsonLd = ({
  name,
  image,
  description,
  sku,
  price,
  url,
  isSoldOut,
}: ProductJsonLdInput) => ({
  "@context": "https://schema.org/",
  "@type": "Product",
  name,
  image,
  description,
  sku,
  brand: {
    "@type": "Brand",
    name: "ESSE SION",
  },
  offers: {
    "@type": "Offer",
    url,
    priceCurrency: "KRW",
    price,
    itemCondition: "https://schema.org/NewCondition",
    availability: isSoldOut
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock",
    seller: {
      "@type": "Organization",
      name: "영선산업",
    },
    shippingDetails: SHIPPING_DETAILS,
    hasMerchantReturnPolicy: MERCHANT_RETURN_POLICY,
  },
});
