import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/ROUTES";
import { Button } from "@/shared/ui-extended/button";
import { Separator } from "@/shared/ui/separator";
import { PaymentActionBar } from "@/shared/composite/payment-action-bar";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import {
  OrderFormItemCard,
  ReformOrderItemCard,
  RepairAddressRows,
  RepairAddressCopyButton,
  RepairShippingMethodChoice,
  TrackingModeToggle,
  TrackingFormFields,
  NoTrackingFormFields,
  PickupRequestFields,
  EMPTY_PICKUP_REQUEST,
  uploadRepairShippingPhotos,
  type RepairShippingMethod,
  type TrackingMode,
  type PickupRequestInfo,
} from "@/features/order";
import { type RepairNoTrackingReason } from "@/shared/constants/REPAIR_SHIPPING";
import { useOrderStore, type RepairShippingDraft } from "@/shared/store/order";
import type { CreateOrderRepairShippingRequest } from "@/entities/order";
import { useCouponSelect } from "@/features/coupon";
import { toast } from "@/shared/lib/toast";
import { hasStringCode } from "@/shared/lib/type-guard";
import { ShippingAddressCard } from "@/shared/composite/shipping-address-card";
import { calculateOrderTotals } from "@yeongseon/shared/utils/calculated-order-totals";
import { useAuthStore } from "@/shared/store/auth";
import { createOrder } from "@/entities/order";
import { useReformPricing } from "@/entities/reform";
import { type PaymentWidgetRef } from "@/shared/composite/payment-widget";
import { useShippingAddressPopup, PostcodeSearch } from "@/features/shipping";
import {
  useNotificationConsentFlow,
  NotificationConsentFlowModals,
} from "@/features/notification";
import { UtilityPageSection } from "@/shared/composite/utility-page";
import { Field, FieldTitle, FieldContent } from "@/shared/ui/field";
import { buildPriceRows } from "@/shared/composite/order-summary-utils";
import { SummaryCard } from "@/shared/composite/summary-card";
import { PaymentWidgetAside } from "@/shared/composite/payment-widget-aside";
const OrderFormPage = () => {
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const paymentWidgetRef = useRef<PaymentWidgetRef | null>(null);
  const isPaymentProcessingRef = useRef(false);
  const navigate = useNavigate();

  // 수선품 발송 방법 (직접 발송 / 방문 수거)
  const [repairMethod, setRepairMethod] =
    useState<RepairShippingMethod>("direct");
  // "이미 발송하셨나요?"는 선택 사항 — null이면 아직 발송 전
  const [trackingMode, setTrackingMode] = useState<TrackingMode | null>(null);
  const [repairCourierCompany, setRepairCourierCompany] = useState("");
  const [repairTrackingNumber, setRepairTrackingNumber] = useState("");
  // TODO(backend): 송장 없음 접수(사유/사진/메모)·발송 사진을 주문 생성에 전달
  const [trackingPhotos, setTrackingPhotos] = useState<File[]>([]);
  const [noTrackingReason, setNoTrackingReason] = useState<
    RepairNoTrackingReason | ""
  >("");
  const [noTrackingPhotos, setNoTrackingPhotos] = useState<File[]>([]);
  const [noTrackingMemo, setNoTrackingMemo] = useState("");
  // 방문 수거 신청 정보
  const [pickupInfo, setPickupInfo] =
    useState<PickupRequestInfo>(EMPTY_PICKUP_REQUEST);
  const [isPickupPostcodeOpen, setIsPickupPostcodeOpen] = useState(false);

  const {
    items: orderItems,
    hasOrderItems,
    updateOrderItemCoupon,
    setRepairShipping,
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
        ? `${selectedCoupon.coupon.name} 적용을 완료했습니다.`
        : "쿠폰 사용을 취소했습니다.",
    );
  };

  const proceedToPayment = async () => {
    if (isPaymentProcessingRef.current) return;
    isPaymentProcessingRef.current = true;
    setIsPaymentLoading(true);

    try {
      if (!user) {
        toast.error("로그인 후 결제를 진행해주세요.");
        navigate(ROUTES.LOGIN);
        return;
      }

      if (!selectedAddressId || !selectedAddress) {
        toast.error("배송지를 선택해주세요.");
        return;
      }

      if (orderItems.length === 0) {
        toast.error("주문할 상품을 먼저 선택해주세요.");
        return;
      }

      if (!paymentWidgetRef.current) {
        toast.error("결제 화면을 준비하고 있어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      // 수선품 발송 정보 구성 (수거 신청은 주문 생성에 포함, 송장/접수는 결제 후 제출)
      let repairShippingRequest: CreateOrderRepairShippingRequest | null = null;
      if (hasReformItems) {
        if (repairMethod === "pickup") {
          const pickup = resolvePickupRequest();
          if (!pickup) {
            toast.error("수거지 이름, 연락처, 주소를 입력해주세요.");
            return;
          }
          repairShippingRequest = { method: "pickup", pickup };
        } else {
          repairShippingRequest = { method: "direct" };
        }

        // 발송 사진은 결제 리다이렉트 전에 업로드해 URL로 보관
        let draft: RepairShippingDraft = { method: repairMethod };
        if (repairMethod === "direct") {
          if (trackingMode === "has-tracking") {
            const photos = await uploadRepairShippingPhotos(trackingPhotos);
            draft = {
              method: "direct",
              tracking: {
                courierCompany: repairCourierCompany,
                trackingNumber: repairTrackingNumber,
                photos,
              },
            };
          } else if (trackingMode === "no-tracking" && noTrackingReason) {
            const photos = await uploadRepairShippingPhotos(noTrackingPhotos);
            draft = {
              method: "direct",
              noTracking: {
                reason: noTrackingReason,
                memo: noTrackingMemo,
                photos,
              },
            };
          }
        }
        setRepairShipping(draft);
      }

      const orderResult = await createOrder({
        items: orderItems,
        shippingAddressId: selectedAddressId,
        repairShipping: repairShippingRequest,
      });
      if (orderResult.totalAmount !== totalPayable) {
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
          : "결제를 시작하지 못했어요. 잠시 후 다시 시도해주세요.";
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

  /** 수거지 정보 — 배송지와 동일 체크 시 선택된 배송지를 사용 */
  const resolvePickupRequest = () => {
    if (pickupInfo.sameAsShipping && selectedAddress) {
      return {
        recipientName: selectedAddress.recipientName,
        recipientPhone: selectedAddress.recipientPhone,
        postalCode: selectedAddress.postalCode ?? null,
        address: [selectedAddress.address, selectedAddress.detailAddress]
          .filter(Boolean)
          .join(" "),
        detailAddress: null,
      };
    }
    const name = pickupInfo.name.trim();
    const phone = pickupInfo.phone.trim();
    const address = pickupInfo.address.trim();
    if (!name || !phone || !address) return null;
    return {
      recipientName: name,
      recipientPhone: phone,
      postalCode: pickupInfo.postalCode.trim() || null,
      address,
      detailAddress: pickupInfo.detailAddress.trim() || null,
    };
  };

  const hasReformItems = orderItems.some((item) => item.type === "reform");
  const estimatedShippingCost = hasReformItems
    ? (reformPricing?.shippingCost ?? 0)
    : 0;
  const totals = calculateOrderTotals(orderItems, estimatedShippingCost);
  // 방문 수거비 — pricing_constants(REFORM_PICKUP_FEE) 서버 단일 소스
  const pickupFee =
    hasReformItems && repairMethod === "pickup"
      ? (reformPricing?.pickupFee ?? 0)
      : 0;
  const totalPayable = totals.totalPrice + pickupFee;
  const priceRows = [
    ...buildPriceRows(totals),
    ...(pickupFee > 0
      ? [
          {
            id: "pickup-fee",
            label: "방문 수거비",
            value: `${pickupFee.toLocaleString()}원`,
          },
        ]
      : []),
  ];
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
            breadcrumbs={[
              { label: "홈", to: ROUTES.HOME },
              { label: "장바구니", to: ROUTES.CART },
              { label: "주문서" },
            ]}
            sidebar={
              <SummaryCard>
                <SummaryCard.Header
                  title="결제 금액"
                  description="주문서에 반영된 할인과 배송비를 포함한 예상 결제 금액입니다."
                />
                <SummaryCard.Section>
                  {priceRows.map((row) => (
                    <SummaryCard.Row
                      key={row.id}
                      label={row.label}
                      value={row.value}
                      className={row.className}
                    />
                  ))}
                  <SummaryCard.Total
                    label="총 결제 금액"
                    value={`${totalPayable.toLocaleString()}원`}
                    valueClassName="text-blue-600"
                  />
                </SummaryCard.Section>
                {user && isPricingReady && (
                  <SummaryCard.Section>
                    <PaymentWidgetAside
                      title="결제 수단"
                      description="결제 방식과 약관 동의를 확인합니다."
                      paymentWidgetRef={paymentWidgetRef}
                      amount={totalPayable}
                      customerKey={user.id}
                    />
                  </SummaryCard.Section>
                )}
              </SummaryCard>
            }
            actionBar={
              <PaymentActionBar
                amount={totalPayable}
                onClick={handleRequestPayment}
                isLoading={isPaymentLoading}
                isPriceReady={isPricingReady}
                disabled={!user || !selectedAddress}
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
            <div className="space-y-8 border-t border-stone-200 pt-2">
              <ShippingAddressCard
                address={selectedAddress ?? null}
                editable
                onChangeClick={openShippingPopup}
              />

              {hasReformItems && (
                <UtilityPageSection
                  title="수선품 발송"
                  description="수선품을 보내는 방법을 선택해주세요."
                >
                  <div className="border-t border-stone-200 pt-5">
                    <RepairShippingMethodChoice
                      value={repairMethod}
                      onChange={setRepairMethod}
                      pickupBadge={
                        reformPricing
                          ? `+${reformPricing.pickupFee.toLocaleString()}원`
                          : undefined
                      }
                      directContent={
                        <div className="space-y-6">
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="text-sm font-semibold text-zinc-950">
                                수선품 보내실 곳
                              </h3>
                              <RepairAddressCopyButton />
                            </div>
                            <RepairAddressRows className="mt-4" />
                          </div>
                          <Field>
                            <FieldTitle>
                              이미 발송하셨나요?{" "}
                              <span className="font-normal text-zinc-400">
                                (선택)
                              </span>
                            </FieldTitle>
                            <FieldContent className="gap-4">
                              <TrackingModeToggle
                                value={trackingMode}
                                onChange={setTrackingMode}
                              />
                              {trackingMode === "has-tracking" ? (
                                <TrackingFormFields
                                  idPrefix="order-form"
                                  courierCompany={repairCourierCompany}
                                  onCourierCompanyChange={
                                    setRepairCourierCompany
                                  }
                                  trackingNumber={repairTrackingNumber}
                                  onTrackingNumberChange={
                                    setRepairTrackingNumber
                                  }
                                  photos={trackingPhotos}
                                  onPhotosChange={setTrackingPhotos}
                                />
                              ) : null}
                              {trackingMode === "no-tracking" ? (
                                <NoTrackingFormFields
                                  idPrefix="order-form"
                                  reason={noTrackingReason}
                                  onReasonChange={setNoTrackingReason}
                                  photos={noTrackingPhotos}
                                  onPhotosChange={setNoTrackingPhotos}
                                  memo={noTrackingMemo}
                                  onMemoChange={setNoTrackingMemo}
                                />
                              ) : null}
                            </FieldContent>
                          </Field>
                        </div>
                      }
                      pickupContent={
                        <PickupRequestFields
                          value={pickupInfo}
                          onChange={setPickupInfo}
                          shippingAddress={
                            selectedAddress
                              ? {
                                  name: selectedAddress.recipientName,
                                  phone: selectedAddress.recipientPhone,
                                  address: [
                                    selectedAddress.address,
                                    selectedAddress.detailAddress,
                                  ]
                                    .filter(Boolean)
                                    .join(" "),
                                }
                              : null
                          }
                          onSearchAddress={() => setIsPickupPostcodeOpen(true)}
                        />
                      }
                    />
                  </div>
                </UtilityPageSection>
              )}

              <UtilityPageSection
                title={`주문 상품 ${orderItems.length}개`}
                description="상품별 쿠폰을 확인합니다."
                className="pb-2"
              >
                <div
                  className="border-t border-stone-200"
                  data-testid="order-items-card"
                >
                  {orderItems.map((item, index) => (
                    <Fragment key={item.id}>
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
                    </Fragment>
                  ))}
                </div>
              </UtilityPageSection>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
      {couponDialog}
      <NotificationConsentFlowModals consentFlow={consentFlow} />
      <PostcodeSearch
        isOpen={isPickupPostcodeOpen}
        onClose={() => setIsPickupPostcodeOpen(false)}
        onComplete={(data) => {
          setPickupInfo((prev) => ({
            ...prev,
            address: data.roadAddress || data.jibunAddress,
            postalCode: data.zonecode,
          }));
          setIsPickupPostcodeOpen(false);
        }}
      />
    </>
  );
};

export default OrderFormPage;
