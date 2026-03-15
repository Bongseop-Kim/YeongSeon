import { render, screen } from "@testing-library/react";
import { createOrderSummary } from "@/test/fixtures";
import { CartOrderSummaryCard } from "@/features/cart/components/cart-order-summary-card";

describe("CartOrderSummaryCard", () => {
  it("상품 금액, 총 수량, 결제 금액을 표시한다", () => {
    render(<CartOrderSummaryCard summary={createOrderSummary()} />);

    expect(screen.getByText("상품 금액")).toBeInTheDocument();
    expect(screen.getByText("12,000원")).toBeInTheDocument();
    expect(screen.getByText("총 2개")).toBeInTheDocument();
    expect(screen.getByText("13,000원")).toBeInTheDocument();
  });

  it("할인 금액이 있으면 할인 행을 표시한다", () => {
    render(<CartOrderSummaryCard summary={createOrderSummary()} />);

    expect(screen.getByText("할인 금액")).toBeInTheDocument();
    expect(screen.getByText("-2,000원")).toBeInTheDocument();
  });

  it("할인 금액이 없으면 할인 행을 숨긴다", () => {
    render(
      <CartOrderSummaryCard
        summary={createOrderSummary({ totalDiscount: 0 })}
      />,
    );

    expect(screen.queryByText("할인 금액")).not.toBeInTheDocument();
  });

  it("배송비가 0원이면 무료를 표시한다", () => {
    render(
      <CartOrderSummaryCard
        summary={createOrderSummary({ shippingCost: 0 })}
      />,
    );

    expect(screen.getByText("무료")).toBeInTheDocument();
  });

  it("배송비가 있으면 금액을 표시한다", () => {
    render(
      <CartOrderSummaryCard
        summary={createOrderSummary({ shippingCost: 3500 })}
      />,
    );

    expect(screen.getByText("3,500원")).toBeInTheDocument();
  });
});
