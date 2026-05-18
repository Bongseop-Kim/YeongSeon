import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PaymentWidgetRef } from "@/shared/composite/payment-widget";
import type { CheckoutPaymentState } from "../model/use-checkout-payment";
import { BaseCheckoutPage } from "./BaseCheckoutPage";

vi.mock("@/features/notification", () => ({
  NotificationConsentFlowModals: () => null,
}));

vi.mock("@/shared/composite/payment-widget-aside", () => ({
  PaymentWidgetAside: () => <section>결제 수단</section>,
}));

vi.mock("@/shared/lib/breakpoint-provider", () => ({
  useBreakpoint: () => ({
    isMobile: false,
  }),
}));

const makeCheckoutState = (
  overrides: Partial<CheckoutPaymentState> = {},
): CheckoutPaymentState =>
  ({
    appliedCoupon: undefined,
    amount: 100000,
    discountAmount: 0,
    user: { id: "user-1", user_metadata: { name: "홍길동" } },
    paymentWidgetRef: createRef<PaymentWidgetRef | null>(),
    isPaymentLoading: false,
    isSubmitDisabled: false,
    selectedAddress: {
      id: "address-1",
      recipientName: "홍길동",
      recipientPhone: "01012345678",
      address: "서울시 종로구 세종대로 1",
      detailAddress: "101호",
      postalCode: "12345",
      deliveryRequest: "DELIVERY_REQUEST_4",
      isDefault: true,
    },
    handleRequestPayment: vi.fn(),
    handleChangeCoupon: vi.fn(),
    openShippingPopup: vi.fn(),
    couponDialog: null,
    consentFlow: {},
    ...overrides,
  }) as CheckoutPaymentState;

describe("BaseCheckoutPage", () => {
  it("renders the payment summary sidebar with SummaryCard styling", () => {
    render(
      <BaseCheckoutPage
        checkoutState={makeCheckoutState()}
        intro={{
          eyebrow: "Custom Order",
          title: "주문제작 결제",
          meta: "결제 메타",
        }}
        optionsSection={{
          content: "옵션 내용",
        }}
        summaryRows={[
          {
            id: "amount",
            label: "상품 금액",
            value: "100,000원",
          },
        ]}
        totalOriginalPrice={100000}
        breadcrumbs={[]}
      />,
    );

    const summaryCard = screen.getByText("결제 금액").closest("section");

    expect(summaryCard).toHaveClass("border");
    expect(summaryCard).toHaveClass("border-border");
    expect(summaryCard).toHaveClass("p-5");
    expect(summaryCard).toContainElement(screen.getByText("결제 수단"));
  });

  it("renders option content without a separate section title", () => {
    render(
      <BaseCheckoutPage
        checkoutState={makeCheckoutState()}
        intro={{
          eyebrow: "Custom Order",
          title: "주문제작 결제",
          meta: "결제 메타",
        }}
        optionsSection={{
          content: "옵션 내용",
        }}
        summaryRows={[
          {
            id: "amount",
            label: "상품 금액",
            value: "100,000원",
          },
        ]}
        totalOriginalPrice={100000}
        breadcrumbs={[]}
      />,
    );

    expect(screen.getByText("옵션 내용")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "주문 옵션 확인" }),
    ).not.toBeInTheDocument();
  });
});
