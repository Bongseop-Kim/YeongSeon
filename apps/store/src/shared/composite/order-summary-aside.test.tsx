import { render, screen } from "@testing-library/react";
import { OrderSummaryAside, buildPriceRows } from "./order-summary-aside";

describe("buildPriceRows", () => {
  it("할인이 있으면 할인 행을 포함한다", () => {
    const rows = buildPriceRows({
      originalPrice: 10000,
      totalDiscount: 2000,
      shippingCost: 3000,
    });

    expect(rows).toHaveLength(3);
    expect(rows[1]?.label).toBe("할인 금액");
  });

  it("할인이 없으면 할인 행을 제외한다", () => {
    const rows = buildPriceRows({
      originalPrice: 10000,
      totalDiscount: 0,
      shippingCost: 3000,
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.label === "할인 금액")).toBeUndefined();
  });

  it("배송비가 0이면 무료를 반환한다", () => {
    const rows = buildPriceRows({
      originalPrice: 10000,
      totalDiscount: 0,
      shippingCost: 0,
    });

    expect(rows.find((row) => row.label === "배송비")?.value).toBe("무료");
  });

  it("배송비가 있으면 포맷된 금액을 반환한다", () => {
    const rows = buildPriceRows({
      originalPrice: 10000,
      totalDiscount: 0,
      shippingCost: 3000,
    });

    expect(rows.find((row) => row.label === "배송비")?.value).toBe("3,000원");
  });
});

describe("OrderSummaryAside", () => {
  it("totalClassName이 총액 span에 적용된다", () => {
    render(
      <OrderSummaryAside
        title="금액"
        rows={[]}
        totalAmount={10000}
        totalClassName="text-blue-600"
      />,
    );

    expect(screen.getByText("10,000원")).toHaveClass("text-blue-600");
  });

  it("totalClassName 미전달 시 기본 스타일만 적용된다", () => {
    render(<OrderSummaryAside title="금액" rows={[]} totalAmount={10000} />);

    const total = screen.getByText("10,000원");

    expect(total).toHaveClass("text-foreground");
    expect(total).not.toHaveClass("text-blue-600");
  });
});
