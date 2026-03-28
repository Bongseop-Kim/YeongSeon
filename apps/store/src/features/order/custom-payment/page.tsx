import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MainLayout, MainContent } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui-extended/button";
import { Separator } from "@/components/ui/separator";
import { PaymentWidgetAside } from "@/components/composite/payment-widget-aside";
import { PaymentActionBar } from "@/components/composite/payment-action-bar";
import { OrderSummaryAside } from "@/components/composite/order-summary-aside";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { type PaymentWidgetRef } from "@/components/composite/payment-widget";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { useAuthStore } from "@/store/auth";
import { useCreateCustomOrder } from "@/features/custom-order/api/custom-order-query";
import { toCreateCustomOrderInput } from "@/features/custom-order/api/custom-order-mapper";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";
import { NotificationConsentFlowModals } from "@/features/notification/components/notification-consent-flow-modals";
import { ROUTES } from "@/constants/ROUTES";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import { formatPhoneNumber } from "@/lib/phone-format";
import { getDeliveryRequestLabel } from "@/constants/DELIVERY_REQUEST_OPTIONS";
import {
  getFabricLabel,
  getFinishingLabel,
  getSewingStyleLabel,
  getSizeLabel,
  getTieTypeLabel,
} from "@/features/custom-order/utils/option-labels";
import { isCustomOrderPaymentState } from "@/features/order/custom-payment/types";

export default function CustomPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const rawState = location.state;
  const state = isCustomOrderPaymentState(rawState) ? rawState : null;

  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const pendingOrderIdRef = useRef<string | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);

  const { user } = useAuthStore();
  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup({
      initialSelectedAddressId: state?.shippingAddressId ?? null,
    });
  const createCustomOrder = useCreateCustomOrder();

  useEffect(() => {
    if (state) return;
    navigate(ROUTES.CUSTOM_ORDER, { replace: true });
  }, [navigate, state]);

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
        const request = toCreateCustomOrderInput({
          shippingAddressId: selectedAddressId,
          options: state.coreOptions,
          referenceImages: state.imageRefs,
          additionalNotes: state.additionalNotes,
        });
        const response = await createCustomOrder.mutateAsync(request);
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
        orderName: `주문제작 (수량 ${state.coreOptions.quantity}개)`,
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

  if (!state) return null;

  const amount = serverAmount ?? state.totalCost;

  const isSubmitDisabled =
    !user || !selectedAddress || !cancellationConsent || isPaymentLoading;

  const summaryRows = [
    {
      id: "amount",
      label: "상품 금액",
      value: `${amount.toLocaleString()}원`,
    },
    {
      id: "quantity",
      label: "수량",
      value: `${state.coreOptions.quantity}개`,
    },
  ];

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <PageLayout
            contentClassName="py-4 lg:py-8"
            sidebar={
              <div className="space-y-4">
                <OrderSummaryAside
                  title="결제 금액"
                  rows={summaryRows}
                  totalAmount={amount}
                />
                {user && (
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
                      description:
                        "주문제작은 진행 후 중도 취소 및 환불이 불가능합니다.",
                    }}
                    className="rounded-2xl"
                  />
                )}
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
                eyebrow="Custom Order"
                title="주문제작 결제"
                description="배송지를 확인하고 결제 수단을 선택한 뒤 결제를 진행합니다."
                meta={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-subtle">
                    <span>
                      주문제작{" "}
                      <span className="font-medium text-foreground">
                        {state.coreOptions.quantity}개
                      </span>
                    </span>
                    <span className="text-border">/</span>
                    <span>
                      예상 결제{" "}
                      <span className="font-medium text-foreground">
                        {amount.toLocaleString()}원
                      </span>
                    </span>
                  </div>
                }
              />

              <UtilityPageSection
                title="주문 옵션 확인"
                description="수정이 필요한 항목이 있으면 이전 페이지로 돌아가 조정할 수 있습니다."
              >
                <div className="divide-y divide-border/70 border-y border-border py-2 text-sm">
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground-muted">수량</span>
                    <span className="text-foreground">
                      {state.coreOptions.quantity}개
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground-muted">원단</span>
                    <span className="text-foreground">
                      {getFabricLabel(state.coreOptions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground-muted">봉제</span>
                    <span className="text-foreground">
                      {getTieTypeLabel(state.coreOptions.tieType)} ·{" "}
                      {getSewingStyleLabel(state.coreOptions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground-muted">사이즈</span>
                    <span className="text-foreground">
                      {getSizeLabel(state.coreOptions.sizeType)}, 폭{" "}
                      {state.coreOptions.tieWidth}cm
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-foreground-muted">상세 옵션</span>
                    <span className="text-foreground">
                      {getFinishingLabel(state.coreOptions)}
                    </span>
                  </div>
                  <div className="py-3">
                    <span className="text-foreground-muted">참고 이미지</span>
                    {state.imageRefs.length > 0 ? (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {state.imageRefs.map((ref) => (
                          <div
                            key={ref.fileId}
                            className="aspect-square overflow-hidden rounded-lg border border-border bg-surface-muted"
                          >
                            <img
                              src={ref.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="ml-4 text-foreground">없음</span>
                    )}
                  </div>
                  {state.additionalNotes ? (
                    <div className="py-3">
                      <span className="text-foreground-muted">요청사항</span>
                      <p className="mt-2 whitespace-pre-wrap text-foreground">
                        {state.additionalNotes}
                      </p>
                    </div>
                  ) : null}
                </div>
              </UtilityPageSection>

              <UtilityPageSection
                title="배송지"
                description="결제 전에 수령 정보를 마지막으로 확인합니다."
              >
                <div className="border-t border-border">
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {selectedAddress?.recipientName || "배송지 정보"}
                      </p>
                      <p className="mt-1 text-sm text-foreground-muted">
                        기본 배송지와 수령 요청 사항을 확인합니다.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openShippingPopup}
                    >
                      배송지 관리
                    </Button>
                  </div>

                  <Separator />

                  {selectedAddress ? (
                    <div className="space-y-2 py-5 text-sm">
                      <p>
                        ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                        {selectedAddress.detailAddress}
                      </p>
                      <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
                      {selectedAddress.deliveryRequest ? (
                        <p className="text-foreground-subtle">
                          {getDeliveryRequestLabel(
                            selectedAddress.deliveryRequest,
                            selectedAddress.deliveryMemo,
                          )}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-foreground-muted">
                      배송지를 추가해주세요.
                    </div>
                  )}
                </div>
              </UtilityPageSection>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
}
