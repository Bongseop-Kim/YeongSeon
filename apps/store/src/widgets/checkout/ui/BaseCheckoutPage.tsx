import type { ReactNode } from "react";
import { NotificationConsentFlowModals } from "@/features/notification";
import { OrderPriceSummaryAside } from "@/shared/composite/order-price-summary-aside";
import { OrderSummaryAside } from "@/shared/composite/order-summary-aside";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import { PaymentWidgetAside } from "@/shared/composite/payment-widget-aside";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { MainLayout, MainContent } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import type { CheckoutPaymentState } from "../model/use-checkout-payment";
import { CheckoutBodySections } from "./CheckoutBodySections";

interface SummaryRow {
  id: string;
  label: string;
  value: string;
}

interface BaseCheckoutPageProps {
  checkoutState: CheckoutPaymentState;
  intro: {
    eyebrow: string;
    title: string;
    meta: ReactNode;
  };
  optionsSection: {
    title: string;
    content: ReactNode;
  };
  summaryRows: SummaryRow[];
  totalOriginalPrice: number;
  consentDescription: string;
}

export function BaseCheckoutPage({
  checkoutState,
  intro,
  optionsSection,
  summaryRows,
  totalOriginalPrice,
  consentDescription,
}: BaseCheckoutPageProps) {
  const {
    appliedCoupon,
    amount,
    discountAmount,
    user,
    paymentWidgetRef,
    cancellationConsent,
    setCancellationConsent,
    isPaymentLoading,
    isSubmitDisabled,
    selectedAddress,
    handleRequestPayment,
    handleChangeCoupon,
    openShippingPopup,
    couponDialog,
    consentFlow,
  } = checkoutState;

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <PageLayout
            contentClassName="py-4 lg:py-8"
            sidebar={
              <div className="space-y-4">
                {appliedCoupon ? (
                  <OrderPriceSummaryAside
                    title="결제 금액"
                    originalPrice={totalOriginalPrice}
                    totalDiscount={discountAmount}
                    shippingCost={0}
                    totalPrice={amount}
                    totalClassName="text-blue-600"
                  />
                ) : (
                  <OrderSummaryAside
                    title="결제 금액"
                    rows={summaryRows}
                    totalAmount={amount}
                  />
                )}
                {user ? (
                  <PaymentWidgetAside
                    title="결제 수단"
                    description="결제 방식과 약관 동의를 확인합니다."
                    paymentWidgetRef={paymentWidgetRef}
                    amount={amount}
                    customerKey={user.id}
                    consent={{
                      id: "cancellation-consent",
                      checked: cancellationConsent,
                      onCheckedChange: setCancellationConsent,
                      label: "취소/환불 불가 동의",
                      description: consentDescription,
                    }}
                    className="rounded-2xl"
                  />
                ) : null}
              </div>
            }
            actionBar={
              <PaymentActionBar
                amount={amount}
                onClick={handleRequestPayment}
                isLoading={isPaymentLoading}
                isPriceReady={true}
                disabled={isSubmitDisabled}
                helperText={
                  !selectedAddress ? (
                    <p className="text-center text-sm text-foreground-muted">
                      배송지를 추가하면 주문을 진행할 수 있어요
                    </p>
                  ) : null
                }
              />
            }
          >
            <div className="space-y-8">
              <UtilityPageIntro
                eyebrow={intro.eyebrow}
                title={intro.title}
                description="배송지를 확인하고 결제 수단을 선택한 뒤 결제를 진행합니다."
                meta={intro.meta}
              />
              <UtilityPageSection
                title={optionsSection.title}
                description="수정이 필요한 항목이 있으면 이전 페이지로 돌아가 조정할 수 있습니다."
              >
                {optionsSection.content}
              </UtilityPageSection>
              <CheckoutBodySections
                appliedCoupon={appliedCoupon}
                discountAmount={discountAmount}
                onChangeCoupon={handleChangeCoupon}
                selectedAddress={selectedAddress ?? null}
                onOpenShippingPopup={openShippingPopup}
              />
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
      <NotificationConsentFlowModals consentFlow={consentFlow} />
      {couponDialog}
    </>
  );
}
