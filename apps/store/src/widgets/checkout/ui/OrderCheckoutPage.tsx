import { useLocation } from "react-router-dom";
import { useCreateCustomOrder } from "@/entities/custom-order";
import { isCustomOrderPaymentState } from "@/features/order";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useCheckoutPayment } from "../model/use-checkout-payment";
import { BaseCheckoutPage } from "./BaseCheckoutPage";
import { CustomOrderEstimate } from "./CustomOrderEstimate";
import { createAmountSummaryRow } from "./checkout-summary";

export function OrderCheckoutPage() {
  const location = useLocation();
  const rawState = location.state;
  const state = isCustomOrderPaymentState(rawState) ? rawState : null;
  const createCustomOrder = useCreateCustomOrder();

  const createOrder = async (
    shippingAddressId: string,
    userCouponId: string | undefined,
  ) => {
    if (!state) {
      throw new Error("주문제작 결제 상태가 없습니다.");
    }

    return createCustomOrder.mutateAsync({
      shippingAddressId,
      options: state.coreOptions,
      referenceImages: state.imageRefs,
      additionalNotes: state.additionalNotes,
      userCouponId,
    });
  };

  const checkout = useCheckoutPayment({
    state,
    fallbackRoute: ROUTES.CUSTOM_ORDER,
    pricePerUnit: state?.totalCost ?? 0,
    createOrder,
    orderName: `주문제작 (수량 ${state?.coreOptions.quantity ?? 0}개)`,
  });

  if (!state) return null;

  const { amount } = checkout;
  const intro = {
    eyebrow: "Custom Order",
    title: "주문 옵션 확인",
    meta: (
      <p className="text-sm text-foreground-muted">
        아래 사양으로 제작이 진행됩니다.
      </p>
    ),
  };
  const optionsSection = {
    content: (
      <CustomOrderEstimate
        recipientName={checkout.selectedAddress?.recipientName}
        options={state.coreOptions}
        imageRefs={state.imageRefs}
        totalCost={state.totalCost}
      />
    ),
  };
  const summaryRows = [
    createAmountSummaryRow(amount),
    {
      id: "quantity",
      label: "수량",
      value: `${state.coreOptions.quantity}개`,
    },
  ];

  return (
    <BaseCheckoutPage
      checkoutState={checkout}
      intro={intro}
      optionsSection={optionsSection}
      summaryRows={summaryRows}
      totalOriginalPrice={state.totalCost}
      breadcrumbs={PAGE_BREADCRUMBS.CUSTOM_PAYMENT}
    />
  );
}
