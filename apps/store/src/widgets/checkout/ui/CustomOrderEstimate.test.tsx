import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomOrderEstimate } from "./CustomOrderEstimate";

const baseOptions = {
  fabricProvided: false,
  reorder: false,
  fabricType: "POLY" as const,
  designType: "PRINTING" as const,
  tieType: null,
  interlining: "WOOL" as const,
  interliningThickness: "THIN" as const,
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
  quantity: 4,
};

describe("CustomOrderEstimate", () => {
  it("renders custom order details as an order specification confirmation", () => {
    render(
      <CustomOrderEstimate
        recipientName="김봉섭"
        options={baseOptions}
        imageRefs={[]}
        totalCost={138000}
        issuedAt={new Date("2026-05-17T00:00:00+09:00")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "주문 사양 확인" }),
    ).toBeVisible();
    expect(screen.getByText("김봉섭 귀하")).toBeVisible();

    const estimate = screen.getByTestId("custom-order-estimate");
    expect(within(estimate).getByText("제작 품목")).toBeVisible();
    expect(within(estimate).getByText("영선산업 | 305-26-32033")).toBeVisible();
    expect(
      within(estimate).queryByText("ESSE SION | 영선산업 | 305-26-32033"),
    ).not.toBeInTheDocument();
    expect(within(estimate).getByText("맞춤 제작 넥타이")).toBeVisible();
    expect(within(estimate).getByText("사이즈")).toBeVisible();
    expect(within(estimate).getByText("성인용")).toBeVisible();
    expect(within(estimate).getByText("폭 8cm")).toBeVisible();
    expect(within(estimate).getByText("수량")).toBeVisible();
    expect(within(estimate).getByText("4개")).toBeVisible();
    expect(within(estimate).getByText("제작 옵션")).toBeVisible();
    expect(within(estimate).getByText("단가")).toBeVisible();
    expect(within(estimate).getByText("34,500원")).toBeVisible();
    expect(within(estimate).getByText("₩138,000")).toBeVisible();
    expect(within(estimate).queryByText("견 적 서")).not.toBeInTheDocument();
    expect(within(estimate).queryByText(/No\./)).not.toBeInTheDocument();
    expect(within(estimate).queryByText("옵션 상세")).not.toBeInTheDocument();
    expect(within(estimate).queryByText("공급가액")).not.toBeInTheDocument();
    expect(within(estimate).queryByText("계")).not.toBeInTheDocument();
    expect(within(estimate).getByText("울 심지")).toBeVisible();
    expect(within(estimate).queryByText("얇음")).not.toBeInTheDocument();
    expect(within(estimate).queryByText("두꺼움")).not.toBeInTheDocument();
  });

  it("does not render a previous-page specification edit action", () => {
    render(
      <CustomOrderEstimate
        recipientName="김봉섭"
        options={baseOptions}
        imageRefs={[]}
        totalCost={138000}
        issuedAt={new Date("2026-05-17T00:00:00+09:00")}
      />,
    );

    expect(
      screen.queryByRole("button", { name: /사양 수정/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/이전 페이지에서 사양 수정/),
    ).not.toBeInTheDocument();
  });

  it("does not render estimate table headers", () => {
    render(
      <CustomOrderEstimate
        recipientName="김봉섭"
        options={baseOptions}
        imageRefs={[]}
        totalCost={138000}
        issuedAt={new Date("2026-05-17T00:00:00+09:00")}
      />,
    );

    expect(screen.queryByText("품명")).not.toBeInTheDocument();
    expect(screen.queryByText("규격")).not.toBeInTheDocument();
    expect(screen.queryByText("공급가액")).not.toBeInTheDocument();
  });
});
