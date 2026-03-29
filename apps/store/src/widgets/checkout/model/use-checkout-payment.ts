import { useEffect } from "react";
import { useNotificationConsentFlow } from "@/features/notification";
import { ROUTES } from "@/shared/constants/ROUTES";
import { toast } from "@/shared/lib/toast";
import { hasStringCode } from "@/shared/lib/type-guard";
import { calculateDiscount } from "@yeongseon/shared/utils/calculate-discount";
import { useCheckoutPageState } from "./use-checkout-page-state";

interface UseCheckoutPaymentOptions {
  state: { shippingAddressId?: string | null } | null;
  fallbackRoute: string;
  pricePerUnit: number;
  quantity?: number;
  createOrder: (
    shippingAddressId: string,
    userCouponId: string | undefined,
  ) => Promise<{ orderId: string; totalAmount: number }>;
  orderName: string;
}

export type CheckoutPaymentState = ReturnType<typeof useCheckoutPayment>;

export function useCheckoutPayment({
  state,
  fallbackRoute,
  pricePerUnit,
  quantity = 1,
  createOrder,
  orderName,
}: UseCheckoutPaymentOptions) {
  const pageState = useCheckoutPageState({
    initialShippingAddressId: state?.shippingAddressId ?? null,
  });

  const {
    navigate,
    isPaymentLoading,
    setIsPaymentLoading,
    cancellationConsent,
    serverAmount,
    setServerAmount,
    appliedCoupon,
    paymentWidgetRef,
    pendingOrderIdRef,
    pendingSnapshotRef,
    user,
    selectedAddressId,
    selectedAddress,
  } = pageState;

  useEffect(() => {
    if (state) return;
    navigate(fallbackRoute, { replace: true });
  }, [fallbackRoute, navigate, state]);

  const proceedToPayment = async () => {
    if (!state) return;
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate(ROUTES.LOGIN);
      return;
    }

    if (!selectedAddressId || !selectedAddress) {
      toast.error("배송지를 선택해주세요.");
      return;
    }

    if (!paymentWidgetRef.current) {
      toast.error("결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsPaymentLoading(true);
    let orderCreated = false;

    try {
      const snapshot = JSON.stringify({
        ...state,
        shippingAddressId: selectedAddressId,
        userCouponId: appliedCoupon?.id,
      });

      if (
        pendingOrderIdRef.current &&
        pendingSnapshotRef.current !== snapshot
      ) {
        pendingOrderIdRef.current = null;
        pendingSnapshotRef.current = null;
      }

      let orderId = pendingOrderIdRef.current;
      if (!orderId) {
        const response = await createOrder(
          selectedAddressId,
          appliedCoupon?.id,
        );
        orderId = response.orderId;
        orderCreated = true;
        setServerAmount(response.totalAmount);
        await paymentWidgetRef.current.setAmount(response.totalAmount);
        pendingOrderIdRef.current = orderId;
        pendingSnapshotRef.current = snapshot;
      } else if (serverAmount !== null) {
        await paymentWidgetRef.current.setAmount(serverAmount);
      }

      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName,
        successUrl: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
        failUrl: `${window.location.origin}${ROUTES.PAYMENT_FAIL}`,
        customerName: user.user_metadata?.name ?? undefined,
      });

      pendingOrderIdRef.current = null;
      pendingSnapshotRef.current = null;
    } catch (error) {
      if (hasStringCode(error) && error.code === "USER_CANCEL") {
        return;
      }

      if (!pendingOrderIdRef.current && !orderCreated) {
        pendingSnapshotRef.current = null;
      }

      toast.error(
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다.",
      );
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const { initiateWithConsentCheck: handleRequestPayment, consentFlow } =
    useNotificationConsentFlow(proceedToPayment);

  const discountAmount = state
    ? calculateDiscount(pricePerUnit, appliedCoupon, quantity)
    : 0;
  const amount = serverAmount ?? pricePerUnit * quantity - discountAmount;

  const isSubmitDisabled =
    !user || !selectedAddress || !cancellationConsent || isPaymentLoading;

  return {
    ...pageState,
    handleRequestPayment,
    consentFlow,
    amount,
    discountAmount,
    isSubmitDisabled,
  };
}
