import { useLocation } from "react-router-dom";
import { useCreateSampleOrder } from "@/entities/sample-order";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { isSampleOrderPaymentState } from "@/shared/lib/custom-payment-state";
import { useCheckoutPayment } from "../model/use-checkout-payment";
import { BaseCheckoutPage } from "./BaseCheckoutPage";
import { CheckoutAmountMeta } from "./CheckoutOptionPrimitives";
import { SampleOrderEstimate } from "./SampleOrderEstimate";
import { createAmountSummaryRow } from "./checkout-summary";

export function SampleOrderCheckoutPage() {
  const location = useLocation();
  const rawState = location.state;
  const state = isSampleOrderPaymentState(rawState) ? rawState : null;
  const createSampleOrder = useCreateSampleOrder();

  const createOrder = async (
    shippingAddressId: string,
    userCouponId: string | undefined,
  ) => {
    if (!state) {
      throw new Error("샘플 주문 결제 상태가 없습니다.");
    }

    return createSampleOrder.mutateAsync({
      shippingAddressId,
      sampleType: state.sampleType,
      options: state.options,
      referenceImages: state.imageRefs,
      additionalNotes: state.additionalNotes,
      userCouponId,
    });
  };

  const checkout = useCheckoutPayment({
    state,
    fallbackRoute: ROUTES.SAMPLE_ORDER,
    pricePerUnit: state?.samplePrice ?? 0,
    createOrder,
    orderName: "샘플 주문",
  });

  if (!state) return null;

  const { amount } = checkout;
  const intro = {
    eyebrow: "Sample Order",
    title: "샘플 주문 결제",
    meta: (
      <CheckoutAmountMeta
        label="샘플 주문"
        value={state.sampleLabel}
        amount={amount}
      />
    ),
  };
  const optionsSection = {
    content: (
      <SampleOrderEstimate
        recipientName={checkout.selectedAddress?.recipientName}
        sampleLabel={state.sampleLabel}
        fabricLabel={state.fabricLabel}
        options={state.options}
        imageRefs={state.imageRefs}
        totalCost={state.samplePrice}
      />
    ),
  };
  const summaryRows = [createAmountSummaryRow(amount)];

  return (
    <BaseCheckoutPage
      checkoutState={checkout}
      intro={intro}
      optionsSection={optionsSection}
      summaryRows={summaryRows}
      totalOriginalPrice={state.samplePrice}
      breadcrumbs={PAGE_BREADCRUMBS.SAMPLE_PAYMENT}
    />
  );
}
