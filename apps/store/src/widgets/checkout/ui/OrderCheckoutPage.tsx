import { useLocation } from "react-router-dom";
import { useCreateCustomOrder } from "@/entities/custom-order";
import {
  getFabricLabel,
  getFinishingLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order";
import { isCustomOrderPaymentState } from "@/features/order";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useCheckoutPayment } from "../model/use-checkout-payment";
import { BaseCheckoutPage } from "./BaseCheckoutPage";
import {
  CheckoutAmountMeta,
  CheckoutOptionList,
  CheckoutOptionRow,
  CheckoutSupplementaryDetails,
} from "./CheckoutOptionPrimitives";
import { createAmountSummaryRow } from "./checkout-summary";

export function OrderCheckoutPage() {
  const location = useLocation();
  const rawState = location.state;
  const state = isCustomOrderPaymentState(rawState) ? rawState : null;
  const createCustomOrder = useCreateCustomOrder();

  const pricePerUnit = state
    ? Math.floor(state.totalCost / state.coreOptions.quantity)
    : 0;

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
    pricePerUnit,
    quantity: state?.coreOptions.quantity ?? 1,
    createOrder,
    orderName: `주문제작 (수량 ${state?.coreOptions.quantity ?? 0}개)`,
  });

  if (!state) return null;

  const { amount } = checkout;
  const intro = {
    eyebrow: "Custom Order",
    title: "주문제작 결제",
    meta: (
      <CheckoutAmountMeta
        label="주문제작"
        value={`${state.coreOptions.quantity}개`}
        amount={amount}
      />
    ),
  };
  const optionsSection = {
    title: "주문 옵션 확인",
    content: (
      <CheckoutOptionList>
        <CheckoutOptionRow
          label="수량"
          value={`${state.coreOptions.quantity}개`}
        />
        <CheckoutOptionRow
          label="원단"
          value={getFabricLabel(state.coreOptions)}
        />
        <CheckoutOptionRow
          label="봉제"
          value={
            <>
              {getTieTypeLabel(state.coreOptions.tieType)} ·{" "}
              {getSewingStyleLabel(state.coreOptions)}
            </>
          }
        />
        <CheckoutOptionRow
          label="사이즈"
          value={
            <>
              {getSizeLabel(state.coreOptions.sizeType)}, 폭{" "}
              {state.coreOptions.tieWidth}cm
            </>
          }
        />
        <CheckoutOptionRow
          label="상세 옵션"
          value={getFinishingLabel(state.coreOptions)}
        />
        <CheckoutSupplementaryDetails
          imageRefs={state.imageRefs}
          notes={state.additionalNotes}
        />
      </CheckoutOptionList>
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
      consentDescription="주문제작은 진행 후 중도 취소 및 환불이 불가능합니다."
    />
  );
}
