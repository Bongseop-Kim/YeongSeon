import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckoutPageState } from "@/widgets/checkout";

const {
  navigate,
  openCouponSelect,
  success,
  useAuthStore,
  useShippingAddressPopup,
} = vi.hoisted(() => ({
  navigate: vi.fn(),
  openCouponSelect: vi.fn(),
  success: vi.fn(),
  useAuthStore: vi.fn(),
  useShippingAddressPopup: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/features/coupon", () => ({
  useCouponSelect: () => ({
    openCouponSelect,
    dialog: <div data-testid="coupon-dialog" />,
  }),
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    success,
  },
}));

vi.mock("@/shared/store/auth", () => ({
  useAuthStore: () => useAuthStore(),
}));

vi.mock("@/features/shipping", () => ({
  useShippingAddressPopup: (options: {
    initialSelectedAddressId: string | null;
  }) => useShippingAddressPopup(options),
}));

describe("useCheckoutPageState", () => {
  beforeEach(() => {
    navigate.mockReset();
    openCouponSelect.mockReset();
    success.mockReset();
    useAuthStore.mockReset();
    useShippingAddressPopup.mockReset();

    useAuthStore.mockReturnValue({
      user: { id: "user-1", user_metadata: { name: "홍길동" } },
    });

    useShippingAddressPopup.mockReturnValue({
      selectedAddressId: "address-1",
      selectedAddress: {
        id: "address-1",
        recipientName: "홍길동",
      },
      openShippingPopup: vi.fn(),
    });
  });

  it("공통 체크아웃 상태와 의존 값을 반환한다", () => {
    const { result } = renderHook(() =>
      useCheckoutPageState({ initialShippingAddressId: "address-1" }),
    );

    expect(useShippingAddressPopup).toHaveBeenCalledWith({
      initialSelectedAddressId: "address-1",
    });
    expect(result.current.navigate).toBe(navigate);
    expect(result.current.user).toEqual({
      id: "user-1",
      user_metadata: { name: "홍길동" },
    });
    expect(result.current.selectedAddressId).toBe("address-1");
    expect(result.current.selectedAddress).toEqual({
      id: "address-1",
      recipientName: "홍길동",
    });
    expect(result.current.serverAmount).toBeNull();
    expect(result.current.cancellationConsent).toBe(false);
    expect(result.current.appliedCoupon).toBeUndefined();
    expect(result.current.paymentWidgetRef.current).toBeNull();
    expect(result.current.pendingOrderIdRef.current).toBeNull();
    expect(result.current.pendingSnapshotRef.current).toBeNull();
    expect(result.current.couponDialog).not.toBeNull();
  });

  it("같은 쿠폰을 다시 선택하면 상태를 유지한다", async () => {
    const selectedCoupon = {
      id: "coupon-1",
      coupon: { name: "신규 쿠폰" },
    };
    openCouponSelect
      .mockResolvedValueOnce(selectedCoupon)
      .mockResolvedValueOnce(selectedCoupon);

    const { result } = renderHook(() =>
      useCheckoutPageState({ initialShippingAddressId: "address-1" }),
    );

    await act(async () => {
      await result.current.handleChangeCoupon();
    });

    act(() => {
      result.current.setServerAmount(12000);
      result.current.pendingOrderIdRef.current = "order-1";
      result.current.pendingSnapshotRef.current = "snapshot-1";
    });

    await act(async () => {
      await result.current.handleChangeCoupon();
    });

    expect(result.current.appliedCoupon).toEqual(selectedCoupon);
    expect(result.current.serverAmount).toBe(12000);
    expect(result.current.pendingOrderIdRef.current).toBe("order-1");
    expect(result.current.pendingSnapshotRef.current).toBe("snapshot-1");
    expect(success).toHaveBeenCalledTimes(1);
  });

  it("쿠폰 적용과 해제 시 pending 주문 상태를 초기화하고 토스트를 노출한다", async () => {
    const selectedCoupon = {
      id: "coupon-1",
      coupon: { name: "신규 쿠폰" },
    };
    openCouponSelect
      .mockResolvedValueOnce(selectedCoupon)
      .mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useCheckoutPageState({ initialShippingAddressId: "address-1" }),
    );

    act(() => {
      result.current.setServerAmount(12000);
      result.current.pendingOrderIdRef.current = "order-1";
      result.current.pendingSnapshotRef.current = "snapshot-1";
    });

    await act(async () => {
      await result.current.handleChangeCoupon();
    });

    expect(result.current.appliedCoupon).toEqual(selectedCoupon);
    expect(result.current.serverAmount).toBeNull();
    expect(result.current.pendingOrderIdRef.current).toBeNull();
    expect(result.current.pendingSnapshotRef.current).toBeNull();
    expect(success).toHaveBeenNthCalledWith(
      1,
      "신규 쿠폰이(가) 적용되었습니다.",
    );

    act(() => {
      result.current.setServerAmount(9000);
      result.current.pendingOrderIdRef.current = "order-2";
      result.current.pendingSnapshotRef.current = "snapshot-2";
    });

    await act(async () => {
      await result.current.handleChangeCoupon();
    });

    expect(result.current.appliedCoupon).toBeUndefined();
    expect(result.current.serverAmount).toBeNull();
    expect(result.current.pendingOrderIdRef.current).toBeNull();
    expect(result.current.pendingSnapshotRef.current).toBeNull();
    expect(success).toHaveBeenNthCalledWith(2, "쿠폰 사용을 취소했습니다.");
  });
});
