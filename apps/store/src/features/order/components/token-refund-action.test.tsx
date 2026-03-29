import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { RefundableTokenOrder } from "@/entities/my-page";
import { TokenRefundAction } from "@/features/order/components/token-refund-action";

const baseOrder: RefundableTokenOrder = {
  orderId: "order-1",
  orderNumber: "ORD-001",
  createdAt: "2026-01-01T00:00:00Z",
  totalPrice: 10000,
  paidTokensGranted: 100,
  bonusTokensGranted: 0,
  isRefundable: true,
  notRefundableReason: null,
  pendingRequestId: null,
};

vi.mock("@/entities/my-page", () => ({
  useRequestTokenRefundMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useCancelTokenRefundMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe("TokenRefundAction", () => {
  it("refundOrder가 null이면 렌더링하지 않는다", () => {
    const { container } = render(<TokenRefundAction refundOrder={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("환불 가능 주문이면 환불 신청 버튼을 표시한다", () => {
    render(<TokenRefundAction refundOrder={baseOrder} />);

    expect(
      screen.getByRole("button", { name: "환불 신청" }),
    ).toBeInTheDocument();
  });

  it("pending_refund면 환불 신청 중과 신청 취소를 표시한다", () => {
    render(
      <TokenRefundAction
        refundOrder={{
          ...baseOrder,
          isRefundable: false,
          notRefundableReason: "pending_refund",
          pendingRequestId: "req-1",
        }}
      />,
    );

    expect(screen.getByText("환불 신청 중")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "신청 취소" }),
    ).toBeInTheDocument();
  });

  it("approved_refund면 환불 완료를 표시한다", () => {
    render(
      <TokenRefundAction
        refundOrder={{
          ...baseOrder,
          isRefundable: false,
          notRefundableReason: "approved_refund",
        }}
      />,
    );

    expect(screen.getByText("환불 완료")).toBeInTheDocument();
  });

  it("tokens_used면 환불 불가 문구를 표시한다", () => {
    render(
      <TokenRefundAction
        refundOrder={{
          ...baseOrder,
          isRefundable: false,
          notRefundableReason: "tokens_used",
        }}
      />,
    );

    expect(screen.getByText(/환불 불가/)).toBeInTheDocument();
  });

  it("active_refund면 환불 처리 중을 표시한다", () => {
    render(
      <TokenRefundAction
        refundOrder={{
          ...baseOrder,
          isRefundable: false,
          notRefundableReason: "active_refund",
        }}
      />,
    );

    expect(screen.getByText("환불 처리 중")).toBeInTheDocument();
  });

  it("no_paid_tokens면 유료 토큰 없음 문구를 표시한다", () => {
    render(
      <TokenRefundAction
        refundOrder={{
          ...baseOrder,
          isRefundable: false,
          notRefundableReason: "no_paid_tokens",
        }}
      />,
    );

    expect(screen.getByText(/유료 토큰 없음/)).toBeInTheDocument();
  });
});
