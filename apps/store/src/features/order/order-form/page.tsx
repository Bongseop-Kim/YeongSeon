import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Button } from "@/components/ui-extended/button";
import { Separator } from "@/components/ui/separator";
import { PaymentActionBar } from "@/components/composite/payment-action-bar";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { OrderFormItemCard } from "@/features/order/order-form/components/order-form-item-card";
import { ReformOrderItemCard } from "@/features/order/order-form/components/reform-order-item-card";
import React from "react";
import { useOrderStore } from "@/store/order";
import { useCouponSelect } from "@/features/coupon";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import { formatPhoneNumber } from "@/lib/phone-format";
import { getDeliveryRequestLabel } from "@/constants/DELIVERY_REQUEST_OPTIONS";
import { calculateOrderTotals } from "@yeongseon/shared/utils/calculated-order-totals";
import { useAuthStore } from "@/store/auth";
import { createOrder } from "@/features/order/api/order-api";
import { useReformPricing } from "@/features/reform/api/reform-query";
import { type PaymentWidgetRef } from "@/components/composite/payment-widget";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";
import { NotificationConsentFlowModals } from "@/features/notification/components/notification-consent-flow-modals";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { OrderPriceSummaryAside } from "@/components/composite/order-price-summary-aside";
import { PaymentWidgetAside } from "@/components/composite/payment-widget-aside";

const OrderFormPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const isPaymentProcessingRef = useRef(false);
  const navigate = useNavigate();
  const {
    items: orderItems,
    hasOrderItems,
    updateOrderItemCoupon,
  } = useOrderStore();
  const { openCouponSelect, dialog: couponDialog } = useCouponSelect();
  const { user } = useAuthStore();

  const { data: reformPricing, isLoading: isReformPricingLoading } =
    useReformPricing();

  const { selectedAddressId, selectedAddress, openShippingPopup } =
    useShippingAddressPopup();

  useEffect(() => {
    if (!hasOrderItems()) {
      navigate(ROUTES.CART);
    }
  }, [navigate, hasOrderItems]);

  const handleChangeCoupon = async (itemId: string) => {
    const item = orderItems.find((i) => i.id === itemId);
    if (!item) return;

    const selectedCoupon = await openCouponSelect(item.appliedCoupon?.id);

    if (selectedCoupon === null) return;

    // undefined이면 쿠폰 제거, 객체이면 쿠폰 적용
    updateOrderItemCoupon(itemId, selectedCoupon);

    toast.success(
      selectedCoupon
        ? `${selectedCoupon.coupon.name}이(가) 적용되었습니다.`
        : "쿠폰 사용을 취소했습니다.",
    );
  };

  const proceedToPayment = async () => {
    if (isPaymentProcessingRef.current) return;
    isPaymentProcessingRef.current = true;
    setIsPaymentLoading(true);

    try {
      if (!user) {
        toast.error("로그인이 필요합니다. 로그인 후 결제를 진행해주세요.");
        navigate(ROUTES.LOGIN);
        return;
      }

      if (!selectedAddressId || !selectedAddress) {
        toast.error("배송지를 선택해주세요.");
        return;
      }

      if (orderItems.length === 0) {
        toast.error("주문할 상품이 없습니다.");
        return;
      }

      if (!paymentWidgetRef.current) {
        toast.error(
          "결제위젯이 준비되지 않았습니다. 잠시 후 다시 시도해주세요.",
        );
        return;
      }

      const orderResult = await createOrder({
        items: orderItems,
        shippingAddressId: selectedAddressId,
      });
      if (orderResult.totalAmount !== totals.totalPrice) {
        throw new Error(
          `결제 금액이 변경되었습니다(서버: ${orderResult.totalAmount.toLocaleString()}원). 페이지를 새로고침 후 다시 시도해주세요.`,
        );
      }
      const firstItem = orderItems[0];
      const orderName =
        orderItems.length === 1
          ? firstItem.type === "product"
            ? firstItem.product.name
            : "수선"
          : `${firstItem.type === "product" ? firstItem.product.name : "수선"} 외 ${orderItems.length - 1}건`;

      await paymentWidgetRef.current.requestPayment({
        orderId: orderResult.paymentGroupId,
        orderName,
        successUrl: `${window.location.origin}${ROUTES.PAYMENT_SUCCESS}`,
        failUrl: `${window.location.origin}${ROUTES.PAYMENT_FAIL}`,
      });
    } catch (error) {
      // 사용자가 결제를 취소한 경우 등
      const errorCode = hasStringCode(error) ? error.code : "";
      const errorMessage =
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다.";
      if (errorCode !== "USER_CANCEL") {
        toast.error(errorMessage);
      }
    } finally {
      isPaymentProcessingRef.current = false;
      setIsPaymentLoading(false);
    }
  };

  const { initiateWithConsentCheck: handleRequestPayment, consentFlow } =
    useNotificationConsentFlow(proceedToPayment);

  const hasReformItems = orderItems.some((item) => item.type === "reform");
  const estimatedShippingCost = hasReformItems
    ? (reformPricing?.shippingCost ?? 0)
    : 0;
  const totals = calculateOrderTotals(orderItems, estimatedShippingCost);
  const isPricingReady = !hasReformItems || !isReformPricingLoading;

  if (orderItems.length === 0) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 데이터를 찾을 수 없습니다.</div>
            <Button onClick={() => navigate(ROUTES.CART)}>
              장바구니로 돌아가기
            </Button>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <>
      <MainLayout>
        <MainContent className="overflow-visible">
          <PageLayout
            contentClassName="py-4 lg:py-8"
            sidebar={
              <div className="space-y-4">
                <OrderPriceSummaryAside
                  title="결제 금액"
                  description="주문서에 반영된 할인과 배송비를 포함한 예상 결제 금액입니다."
                  originalPrice={totals.originalPrice}
                  totalDiscount={totals.totalDiscount}
                  shippingCost={totals.shippingCost}
                  totalPrice={totals.totalPrice}
                  totalClassName="text-blue-600"
                />
                {user && isPricingReady && (
                  <PaymentWidgetAside
                    title="결제 수단"
                    description="결제 방식과 약관 동의를 확인합니다."
                    paymentWidgetRef={paymentWidgetRef}
                    amount={totals.totalPrice}
                    customerKey={user.id}
                    className="rounded-2xl"
                    consent={
                      hasReformItems
                        ? {
                            id: "order-form-cancellation-consent",
                            checked: cancellationConsent,
                            onCheckedChange: setCancellationConsent,
                            label: "취소/환불 불가 동의",
                            description:
                              "판매자가 수선물을 수령(접수)한 이후부터 취소 및 환불이 불가능합니다.",
                          }
                        : undefined
                    }
                  />
                )}
              </div>
            }
            actionBar={
              <PaymentActionBar
                amount={totals.totalPrice}
                onClick={handleRequestPayment}
                isLoading={isPaymentLoading}
                isPriceReady={isPricingReady}
                disabled={
                  !user ||
                  !selectedAddress ||
                  (hasReformItems && !cancellationConsent)
                }
                data-testid="order-submit-button"
                helperText={
                  !selectedAddress ? (
                    <p className="text-sm text-center text-zinc-500">
                      배송지를 추가하면 주문을 진행할 수 있어요
                    </p>
                  ) : null
                }
              />
            }
          >
            <div className="space-y-8">
              <UtilityPageIntro
                eyebrow="Order"
                title="주문서"
                description="배송지와 쿠폰을 확인한 뒤 결제를 진행합니다."
                meta={
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
                    <span>
                      주문 상품{" "}
                      <span className="font-medium text-zinc-950">
                        {orderItems.length}개
                      </span>
                    </span>
                    <span className="text-stone-300">/</span>
                    <span>
                      예상 결제{" "}
                      <span className="font-medium text-zinc-950">
                        {totals.totalPrice.toLocaleString()}원
                      </span>
                    </span>
                  </div>
                }
              />

              <UtilityPageSection
                title="배송지"
                description="결제 전에 배송지와 요청 사항을 마지막으로 확인합니다."
              >
                <div
                  className="border-t border-stone-200"
                  data-testid="order-shipping-card"
                >
                  <div className="flex items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-zinc-950">
                        {selectedAddress?.recipientName || "배송지 정보"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        기본 배송지와 수령 요청 사항을 확인합니다.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openShippingPopup}
                      data-testid="order-shipping-manage"
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
                        <p className="text-zinc-600">
                          {getDeliveryRequestLabel(
                            selectedAddress.deliveryRequest,
                            selectedAddress.deliveryMemo,
                          )}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-zinc-500">
                      배송지를 추가해주세요.
                    </div>
                  )}
                </div>
              </UtilityPageSection>

              <UtilityPageSection
                title={`주문 상품 ${orderItems.length}개`}
                description="상품별 쿠폰과 수선 접수 정보를 확인합니다."
                className="pb-2"
              >
                <div
                  className="border-t border-stone-200"
                  data-testid="order-items-card"
                >
                  {orderItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {item.type === "product" ? (
                        <OrderFormItemCard
                          item={item}
                          onChangeCoupon={() => handleChangeCoupon(item.id)}
                        />
                      ) : (
                        <ReformOrderItemCard
                          item={item}
                          onChangeCoupon={() => handleChangeCoupon(item.id)}
                        />
                      )}
                      {index < orderItems.length - 1 ? <Separator /> : null}
                    </React.Fragment>
                  ))}
                </div>
              </UtilityPageSection>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
      {couponDialog}
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
};

export default OrderFormPage;
