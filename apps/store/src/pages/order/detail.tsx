import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { getClaimActionsFromCustomerActions } from "@yeongseon/shared";
import type { CustomerAction } from "@yeongseon/shared";
import {
  buildTrackingUrl,
  getCourierCompanyLabel,
} from "@yeongseon/shared/constants/courier-companies";
import {
  type ClaimActionType,
  CLAIM_ACTION_LABEL,
} from "@yeongseon/shared/constants/claim-actions";
import type {
  OrderItem,
  ShippingInfo,
  TrackingInfo,
} from "@yeongseon/shared/types/view/order";

import { CustomOrderOptionsSection } from "@/shared/composite/custom-order-options-section";
import { Empty } from "@/shared/composite/empty";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import { OrderStatusBadge } from "@/shared/composite/status-badge";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Separator } from "@/shared/ui/separator";
import { Button } from "@/shared/ui-extended/button";
import { RepairShippingAddressBanner } from "@/features/order";
import { useConfirmPurchase, useOrderDetail } from "@/entities/order";
import { buildClaimFormRoute, ROUTES } from "@/shared/constants/ROUTES";

const detailRowLabelClass =
  "shrink-0 text-sm font-medium text-muted-foreground";
const detailRowValueClass = "text-sm text-foreground";

const getOrderErrorDescription = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "잠시 후 다시 시도해주세요.";
  }

  if (error.message.includes("로그인이 필요")) {
    return "로그인 후 다시 시도해주세요.";
  }

  return error.message;
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <p className="flex flex-wrap gap-x-2 gap-y-1">
    <span className={detailRowLabelClass}>{label}</span>
    <span className={detailRowValueClass}>{value}</span>
  </p>
);

const InlineActionLink = ({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="mt-1 inline-block text-sm font-medium text-info underline underline-offset-4"
  >
    {children}
  </a>
);

const renderClaimButtons = (
  customerActions: CustomerAction[],
  item: OrderItem,
  onClaim: (type: ClaimActionType, itemId: string) => void,
) => {
  const actions = getClaimActionsFromCustomerActions(customerActions).filter(
    (actionType) => item.type !== "token" || actionType === "cancel",
  );

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex gap-2">
      {actions.map((actionType) => (
        <Button
          key={actionType}
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onClaim(actionType, item.id)}
        >
          {CLAIM_ACTION_LABEL[actionType]}
        </Button>
      ))}
    </div>
  );
};

const StateCallout = ({
  tone,
  children,
}: {
  tone: "info" | "success" | "destructive";
  children: React.ReactNode;
}) => {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success-muted text-success"
      : tone === "destructive"
        ? "border-destructive/20 bg-destructive/8 text-destructive"
        : "border-info/20 bg-info-muted text-info";

  return (
    <div className={`rounded-xl border p-4 text-sm ${toneClass}`}>
      {children}
    </div>
  );
};

const PurchaseConfirmSection = ({ orderId }: { orderId: string }) => {
  const { mutate, isPending, isSuccess, isError, error } =
    useConfirmPurchase(orderId);

  if (isSuccess) {
    return (
      <StateCallout tone="success">구매확정이 완료되었습니다.</StateCallout>
    );
  }

  return (
    <div className="space-y-3">
      {isError && (
        <StateCallout tone="destructive">
          {getOrderErrorDescription(error) ||
            "구매확정에 실패했습니다. 다시 시도해주세요."}
        </StateCallout>
      )}
      <Button
        onClick={() => mutate()}
        disabled={isPending}
        className="w-full"
        size="sm"
      >
        {isPending ? "처리 중..." : "구매확정"}
      </Button>
    </div>
  );
};

const RepairShippingPendingSection = ({ orderId }: { orderId: string }) => {
  const navigate = useNavigate();

  return (
    <RepairShippingAddressBanner
      onRegisterTracking={() =>
        navigate(`${ROUTES.REPAIR_SHIPPING}/${orderId}`)
      }
    />
  );
};

const RepairShippingInTransitSection = ({
  courierCompany,
  trackingNumber,
}: {
  courierCompany: string;
  trackingNumber: string;
}) => {
  const trackingUrl = buildTrackingUrl(courierCompany, trackingNumber);

  return (
    <div className="space-y-2">
      <DetailRow
        label="택배사:"
        value={getCourierCompanyLabel(courierCompany)}
      />
      <DetailRow label="송장번호:" value={trackingNumber} />
      {trackingUrl && (
        <InlineActionLink href={trackingUrl}>배송조회</InlineActionLink>
      )}
    </div>
  );
};

const OrderDetailSkeleton = () => (
  <MainLayout>
    <MainContent>
      <PageLayout contentClassName="py-4 lg:py-8">
        <div className="animate-pulse space-y-8">
          <div className="space-y-3 border-b border-stone-200 pb-6">
            <div className="h-4 w-20 rounded bg-zinc-200" />
            <div className="h-10 w-56 rounded bg-zinc-200" />
            <div className="h-4 w-72 rounded bg-zinc-200" />
          </div>
          <div className="space-y-4 border-t border-stone-200 pt-5">
            <div className="h-6 w-28 rounded bg-zinc-200" />
            <div className="h-20 w-full rounded bg-zinc-100" />
          </div>
          <div className="space-y-4 border-t border-stone-200 pt-5">
            <div className="h-6 w-32 rounded bg-zinc-200" />
            <div className="h-24 w-full rounded bg-zinc-100" />
            <div className="h-24 w-full rounded bg-zinc-100" />
          </div>
        </div>
      </PageLayout>
    </MainContent>
  </MainLayout>
);

const ShippingInfoSection = ({ info }: { info: ShippingInfo }) => (
  <div className="space-y-2">
    <DetailRow label="수령인:" value={info.recipientName} />
    <DetailRow label="연락처:" value={info.recipientPhone} />
    <DetailRow
      label="주소:"
      value={
        <>
          ({info.postalCode}) {info.address}
          {info.addressDetail && ` ${info.addressDetail}`}
        </>
      }
    />
    {info.deliveryMemo && (
      <DetailRow label="배송메모:" value={info.deliveryMemo} />
    )}
    {info.deliveryRequest && (
      <DetailRow label="배송요청:" value={info.deliveryRequest} />
    )}
  </div>
);

const TrackingInfoSection = ({ info }: { info: TrackingInfo }) => {
  const trackingUrl = buildTrackingUrl(
    info.courierCompany,
    info.trackingNumber,
  );

  return (
    <div className="space-y-2">
      <DetailRow
        label="택배사:"
        value={getCourierCompanyLabel(info.courierCompany)}
      />
      <DetailRow label="송장번호:" value={info.trackingNumber} />
      {info.shippedAt && (
        <DetailRow label="발송일시:" value={formatDate(info.shippedAt)} />
      )}
      {trackingUrl && (
        <InlineActionLink href={trackingUrl}>배송조회</InlineActionLink>
      )}
    </div>
  );
};

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { order, isLoading, isError, error, isNotFound, refetch } =
    useOrderDetail(id);

  useEffect(() => {
    if (!id) {
      navigate(ROUTES.ORDER_LIST);
    }
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  if (isError) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-6 lg:py-10">
            <div className="mx-auto max-w-2xl" data-testid="order-detail-error">
              <Empty
                title="주문 정보를 불러오지 못했습니다."
                description={getOrderErrorDescription(error)}
              />
              <div className="mt-6 flex justify-center gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  다시 시도
                </Button>
                <Button onClick={() => navigate(ROUTES.ORDER_LIST)}>
                  주문 목록으로
                </Button>
              </div>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  if (isNotFound || !order) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-6 lg:py-10">
            <div className="mx-auto max-w-2xl">
              <Empty
                title="주문 정보를 찾을 수 없습니다."
                description="주문 목록에서 다시 확인해주세요."
              />
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  const handleClaimRequest = (type: ClaimActionType, itemId: string) => {
    navigate(buildClaimFormRoute(type, order.id, itemId));
  };
  const canConfirmPurchase = order.customerActions.some(
    (action) => action === "confirm_purchase",
  );
  const isRepairShippingPending =
    order.orderType === "repair" && order.status === "발송대기";
  const isRepairWithTracking =
    order.orderType === "repair" &&
    !!order.trackingInfo?.courierCompany &&
    !!order.trackingInfo?.trackingNumber;
  const showTaskSection = isRepairShippingPending || isRepairWithTracking;

  return (
    <MainLayout>
      <MainContent>
        <PageLayout
          contentClassName="py-4 lg:py-8"
          sidebar={
            <div className="space-y-5">
              <UtilityPageAside
                title="결제 정보"
                description="주문에 반영된 결제 금액입니다."
                tone="muted"
                className="rounded-2xl"
              >
                {order.orderType !== "token" ? (
                  <UtilityKeyValueRow label="배송비" value="무료" />
                ) : null}
                <UtilityKeyValueRow
                  className="pt-5"
                  label="총 결제 금액"
                  value={
                    <span className="text-base font-semibold tracking-tight text-info">
                      {order.totalPrice.toLocaleString()}원
                    </span>
                  }
                />
              </UtilityPageAside>

              {showTaskSection && (
                <UtilityPageAside
                  title="현재 할 일"
                  description="주문 상태에 따라 지금 처리할 수 있는 작업입니다."
                  tone="muted"
                  className="rounded-2xl"
                >
                  <div className="space-y-3">
                    {isRepairShippingPending ? (
                      <RepairShippingPendingSection orderId={order.id} />
                    ) : null}

                    {isRepairWithTracking && order.trackingInfo ? (
                      <RepairShippingInTransitSection
                        courierCompany={order.trackingInfo.courierCompany}
                        trackingNumber={order.trackingInfo.trackingNumber}
                      />
                    ) : null}
                  </div>
                </UtilityPageAside>
              )}
            </div>
          }
          actionBar={
            <Button
              onClick={() => navigate(ROUTES.ORDER_LIST)}
              variant="outline"
              className="w-full"
              size="xl"
            >
              주문 목록으로
            </Button>
          }
        >
          <div className="space-y-8" data-testid="order-detail-root">
            <UtilityPageIntro
              eyebrow="Order Detail"
              title="주문 상세"
              description="주문 상태, 배송 정보, 상품 구성과 후속 작업을 확인합니다."
              meta={
                <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                  <span>주문번호 {order.orderNumber}</span>
                  <span className="text-stone-300">/</span>
                  <span>{formatDate(order.date)}</span>
                  <span className="text-stone-300">/</span>
                  <OrderStatusBadge status={order.status} />
                </div>
              }
            />

            {order.orderType !== "token" ? (
              <UtilityPageSection
                title="배송지 정보"
                description="수령인과 배송 요청 사항을 확인합니다."
              >
                <div className="border-t border-stone-200 py-5">
                  {order.shippingInfo ? (
                    <ShippingInfoSection info={order.shippingInfo} />
                  ) : (
                    <p className="text-sm text-zinc-500">
                      배송지 정보가 없습니다.
                    </p>
                  )}
                </div>
              </UtilityPageSection>
            ) : null}

            {order.trackingInfo &&
            (order.orderType !== "repair" || isRepairWithTracking) ? (
              <UtilityPageSection
                title="배송 추적"
                description="출고 이후 배송 흐름을 확인합니다."
              >
                <div className="border-t border-stone-200 py-5">
                  <TrackingInfoSection info={order.trackingInfo} />
                </div>
              </UtilityPageSection>
            ) : null}

            {canConfirmPurchase && (
              <PurchaseConfirmSection orderId={order.id} />
            )}

            <UtilityPageSection
              title={
                order.items.length === 0
                  ? "주문 상품"
                  : `주문 상품 ${order.items.length}개`
              }
              description="상품 구성과 클레임 가능 동작을 확인합니다."
            >
              <div className="border-t border-stone-200">
                {order.items.length === 0 ? (
                  <div className="py-5">
                    <p className="text-sm text-zinc-500">
                      표시할 주문 상품이 없습니다.{" "}
                      <button
                        type="button"
                        className="font-medium text-info underline underline-offset-4"
                        onClick={() => navigate(ROUTES.CLAIM_LIST)}
                      >
                        클레임 목록에서 확인하세요.
                      </button>
                    </p>
                  </div>
                ) : (
                  order.items.map((item, index) => (
                    <React.Fragment key={item.id}>
                      {(() => {
                        const isSample = item.type === "sample";
                        const isCustomizableItem =
                          item.type === "custom" || isSample;
                        const orderData = isCustomizableItem
                          ? isSample
                            ? item.sampleData
                            : item.customData
                          : null;

                        return (
                          <>
                            <div className="py-5">
                              <OrderItemCard
                                item={item}
                                showQuantity={true}
                                showPrice={true}
                                actions={renderClaimButtons(
                                  order.customerActions,
                                  item,
                                  handleClaimRequest,
                                )}
                              />
                            </div>
                            {orderData && (
                              <>
                                <Separator />
                                <div className="py-5">
                                  <p className="text-base font-semibold tracking-tight text-zinc-950">
                                    {isSample
                                      ? "샘플 제작 옵션"
                                      : "주문 제작 옵션"}
                                  </p>
                                  <p className="mt-1 text-sm text-zinc-500">
                                    제작 조건과 참조 이미지를 확인합니다.
                                  </p>
                                  <div className="mt-4">
                                    <CustomOrderOptionsSection
                                      options={orderData.options}
                                      referenceImageUrls={
                                        orderData.referenceImageUrls
                                      }
                                      additionalNotes={
                                        orderData.additionalNotes
                                      }
                                      hasSample={isSample}
                                      sampleType={
                                        isSample
                                          ? (item.sampleData?.sampleType ??
                                            null)
                                          : null
                                      }
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                            {index < order.items.length - 1 ? (
                              <Separator />
                            ) : null}
                          </>
                        );
                      })()}
                    </React.Fragment>
                  ))
                )}
              </div>
            </UtilityPageSection>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default OrderDetailPage;
