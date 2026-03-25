import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCouponSelect } from "@/features/coupon/hooks/use-coupon-select";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

const { mockGetSelectedCoupon } = vi.hoisted(() => ({
  mockGetSelectedCoupon: vi.fn<() => AppliedCoupon | undefined>(),
}));

vi.mock("@/features/coupon/components/coupon-select-modal", async () => {
  const { forwardRef: fRef, useImperativeHandle: uIH } = await import("react");
  return {
    CouponSelectModal: fRef((_props: unknown, ref: unknown) => {
      uIH(
        ref as React.Ref<{
          getSelectedCoupon: () => AppliedCoupon | undefined;
        }>,
        () => ({
          getSelectedCoupon: mockGetSelectedCoupon,
        }),
      );
      return null;
    }),
  };
});

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (open ? <>{children}</> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

function TestWrapper({
  onResult,
  couponId,
}: {
  onResult: (v: AppliedCoupon | null | undefined) => void;
  couponId?: string;
}) {
  const { openCouponSelect, dialog } = useCouponSelect();
  return (
    <>
      <button onClick={() => void openCouponSelect(couponId).then(onResult)}>
        열기
      </button>
      {dialog}
    </>
  );
}

describe("useCouponSelect", () => {
  beforeEach(() => {
    mockGetSelectedCoupon.mockReturnValue(undefined);
  });

  it("쿠폰 선택 후 적용 시 해당 쿠폰을 resolve한다", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    const coupon = {
      id: "uc-1",
      couponId: "coupon-1",
    } as unknown as AppliedCoupon;
    mockGetSelectedCoupon.mockReturnValue(coupon);

    render(<TestWrapper onResult={onResult} couponId="uc-1" />);

    await user.click(screen.getByRole("button", { name: "열기" }));
    await user.click(screen.getByRole("button", { name: "적용" }));

    expect(onResult).toHaveBeenCalledWith(coupon);
  });

  it("사용 안 함 선택 후 적용 시 undefined를 resolve한다", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();
    mockGetSelectedCoupon.mockReturnValue(undefined);

    render(<TestWrapper onResult={onResult} couponId="uc-1" />);

    await user.click(screen.getByRole("button", { name: "열기" }));
    await user.click(screen.getByRole("button", { name: "적용" }));

    expect(onResult).toHaveBeenCalledWith(undefined);
  });

  it("취소 버튼 클릭 시 null을 resolve한다", async () => {
    const user = userEvent.setup();
    const onResult = vi.fn();

    render(<TestWrapper onResult={onResult} />);

    await user.click(screen.getByRole("button", { name: "열기" }));
    await user.click(screen.getByRole("button", { name: "취소" }));

    expect(onResult).toHaveBeenCalledWith(null);
  });

  it("openCouponSelect 호출 전에는 dialog 버튼이 없다", () => {
    render(<TestWrapper onResult={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "적용" })).toBeNull();
    expect(screen.queryByRole("button", { name: "취소" })).toBeNull();
  });
});
