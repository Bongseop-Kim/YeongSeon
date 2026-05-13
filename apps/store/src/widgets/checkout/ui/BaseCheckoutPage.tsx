import type { ReactNode } from "react";
import { NotificationConsentFlowModals } from "@/features/notification";
import { buildPriceRows } from "@/shared/composite/order-summary-utils";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import { PaymentWidgetAside } from "@/shared/composite/payment-widget-aside";
import { SummaryCard } from "@/shared/composite/summary-card";
import { UtilityPageSection } from "@/shared/composite/utility-page";
import { MainLayout, MainContent } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import type { PageBreadcrumbItem } from "@/shared/ui-extended/page-breadcrumb";
import type { CheckoutPaymentState } from "../model/use-checkout-payment";
import { CheckoutBodySections } from "./CheckoutBodySections";

interface SummaryRow {
  id: string;
  label: string;
  value: string;
  className?: string;
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
  breadcrumbs: PageBreadcrumbItem[];
}

export function BaseCheckoutPage({
  checkoutState,
  optionsSection,
  summaryRows,
  totalOriginalPrice,
  breadcrumbs,
}: BaseCheckoutPageProps) {
  const {
    appliedCoupon,
    amount,
    discountAmount,
    user,
    paymentWidgetRef,
    isPaymentLoading,
    isSubmitDisabled,
    selectedAddress,
    handleRequestPayment,
    handleChangeCoupon,
    openShippingPopup,
    couponDialog,
    consentFlow,
  } = checkoutState;
  const paymentSummaryRows = appliedCoupon
    ? buildPriceRows({
        originalPrice: totalOriginalPrice,
        totalDiscount: discountAmount,
        shippingCost: 0,
      })
    : summaryRows;

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <PageLayout
            breadcrumbs={breadcrumbs}
            contentClassName="py-4 lg:py-0"
            sidebar={
              <SummaryCard>
                <SummaryCard.Header title="결제 금액" />
                <SummaryCard.Section>
                  {paymentSummaryRows.map((row) => (
                    <SummaryCard.Row
                      key={row.id}
                      label={row.label}
                      value={row.value}
                      className={row.className}
                    />
                  ))}
                  <SummaryCard.Total
                    label="총 결제 금액"
                    value={`${amount.toLocaleString()}원`}
                    valueClassName={appliedCoupon ? "text-blue-600" : undefined}
                  />
                </SummaryCard.Section>
                {user ? (
                  <SummaryCard.Section>
                    <PaymentWidgetAside
                      title="결제 수단"
                      description="결제 방식과 약관 동의를 확인합니다."
                      paymentWidgetRef={paymentWidgetRef}
                      amount={amount}
                      customerKey={user.id}
                    />
                  </SummaryCard.Section>
                ) : null}
              </SummaryCard>
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
            <div className="space-y-8 border-t border-stone-200 pt-4">
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
