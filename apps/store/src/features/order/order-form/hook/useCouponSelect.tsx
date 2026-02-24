import type { CouponSelectModalRef } from "@/features/cart/components/coupon-select-modal";
import type { AppliedCoupon } from "@/features/order/types/coupon";
import { useModalStore } from "@/store/modal";
import { CouponSelectModal } from "@/features/cart/components/coupon-select-modal";

/**
 * 쿠폰 선택 모달을 열고 선택된 쿠폰을 반환하는 범용 hook
 *
 * @example
 * const { openCouponSelect } = useCouponSelect();
 *
 * const handleChangeCoupon = async (itemId: string) => {
 *   const currentCouponId = items.find(i => i.id === itemId)?.appliedCoupon?.id;
 *   const selectedCoupon = await openCouponSelect(currentCouponId);
 *
 *   if (selectedCoupon !== null) {
 *     // 쿠폰 적용 로직
 *     await applyCoupon(itemId, selectedCoupon);
 *   }
 * };
 */
export const useCouponSelect = () => {
  const { openModal, closeModal } = useModalStore();

  const openCouponSelect = (
    currentCouponId?: string
  ): Promise<AppliedCoupon | null> => {
    return new Promise((resolve) => {
      const modalRef: { current: CouponSelectModalRef | null } = {
        current: null,
      };

      openModal({
        title: "쿠폰 사용",
        children: (
          <CouponSelectModal
            ref={(ref) => {
              modalRef.current = ref;
            }}
            currentCouponId={currentCouponId}
          />
        ),
        fullScreenOnMobile: true,
        confirmText: "적용",
        cancelText: "취소",
        onConfirm: () => {
          const selectedCoupon = modalRef.current?.getSelectedCoupon() ?? null;
          closeModal();
          resolve(selectedCoupon);
        },
        onCancel: () => {
          closeModal();
          resolve(null);
        },
      });
    });
  };

  return { openCouponSelect };
};
