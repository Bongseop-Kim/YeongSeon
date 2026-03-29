import { useLocation } from "react-router-dom";
import { useCreateSampleOrder } from "@/entities/sample-order";
import { getTieTypeLabel } from "@/features/custom-order";
import { ROUTES } from "@/shared/constants/ROUTES";
import { isSampleOrderPaymentState } from "@/shared/lib/custom-payment-state";
import { useCheckoutPayment } from "../model/use-checkout-payment";
import { BaseCheckoutPage } from "./BaseCheckoutPage";
import {
  CheckoutAmountMeta,
  CheckoutOptionList,
  CheckoutOptionRow,
  CheckoutSupplementaryDetails,
  createAmountSummaryRow,
} from "./CheckoutOptionPrimitives";

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
    title: "샘플 옵션 확인",
    content: (
      <CheckoutOptionList>
        <CheckoutOptionRow label="샘플 유형" value={state.sampleLabel} />
        {state.options.fabricType ? (
          <CheckoutOptionRow label="원단 조합" value={state.fabricLabel} />
        ) : null}
        <CheckoutOptionRow
          label="타이 방식"
          value={getTieTypeLabel(state.options.tieType)}
        />
        <CheckoutOptionRow
          label="심지"
          value={
            state.options.interlining === "WOOL"
              ? "울 심지"
              : state.options.interlining === "POLY"
                ? "폴리 심지"
                : "미지정"
          }
        />
        <CheckoutSupplementaryDetails
          imageRefs={state.imageRefs}
          notes={state.additionalNotes}
        />
      </CheckoutOptionList>
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
      consentDescription="샘플 주문은 결제 후 중도 취소 및 환불이 불가능합니다."
    />
  );
}
