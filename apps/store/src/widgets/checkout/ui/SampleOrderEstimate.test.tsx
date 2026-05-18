import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SampleOrderEstimate } from "./SampleOrderEstimate";

const baseOptions = {
  fabricType: "POLY" as const,
  designType: "PRINTING" as const,
  tieType: "AUTO" as const,
  interlining: "WOOL" as const,
};

describe("SampleOrderEstimate", () => {
  it("renders sample order details as an order specification confirmation", () => {
    render(
      <SampleOrderEstimate
        recipientName="김봉섭"
        sampleLabel="원단 + 봉제 샘플"
        fabricLabel="폴리 · 납염"
        options={baseOptions}
        imageRefs={[
          { fileId: "sample-image-1", url: "https://example.com/1.png" },
        ]}
        totalCost={58000}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "주문 사양 확인" }),
    ).toBeVisible();

    const estimate = screen.getByTestId("sample-order-estimate");
    expect(within(estimate).getByText("김봉섭 귀하")).toBeVisible();
    expect(within(estimate).getByText("영선산업 | 305-26-32033")).toBeVisible();
    expect(within(estimate).getByText("제작 품목")).toBeVisible();
    expect(within(estimate).getByText("샘플 넥타이")).toBeVisible();
    expect(within(estimate).getByText("샘플 유형")).toBeVisible();
    expect(within(estimate).getByText("원단 + 봉제 샘플")).toBeVisible();
    expect(within(estimate).getByText("원단 조합")).toBeVisible();
    expect(within(estimate).getByText("폴리 · 납염")).toBeVisible();
    expect(within(estimate).getByText("타이 방식")).toBeVisible();
    expect(within(estimate).getByText("자동 타이")).toBeVisible();
    expect(within(estimate).getByText("심지")).toBeVisible();
    expect(within(estimate).getByText("울 심지")).toBeVisible();
    expect(within(estimate).getByText("참고 이미지")).toBeVisible();
    expect(within(estimate).getByText("1개 첨부")).toBeVisible();
    expect(within(estimate).getByText("단가")).toBeVisible();
    expect(within(estimate).getByText("58,000원")).toBeVisible();
    expect(within(estimate).getByText("₩58,000")).toBeVisible();
  });

  it("renders sewing-only sample orders without fabric options", () => {
    render(
      <SampleOrderEstimate
        recipientName=""
        sampleLabel="봉제 샘플"
        fabricLabel="봉제 전용"
        options={{
          fabricType: null,
          designType: null,
          tieType: null,
          interlining: "POLY",
        }}
        imageRefs={[]}
        totalCost={32000}
      />,
    );

    const estimate = screen.getByTestId("sample-order-estimate");
    expect(within(estimate).getByText("고객 귀하")).toBeVisible();
    expect(within(estimate).getByText("봉제 전용")).toBeVisible();
    expect(within(estimate).getByText("수동 타이")).toBeVisible();
    expect(within(estimate).getByText("폴리 심지")).toBeVisible();
    expect(within(estimate).getByText("첨부 없음")).toBeVisible();
    expect(within(estimate).getByText("₩32,000")).toBeVisible();
  });
});
