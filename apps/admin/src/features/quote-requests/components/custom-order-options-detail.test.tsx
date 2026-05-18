import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomOrderOptionsDetail } from "./custom-order-options-detail";
import type { QuoteRequestOptions } from "@/features/quote-requests/types/admin-quote-request";

const options: QuoteRequestOptions = {
  tieType: "3fold",
  interlining: "wool",
  designType: "printing",
  fabricType: "poly",
  fabricProvided: false,
  interliningThickness: "thick",
  triangleStitch: false,
  sideStitch: false,
  barTack: false,
  dimple: true,
  spoderato: false,
  fold7: false,
  brandLabel: false,
  careLabel: false,
};

describe("CustomOrderOptionsDetail", () => {
  it("renders quote request options as an order specification confirmation", () => {
    render(
      <CustomOrderOptionsDetail
        options={options}
        quantity={4}
        quotedAmount={138000}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "주문 사양 확인" }),
    ).toBeVisible();

    const section = screen.getByTestId("admin-custom-order-specification");
    expect(within(section).getByText("제작 품목")).toBeVisible();
    expect(within(section).getByText("맞춤 제작 넥타이")).toBeVisible();
    expect(within(section).getByText("수량")).toBeVisible();
    expect(within(section).getByText("4개")).toBeVisible();
    expect(within(section).getByText("단가")).toBeVisible();
    expect(within(section).getByText("34,500원")).toBeVisible();
    expect(within(section).getByText("견적 금액")).toBeVisible();
    expect(within(section).getByText("138,000원")).toBeVisible();
    expect(within(section).getByText("제작 옵션")).toBeVisible();
    expect(within(section).getByText("폴리 · 날염")).toBeVisible();
    expect(within(section).getByText("3폴드 · 딤플")).toBeVisible();
    expect(within(section).getByText("울 심지")).toBeVisible();
    expect(within(section).getByText("라벨 없음")).toBeVisible();
    expect(within(section).queryByText("심지 두께")).not.toBeInTheDocument();
    expect(within(section).queryByText("두꺼움")).not.toBeInTheDocument();
    expect(within(section).queryByText("thick")).not.toBeInTheDocument();
  });
});
