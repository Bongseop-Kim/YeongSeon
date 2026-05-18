import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { PricingConfig } from "@/entities/custom-order";
import type { QuoteRequestDetail } from "@yeongseon/shared";
import { QuoteRequestSpecificationCard } from "./QuoteRequestSpecificationCard";

const pricingConfig: PricingConfig = {
  START_COST: 10000,
  SEWING_PER_COST: 1000,
  AUTO_TIE_COST: 500,
  TRIANGLE_STITCH_COST: 100,
  SIDE_STITCH_COST: 100,
  BAR_TACK_COST: 100,
  DIMPLE_COST: 100,
  SPODERATO_COST: 100,
  FOLD7_COST: 100,
  WOOL_INTERLINING_COST: 300,
  BRAND_LABEL_COST: 50,
  CARE_LABEL_COST: 50,
  YARN_DYED_DESIGN_COST: 10000,
  FABRIC_QTY_ADULT: 4,
  FABRIC_QTY_ADULT_FOLD7: 2,
  FABRIC_QTY_CHILD: 5,
  FABRIC_COST: {
    YARN_DYED: { SILK: 400, POLY: 300 },
    PRINTING: { SILK: 300, POLY: 200 },
  },
  SAMPLE_SEWING_COST: 0,
  SAMPLE_FABRIC_PRINTING_COST: 0,
  SAMPLE_FABRIC_YARN_DYED_COST: 0,
  SAMPLE_FABRIC_AND_SEWING_PRINTING_COST: 0,
  SAMPLE_FABRIC_AND_SEWING_YARN_DYED_COST: 0,
  REFORM_SHIPPING_COST: 0,
};

const quoteRequest: QuoteRequestDetail = {
  id: "quote-1",
  quoteNumber: "Q-001",
  date: "2026-05-18",
  status: "요청",
  quantity: 100,
  options: {
    fabricProvided: false,
    reorder: false,
    fabricType: "POLY",
    designType: "PRINTING",
    tieType: null,
    interlining: "WOOL",
    interliningThickness: "THICK",
    sizeType: "ADULT",
    tieWidth: 8,
    triangleStitch: false,
    sideStitch: false,
    barTack: false,
    dimple: false,
    spoderato: false,
    fold7: false,
    brandLabel: false,
    careLabel: false,
  },
  referenceImageUrls: ["https://example.com/ref.jpg"],
  additionalNotes: "로고 색상 확인 필요",
  contactName: "김봉섭",
  businessName: "영선산업",
  contactMethod: "phone",
  contactValue: "010-0000-0000",
  quotedAmount: null,
  quoteConditions: null,
};

describe("QuoteRequestSpecificationCard", () => {
  it("renders an estimated amount with pending quote status when quoted amount is absent", () => {
    render(
      <QuoteRequestSpecificationCard
        quoteRequest={quoteRequest}
        pricingConfig={pricingConfig}
      />,
    );

    const card = screen.getByTestId("quote-request-specification");
    expect(
      within(card).getByRole("heading", { name: "주문 사양 확인" }),
    ).toBeVisible();
    expect(within(card).getByText("김봉섭 귀하")).toBeVisible();
    expect(within(card).getByText("예상 금액 (견적대기)")).toBeVisible();
    expect(within(card).getByText("₩145,000")).toBeVisible();
    expect(within(card).getByText("1,450원")).toBeVisible();
    expect(within(card).getByText("참고 이미지")).toBeVisible();
    expect(within(card).getByText("1개 첨부")).toBeVisible();
    expect(within(card).getByText("추가 메모")).toBeVisible();
    expect(within(card).getByText("로고 색상 확인 필요")).toBeVisible();
  });

  it("renders the server quoted amount when it exists", () => {
    render(
      <QuoteRequestSpecificationCard
        quoteRequest={{
          ...quoteRequest,
          status: "견적발송",
          quotedAmount: 200000,
        }}
        pricingConfig={pricingConfig}
      />,
    );

    const card = screen.getByTestId("quote-request-specification");
    expect(within(card).getByText("견적 금액")).toBeVisible();
    expect(within(card).getByText("₩200,000")).toBeVisible();
    expect(within(card).getByText("2,000원")).toBeVisible();
    expect(
      within(card).queryByText("예상 금액 (견적대기)"),
    ).not.toBeInTheDocument();
  });
});
