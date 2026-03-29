import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui-extended/button";
import {
  CouponSelectModal,
  type CouponSelectModalRef,
} from "@/features/coupon/components/coupon-select-modal";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

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
    state?.resolve(selectedCoupon);
    setState(null);
  };

  const handleCancel = () => {
    state?.resolve(null);
    setState(null);
  };

  const dialog = state ? (
    <Dialog open onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="flex flex-col max-h-[min(600px,80dvh)]">
        <DialogHeader className="shrink-0">
          <DialogTitle>쿠폰 사용</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0">
          <CouponSelectModal
            ref={couponRef}
            currentCouponId={state.currentCouponId}
          />
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            취소
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  return { openCouponSelect, dialog };
};
