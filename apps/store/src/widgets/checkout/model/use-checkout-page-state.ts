import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCouponSelect } from "@/features/coupon";
import { useShippingAddressPopup } from "@/features/shipping";
import type { PaymentWidgetRef } from "@/shared/composite/payment-widget";
import { toast } from "@/shared/lib/toast";
import { useAuthStore } from "@/shared/store/auth";
import type { AppliedCoupon } from "@yeongseon/shared/types/view/coupon";

interface UseCheckoutPageStateOptions {
  initialShippingAddressId: string | null;
}

export function useCheckoutPageState({
  initialShippingAddressId,
}: UseCheckoutPageStateOptions) {
  const navigate = useNavigate();
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | undefined>(
    undefined,
  );
  const { openCouponSelect, dialog: couponDialog } = useCouponSelect();
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const pendingOrderIdRef = useRef<string | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);

  const { user } = useAuthStore();
  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup({
      initialSelectedAddressId: initialShippingAddressId,
    });

  const resetPendingOrderState = () => {
    setServerAmount(null);
    pendingOrderIdRef.current = null;
    pendingSnapshotRef.current = null;
  };

  const handleChangeCoupon = async () => {
    const selected = await openCouponSelect(appliedCoupon?.id);
    if (selected === null) return;
    if (selected && selected.id === appliedCoupon?.id) return;

    setAppliedCoupon(selected ?? undefined);
    resetPendingOrderState();
    if (selected) {
      toast.success(`${selected.coupon.name}이(가) 적용되었습니다.`);
    } else {
      toast.success("쿠폰 사용을 취소했습니다.");
    }
  };

  return {
    navigate,
    isPaymentLoading,
    setIsPaymentLoading,
    cancellationConsent,
    setCancellationConsent,
    serverAmount,
    setServerAmount,
    appliedCoupon,
    couponDialog,
    paymentWidgetRef,
    pendingOrderIdRef,
    pendingSnapshotRef,
    user,
    selectedAddressId,
    selectedAddress,
    openShippingPopup,
    resetPendingOrderState,
    handleChangeCoupon,
  };
}
