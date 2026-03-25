import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { OrderFormItemCard } from "@/features/order/order-form/components/order-form-item-card";
import { ReformOrderItemCard } from "@/features/order/order-form/components/reform-order-item-card";
import React from "react";
import { useOrderStore } from "@/store/order";
import { useCouponSelect } from "@/features/coupon/hooks/use-coupon-select";
import { toast } from "@/lib/toast";
import { hasStringCode } from "@/lib/type-guard";
import { formatPhoneNumber } from "@/lib/phone-format";
import { getDeliveryRequestLabel } from "@/constants/DELIVERY_REQUEST_OPTIONS";
import { calculateOrderTotals } from "@yeongseon/shared/utils/calculated-order-totals";
import { useAuthStore } from "@/store/auth";
import { createOrder } from "@/features/order/api/order-api";
import { useReformPricing } from "@/features/reform/api/reform-query";
import PaymentWidget, {
  type PaymentWidgetRef,
} from "@/components/composite/payment-widget";
import { useShippingAddressPopup } from "@/features/shipping/hooks/useShippingAddressPopup";
import { useNotificationConsentFlow } from "@/features/notification/hooks/use-notification-consent-flow";
import { NotificationConsentFlowModals } from "@/features/notification/components/notification-consent-flow-modals";

const OrderFormPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
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
    // 주문 아이템이 없으면 장바구니로 리다이렉트
    if (!hasOrderItems()) {
      navigate(ROUTES.CART);
    }
  }, [navigate, hasOrderItems]);

  const handleChangeCoupon = async (itemId: string) => {
    const item = orderItems.find((i) => i.id === itemId);
    if (!item) return;

    const selectedCoupon = await openCouponSelect(item.appliedCoupon?.id);

    // 쿠폰 적용 (null이면 쿠폰 제거)
    updateOrderItemCoupon(itemId, selectedCoupon ?? undefined);

    // 성공 메시지 표시
    toast.success(
      selectedCoupon
        ? `${selectedCoupon.coupon.name}이(가) 적용되었습니다.`
        : "쿠폰 사용을 취소했습니다.",
    );
  };

  const proceedToPayment = async () => {
    if (isPaymentLoading) return;
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
            sidebar={
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>결제 금액</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">상품 금액</span>
                      <span>{totals.originalPrice.toLocaleString()}원</span>
                    </div>
                    {totals.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-600">할인 금액</span>
                        <span className="text-red-500">
                          -{totals.totalDiscount.toLocaleString()}원
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-600">배송비</span>
                      <span>
                        {totals.shippingCost > 0
                          ? `${totals.shippingCost.toLocaleString()}원`
                          : "무료"}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-semibold">
                      <span>총 결제 금액</span>
                      <span className="text-blue-600">
                        {totals.totalPrice.toLocaleString()}원
                      </span>
                    </div>
                  </CardContent>
                </Card>
                {user && isPricingReady && (
                  <Card>
                    <CardContent className="px-0">
                      <PaymentWidget
                        ref={paymentWidgetRef}
                        amount={totals.totalPrice}
                        customerKey={user.id}
                      />
                    </CardContent>
                  </Card>
                )}
              </>
            }
            actionBar={
              <div className="space-y-2">
                <Button
                  onClick={handleRequestPayment}
                  className="w-full"
                  size="xl"
                  data-testid="order-submit-button"
                  disabled={
                    !user ||
                    !selectedAddress ||
                    isPaymentLoading ||
                    !isPricingReady
                  }
                >
                  {isPaymentLoading
                    ? "결제 요청 중..."
                    : !isPricingReady
                      ? "가격 로딩 중..."
                      : `${totals.totalPrice.toLocaleString()}원 결제하기`}
                </Button>
                {!selectedAddress && (
                  <p className="text-sm text-center text-zinc-500">
                    배송지를 추가하면 주문을 진행할 수 있어요
                  </p>
                )}
              </div>
            }
          >
            <Card data-testid="order-shipping-card">
              <CardHeader className="flex justify-between items-center">
                <CardTitle>
                  {selectedAddress?.recipientName || "배송지 정보"}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openShippingPopup}
                  data-testid="order-shipping-manage"
                >
                  배송지 관리
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedAddress ? (
                  <>
                    <div className="space-y-1 text-sm">
                      <p>
                        ({selectedAddress.postalCode}) {selectedAddress.address}{" "}
                        {selectedAddress.detailAddress}
                      </p>
                      <p>{formatPhoneNumber(selectedAddress.recipientPhone)}</p>
                    </div>
                    {selectedAddress.deliveryRequest && (
                      <p className="text-sm text-zinc-600">
                        {getDeliveryRequestLabel(
                          selectedAddress.deliveryRequest,
                          selectedAddress.deliveryMemo,
                        )}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-500">
                    배송지를 추가해주세요.
                  </div>
                )}
              </CardContent>

              <CardContent>
                <Separator />
              </CardContent>

              <CardHeader data-testid="order-items-card">
                <CardTitle>주문 상품 {orderItems.length}개</CardTitle>
              </CardHeader>

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
                  {index < orderItems.length - 1 && <Separator />}
                </React.Fragment>
              ))}
            </Card>
          </PageLayout>
        </MainContent>
      </MainLayout>
      {couponDialog}
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
};

export default OrderFormPage;
