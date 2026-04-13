import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { Input } from "@/shared/ui-extended/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import {
  OrderFormItemCard,
  ReformOrderItemCard,
  RepairShippingAddressBanner,
} from "@/features/order";
import React from "react";
import { COURIER_COMPANIES } from "@yeongseon/shared/constants/courier-companies";
import { useOrderStore } from "@/shared/store/order";
import { useCouponSelect } from "@/features/coupon";
import { toast } from "@/shared/lib/toast";
import { hasStringCode } from "@/shared/lib/type-guard";
import { ShippingAddressCard } from "@/shared/composite/shipping-address-card";
import { calculateOrderTotals } from "@yeongseon/shared/utils/calculated-order-totals";
import { useAuthStore } from "@/shared/store/auth";
import { createOrder } from "@/entities/order";
import { useReformPricing } from "@/entities/reform";
import { type PaymentWidgetRef } from "@/shared/composite/payment-widget";
import { useShippingAddressPopup } from "@/features/shipping";
import {
  useNotificationConsentFlow,
  NotificationConsentFlowModals,
} from "@/features/notification";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { Field, FieldTitle, FieldContent } from "@/shared/ui/field";
import { OrderSummaryAside } from "@/shared/composite/order-summary-aside";
import { buildPriceRows } from "@/shared/composite/order-summary-utils";
import { PaymentWidgetAside } from "@/shared/composite/payment-widget-aside";
const OrderFormPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [cancellationConsent, setCancellationConsent] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const isPaymentProcessingRef = useRef(false);
  const navigate = useNavigate();
  const [repairCourierCompany, setRepairCourierCompany] = useState("");
  const [repairTrackingNumber, setRepairTrackingNumber] = useState("");

  const {
    items: orderItems,
    hasOrderItems,
    updateOrderItemCoupon,
    setRepairTracking,
  } = useOrderStore();

  useEffect(() => {
    setRepairTracking(
      repairCourierCompany || repairTrackingNumber
        ? {
            courierCompany: repairCourierCompany,
            trackingNumber: repairTrackingNumber,
          }
        : undefined,
    );
  }, [repairCourierCompany, repairTrackingNumber, setRepairTracking]);
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
                <OrderSummaryAside
                  title="결제 금액"
                  description="주문서에 반영된 할인과 배송비를 포함한 예상 결제 금액입니다."
                  rows={buildPriceRows(totals)}
                  totalAmount={totals.totalPrice}
                  totalClassName="text-blue-600"
                />
                {user && isPricingReady && (
                  <PaymentWidgetAside
                    title="결제 수단"
                    description="결제 방식과 약관 동의를 확인합니다."
                    paymentWidgetRef={paymentWidgetRef}
                    amount={totals.totalPrice}
                    customerKey={user.id}
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

              <ShippingAddressCard
                address={selectedAddress ?? null}
                editable
                onChangeClick={openShippingPopup}
              />

              <UtilityPageSection
                title={`주문 상품 ${orderItems.length}개`}
                description="상품별 쿠폰과 수선 접수 정보를 확인합니다."
                className="pb-2"
              >
                <div
                  className="border-t border-stone-200"
                  data-testid="order-items-card"
                >
                  {hasReformItems && (
                    <div className="py-5">
                      <RepairShippingAddressBanner />
                      <Field className="mt-4">
                        <FieldTitle>이미 발송하셨나요?</FieldTitle>
                        <FieldContent>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Select
                                value={repairCourierCompany}
                                onValueChange={setRepairCourierCompany}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="택배사 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COURIER_COMPANIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Input
                              type="text"
                              placeholder="송장번호"
                              value={repairTrackingNumber}
                              className="flex-[2]"
                              onChange={(e) =>
                                setRepairTrackingNumber(e.target.value)
                              }
                            />
                          </div>
                        </FieldContent>
                      </Field>
                      <Separator className="mt-5" />
                    </div>
                  )}
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
