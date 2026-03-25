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

import { CustomOrderOptionsSection } from "@/components/composite/custom-order-options-section";
import { Empty } from "@/components/composite/empty";
import { OrderItemCard } from "@/components/composite/order-item-card";
import { OrderStatusBadge } from "@/components/composite/status-badge";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui-extended/button";
import { RepairShippingAddressBanner } from "@/features/order/components/repair-shipping-address-banner";
import {
  useConfirmPurchase,
  useOrderDetail,
} from "@/features/order/api/order-query";
import { buildClaimFormRoute, ROUTES } from "@/constants/ROUTES";

const detailRowLabelClass =
  "shrink-0 text-sm font-medium text-foreground-muted";
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
    <div className="space-y-3 rounded-xl border border-info/20 bg-info-muted p-4">
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
      <PageLayout
        sidebar={
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 w-20 rounded bg-surface-muted" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full rounded bg-surface-muted" />
              <div className="h-4 w-full rounded bg-surface-muted" />
              <div className="h-4 w-full rounded bg-surface-muted" />
              <Separator />
              <div className="h-6 w-full rounded bg-surface-muted" />
            </CardContent>
          </Card>
        }
      >
        <Card className="animate-pulse">
          <CardHeader className="space-y-3">
            <div className="h-6 w-32 rounded bg-surface-muted" />
            <div className="h-4 w-56 rounded bg-surface-muted" />
            <div className="h-4 w-40 rounded bg-surface-muted" />
          </CardHeader>
          <CardContent>
            <Separator />
          </CardContent>
          <CardHeader>
            <div className="h-6 w-24 rounded bg-surface-muted" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-40 rounded bg-surface-muted" />
            <div className="h-4 w-72 rounded bg-surface-muted" />
            <div className="h-4 w-28 rounded bg-surface-muted" />
          </CardContent>
          <CardContent>
            <Separator />
          </CardContent>
          <CardHeader>
            <div className="h-6 w-36 rounded bg-surface-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-24 w-full rounded bg-surface-muted" />
            <div className="h-24 w-full rounded bg-surface-muted" />
          </CardContent>
        </Card>
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
          <Card data-testid="order-detail-error">
            <Empty
              title="주문 정보를 불러오지 못했습니다."
              description={getOrderErrorDescription(error)}
            />
            <CardContent className="pt-0">
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  다시 시도
                </Button>
                <Button onClick={() => navigate(ROUTES.ORDER_LIST)}>
                  주문 목록으로
                </Button>
              </div>
            </CardContent>
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  if (isNotFound || !order) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="주문 정보를 찾을 수 없습니다."
              description="주문 목록에서 다시 확인해주세요."
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  const handleClaimRequest = (type: ClaimActionType, itemId: string) => {
    navigate(buildClaimFormRoute(type, order.id, itemId));
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout
          sidebar={
            <Card>
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.orderType !== "token" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground-muted">배송비</span>
                    <span className="text-foreground">무료</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>총 결제 금액</span>
                  <span className="text-info">
                    {order.totalPrice.toLocaleString()}원
                  </span>
                </div>
              </CardContent>
            </Card>
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
          <Card data-testid="order-detail-root">
            <CardHeader className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>주문 상세</CardTitle>
                <div className="text-sm text-foreground-muted">
                  주문번호: {order.orderNumber}
                </div>
                <div className="text-sm text-foreground-muted">
                  주문일시: {formatDate(order.date)}
                </div>
              </div>
              <OrderStatusBadge status={order.status} />
            </CardHeader>

            <CardContent>
              <Separator />
            </CardContent>

            {order.orderType !== "token" && (
              <>
                <CardHeader>
                  <CardTitle>배송지 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {order.shippingInfo ? (
                    <ShippingInfoSection info={order.shippingInfo} />
                  ) : (
                    <p className="text-sm text-foreground-muted">
                      배송지 정보가 없습니다.
                    </p>
                  )}
                </CardContent>
              </>
            )}

            {order.trackingInfo && order.orderType !== "repair" && (
              <>
                <CardContent>
                  <Separator />
                </CardContent>
                <CardHeader>
                  <CardTitle>배송 추적</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrackingInfoSection info={order.trackingInfo} />
                </CardContent>
              </>
            )}

            {order.orderType !== "token" && (
              <CardContent>
                <Separator />
              </CardContent>
            )}

            {order.customerActions.some((a) => a === "confirm_purchase") && (
              <CardContent>
                <PurchaseConfirmSection orderId={order.id} />
              </CardContent>
            )}

            {order.orderType === "repair" && order.status === "발송대기" && (
              <CardContent>
                <RepairShippingPendingSection orderId={order.id} />
              </CardContent>
            )}

            {order.orderType === "repair" &&
              order.status === "발송중" &&
              order.trackingInfo?.courierCompany &&
              order.trackingInfo?.trackingNumber && (
                <CardContent>
                  <RepairShippingInTransitSection
                    courierCompany={order.trackingInfo.courierCompany}
                    trackingNumber={order.trackingInfo.trackingNumber}
                  />
                </CardContent>
              )}

            <CardHeader>
              <CardTitle>주문 상품 {order.items.length}개</CardTitle>
            </CardHeader>

            {order.items.map((item, index) => (
              <React.Fragment key={item.id}>
                <CardContent>
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
                </CardContent>
                {(item.type === "custom" || item.type === "sample") && (
                  <>
                    <CardContent>
                      <Separator />
                    </CardContent>
                    <CardHeader>
                      <CardTitle>
                        {item.type === "sample"
                          ? "샘플 제작 옵션"
                          : "주문 제작 옵션"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CustomOrderOptionsSection
                        options={
                          item.type === "sample"
                            ? item.sampleData.options
                            : item.customData.options
                        }
                        referenceImageUrls={
                          item.type === "sample"
                            ? item.sampleData.referenceImageUrls
                            : item.customData.referenceImageUrls
                        }
                        additionalNotes={
                          item.type === "sample"
                            ? item.sampleData.additionalNotes
                            : item.customData.additionalNotes
                        }
                        sampleType={
                          item.type === "sample"
                            ? item.sampleData.sampleType
                            : null
                        }
                      />
                    </CardContent>
                  </>
                )}
                {index < order.items.length - 1 && (
                  <CardContent>
                    <Separator />
                  </CardContent>
                )}
              </React.Fragment>
            ))}
          </Card>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
};

export default OrderDetailPage;
