import { useRef, useState } from "react";
import { Dialog } from "@/shared/ui/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";
import {
  CouponSelectModal,
  type CouponSelectModalRef,
} from "@/features/coupon/components/coupon-select-modal";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";
import { analytics } from "@/shared/lib/analytics";

/**
 * 쿠폰 선택 다이얼로그를 열고 선택된 쿠폰을 반환하는 범용 hook
 *
 * @example
 * const { openCouponSelect, dialog: couponDialog } = useCouponSelect();
 *
 * const handleChangeCoupon = async (itemId: string) => {
 *   const selectedCoupon = await openCouponSelect(currentCouponId);
 *   if (selectedCoupon === null) return; // 취소
 *   await applyCoupon(itemId, selectedCoupon); // undefined이면 쿠폰 제거, 객체이면 쿠폰 적용
 * };
 *
 * // JSX:
 * return <>{mainContent}{couponDialog}</>;
 */
export const useCouponSelect = () => {
  const couponRef = useRef<CouponSelectModalRef | null>(null);
  const [state, setState] = useState<{
    resolve: (value: AppliedCoupon | null | undefined) => void;
    currentCouponId?: string;
  } | null>(null);

  const openCouponSelect = (
    currentCouponId?: string,
  ): Promise<AppliedCoupon | null | undefined> => {
    return new Promise((resolve) => {
      setState({ resolve, currentCouponId });
    });
  };

  const handleConfirm = () => {
    const selectedCoupon = couponRef.current?.getSelectedCoupon();
    try {
      if (selectedCoupon !== undefined) {
        analytics.track("apply_coupon", {
          coupon_code: selectedCoupon?.couponId,
        });
      }
    } catch (e) {
      console.warn("analytics error:", e);
    } finally {
      state?.resolve(selectedCoupon);
      setState(null);
    }
  };

  const handleCancel = () => {
    state?.resolve(null);
    setState(null);
  };

  const dialog = state ? (
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <ResponsiveDialogScaffold
        title="쿠폰 사용"
        confirmLabel="적용"
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      >
        <CouponSelectModal
          ref={couponRef}
          currentCouponId={state.currentCouponId}
        />
      </ResponsiveDialogScaffold>
    </Dialog>
  ) : null;

  return { openCouponSelect, dialog };
};
