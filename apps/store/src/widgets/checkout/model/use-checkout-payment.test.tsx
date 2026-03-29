import { act, renderHook } from "@testing-library/react";
import type { PaymentWidgetRef } from "@/shared/composite/payment-widget";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  navigate,
  mockUseCheckoutPageState,
  mockCalculateDiscount,
  errorFn,
  initiateWithConsentCheck,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  mockUseCheckoutPageState: vi.fn(),
  mockCalculateDiscount: vi.fn(),
  errorFn: vi.fn(),
  initiateWithConsentCheck: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("./use-checkout-page-state", () => ({
  useCheckoutPageState: (opts: { initialShippingAddressId: string | null }) =>
    mockUseCheckoutPageState(opts),
}));

vi.mock("@yeongseon/shared/utils/calculate-discount", () => ({
  calculateDiscount: mockCalculateDiscount,
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: { error: errorFn },
}));

vi.mock("@/features/notification", () => ({
  useNotificationConsentFlow: (fn: () => Promise<void>) => ({
    initiateWithConsentCheck: async () => {
      initiateWithConsentCheck();
      await fn();
    },
    consentFlow: {},
  }),
}));

const makePageState = (overrides = {}) => ({
  navigate,
  isPaymentLoading: false,
  setIsPaymentLoading: vi.fn(),
  cancellationConsent: true,
  setCancellationConsent: vi.fn(),
  serverAmount: null,
  setServerAmount: vi.fn(),
  appliedCoupon: undefined,
  couponDialog: null,
  paymentWidgetRef: { current: null as PaymentWidgetRef | null },
  pendingOrderIdRef: { current: null },
  pendingSnapshotRef: { current: null },
  user: { id: "user-1", user_metadata: { name: "홍길동" } },
  selectedAddressId: "addr-1",
  selectedAddress: { id: "addr-1", recipientName: "홍길동" },
  openShippingPopup: vi.fn(),
  resetPendingOrderState: vi.fn(),
  handleChangeCoupon: vi.fn(),
  ...overrides,
});

const validState = {
  shippingAddressId: "addr-1",
  totalCost: 100000,
};

import { useCheckoutPayment } from "./use-checkout-payment";

const defaultArgs = {
  state: validState,
  fallbackRoute: "/fallback",
  pricePerUnit: 50000,
  orderName: "테스트 주문",
} as const;

const renderCheckoutHook = (
  overrides: Partial<Parameters<typeof useCheckoutPayment>[0]> = {},
) =>
  renderHook(() =>
    useCheckoutPayment({
      ...defaultArgs,
      createOrder: vi.fn(),
      ...overrides,
    }),
  );

describe("useCheckoutPayment", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCalculateDiscount.mockReturnValue(10000);
    mockUseCheckoutPageState.mockReturnValue(makePageState());
  });

  it("amount와 discountAmount를 올바르게 계산한다", () => {
    mockCalculateDiscount.mockReturnValue(5000);

    const { result } = renderCheckoutHook({ quantity: 2 });

    expect(mockCalculateDiscount).toHaveBeenCalledWith(50000, undefined, 2);
    expect(result.current.discountAmount).toBe(5000);
    expect(result.current.amount).toBe(95000);
  });

  it("serverAmount가 있으면 서버 금액을 우선한다", () => {
    mockUseCheckoutPageState.mockReturnValue(
      makePageState({ serverAmount: 80000 }),
    );

    const { result } = renderCheckoutHook({ quantity: 2 });

    expect(result.current.amount).toBe(80000);
  });

  it("state가 null이면 fallbackRoute로 리다이렉트한다", () => {
    renderCheckoutHook({
      state: null,
      fallbackRoute: "/custom-order",
      pricePerUnit: 0,
      orderName: "",
    });

    expect(navigate).toHaveBeenCalledWith("/custom-order", { replace: true });
  });

  it("state가 있으면 리다이렉트하지 않는다", () => {
    renderCheckoutHook({
      fallbackRoute: "/custom-order",
      orderName: "테스트",
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  describe("isSubmitDisabled", () => {
    it("user가 없으면 true", () => {
      mockUseCheckoutPageState.mockReturnValue(makePageState({ user: null }));

      const { result } = renderCheckoutHook({ orderName: "테스트" });

      expect(result.current.isSubmitDisabled).toBe(true);
    });

    it("selectedAddress가 없으면 true", () => {
      mockUseCheckoutPageState.mockReturnValue(
        makePageState({ selectedAddress: null }),
      );

      const { result } = renderCheckoutHook({ orderName: "테스트" });

      expect(result.current.isSubmitDisabled).toBe(true);
    });

    it("cancellationConsent가 false면 true", () => {
      mockUseCheckoutPageState.mockReturnValue(
        makePageState({ cancellationConsent: false }),
      );

      const { result } = renderCheckoutHook({ orderName: "테스트" });

      expect(result.current.isSubmitDisabled).toBe(true);
    });

    it("isPaymentLoading이 true면 true", () => {
      mockUseCheckoutPageState.mockReturnValue(
        makePageState({ isPaymentLoading: true }),
      );

      const { result } = renderCheckoutHook({ orderName: "테스트" });

      expect(result.current.isSubmitDisabled).toBe(true);
    });

    it("모든 조건 충족 시 false", () => {
      const { result } = renderCheckoutHook({ orderName: "테스트" });

      expect(result.current.isSubmitDisabled).toBe(false);
    });
  });

  describe("proceedToPayment (handleRequestPayment를 통해)", () => {
    const makePaymentWidget = () => ({
      setAmount: vi.fn().mockResolvedValue(undefined),
      requestPayment: vi.fn().mockResolvedValue(undefined),
    });

    it("user 없으면 toast.error 후 로그인 페이지로 이동", async () => {
      mockUseCheckoutPageState.mockReturnValue(makePageState({ user: null }));

      const { result } = renderCheckoutHook();

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(initiateWithConsentCheck).toHaveBeenCalled();
      expect(errorFn).toHaveBeenCalledWith("로그인이 필요합니다.");
      expect(navigate).toHaveBeenCalledWith("/login");
    });

    it("selectedAddress 없으면 toast.error", async () => {
      mockUseCheckoutPageState.mockReturnValue(
        makePageState({ selectedAddressId: null, selectedAddress: null }),
      );

      const { result } = renderCheckoutHook();

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(errorFn).toHaveBeenCalledWith("배송지를 선택해주세요.");
    });

    it("paymentWidget 없으면 toast.error", async () => {
      const { result } = renderCheckoutHook();

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(errorFn).toHaveBeenCalledWith(
        "결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
      );
    });

    it("성공 시 createOrder 호출 후 requestPayment 호출", async () => {
      const createOrder = vi.fn().mockResolvedValue({
        orderId: "order-123",
        totalAmount: 95000,
      });
      const pageState = makePageState();
      const widget = makePaymentWidget();
      mockUseCheckoutPageState.mockReturnValue(pageState);

      const { result } = renderCheckoutHook({ quantity: 2, createOrder });

      pageState.paymentWidgetRef.current = widget;

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(createOrder).toHaveBeenCalledWith("addr-1", undefined);
      expect(widget.setAmount).toHaveBeenCalledWith(95000);
      expect(widget.requestPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "order-123",
          orderName: "테스트 주문",
        }),
      );
    });

    it("USER_CANCEL 에러는 무시한다", async () => {
      const createOrder = vi.fn().mockRejectedValue({ code: "USER_CANCEL" });
      const pageState = makePageState();
      const widget = makePaymentWidget();
      mockUseCheckoutPageState.mockReturnValue(pageState);

      const { result } = renderCheckoutHook({
        createOrder,
        orderName: "테스트",
      });

      pageState.paymentWidgetRef.current = widget;

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(errorFn).not.toHaveBeenCalled();
    });

    it("그 외 에러는 toast.error를 노출한다", async () => {
      const createOrder = vi.fn().mockRejectedValue(new Error("서버 오류"));
      const pageState = makePageState();
      const widget = makePaymentWidget();
      mockUseCheckoutPageState.mockReturnValue(pageState);

      const { result } = renderCheckoutHook({
        createOrder,
        orderName: "테스트",
      });

      pageState.paymentWidgetRef.current = widget;

      await act(async () => {
        await result.current.handleRequestPayment();
      });

      expect(errorFn).toHaveBeenCalledWith("서버 오류");
    });
  });
});
