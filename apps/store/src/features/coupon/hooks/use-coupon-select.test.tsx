import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useCouponSelect } from "@/features/coupon/hooks/use-coupon-select";

const openModal = vi.fn();
const closeModal = vi.fn();

vi.mock("@/store/modal", () => ({
  useModalStore: () => ({
    openModal,
    closeModal,
  }),
}));

vi.mock("@/features/coupon/components/coupon-select-modal", () => ({
  CouponSelectModal: "coupon-select-modal",
}));

describe("useCouponSelect", () => {
  it("선택된 쿠폰을 resolve한다", async () => {
    const { result } = renderHook(() => useCouponSelect());

    const promise = result.current.openCouponSelect("uc-1");
    const modalConfig = openModal.mock.calls[0][0];
    modalConfig.children.props.ref({
      getSelectedCoupon: () => ({ id: "uc-1", couponId: "coupon-1" }),
    });

    expect(modalConfig.title).toBe("쿠폰 사용");
    expect(modalConfig.children.props.currentCouponId).toBe("uc-1");

    modalConfig.onConfirm();

    await expect(promise).resolves.toEqual({
      id: "uc-1",
      couponId: "coupon-1",
    });
    expect(closeModal).toHaveBeenCalled();
  });

  it("취소 시 null을 resolve한다", async () => {
    const { result } = renderHook(() => useCouponSelect());

    const promise = result.current.openCouponSelect();
    const modalConfig = openModal.mock.calls[1][0];
    modalConfig.onCancel();

    await expect(promise).resolves.toBeNull();
    expect(closeModal).toHaveBeenCalled();
  });
});
