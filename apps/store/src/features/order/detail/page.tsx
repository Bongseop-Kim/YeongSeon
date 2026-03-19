import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildClaimFormRoute, ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { CustomOrderOptionsSection } from "@/features/order/components/custom-order-options-section";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { OrderStatusBadge } from "@/components/composite/status-badge";
import React from "react";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import {
  useOrderDetail,
  useConfirmPurchase,
} from "@/features/order/api/order-query";
import { Empty } from "@/components/composite/empty";
import type {
  OrderItem,
  ShippingInfo,
  TrackingInfo,
} from "@yeongseon/shared/types/view/order";
import type { CustomerAction } from "@yeongseon/shared";
import { buildTrackingUrl } from "@yeongseon/shared/constants/courier-companies";
import {
  type ClaimActionType,
  CLAIM_ACTION_LABEL,
} from "@yeongseon/shared/constants/claim-actions";
import { getClaimActionsFromCustomerActions } from "@yeongseon/shared";
import { toast } from "@/lib/toast";
import { REPAIR_SHIPPING_ADDRESS } from "@/constants/REPAIR_SHIPPING";

const getOrderErrorDescription = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "잠시 후 다시 시도해주세요.";
  }

  if (error.message.includes("로그인이 필요")) {
    return "로그인 후 다시 시도해주세요.";
  }

  return error.message;
};

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
    <div className="flex gap-2 mt-3">
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

/** 배송중 또는 배송완료 상태에서 구매확정 버튼을 표시 */
const PurchaseConfirmSection = ({ orderId }: { orderId: string }) => {
  const { mutate, isPending, isSuccess, isError, error } =
    useConfirmPurchase(orderId);

  if (isSuccess) {
    return (
      <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
        구매확정이 완료되었습니다.
      </div>
    );
  }

  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 p-4 space-y-3">
      {isError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {getOrderErrorDescription(error) ||
            "구매확정에 실패했습니다. 다시 시도해주세요."}
        </div>
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

/** 발송대기 상태에서 수선품 발송 안내 카드 표시 */
const RepairShippingPendingSection = ({ orderId }: { orderId: string }) => {
  const navigate = useNavigate();

  const handleCopyAddress = async () => {
    try {
      const text = `${REPAIR_SHIPPING_ADDRESS.recipient} / ${REPAIR_SHIPPING_ADDRESS.address} / ${REPAIR_SHIPPING_ADDRESS.phone}`;
      await navigator.clipboard.writeText(text);
      toast.success("주소가 복사되었습니다.");
    } catch {
      toast.error("주소 복사에 실패했습니다. 수동으로 복사해주세요.");
    }
  };

  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-blue-800">📮 수선품 발송 안내</p>
      <div className="text-sm text-blue-700 bg-white rounded p-2">
        <p className="font-semibold">{REPAIR_SHIPPING_ADDRESS.recipient}</p>
        <p>{REPAIR_SHIPPING_ADDRESS.address}</p>
        <p>{REPAIR_SHIPPING_ADDRESS.phone}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyAddress}>
          주소 복사
        </Button>
        <Button
          size="sm"
          onClick={() => navigate(`${ROUTES.REPAIR_SHIPPING}/${orderId}`)}
        >
          송장번호 등록
        </Button>
      </div>
    </div>
  );
};

/** 발송중 상태에서 택배사/송장번호 및 배송 조회 링크 표시 */
const RepairShippingInTransitSection = ({
  courierCompany,
  trackingNumber,
}: {
  courierCompany: string;
  trackingNumber: string;
}) => {
  const trackingUrl = buildTrackingUrl(courierCompany, trackingNumber);
  return (
    <div className="rounded-md bg-zinc-50 border border-zinc-200 p-4 space-y-1 text-sm">
      <p className="font-semibold">발송 정보</p>
      <p className="text-zinc-600">
        {courierCompany} · {trackingNumber}
      </p>
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline text-xs"
        >
          배송 조회 →
        </a>
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
              <div className="h-6 w-20 bg-zinc-200 rounded" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-4 w-full bg-zinc-200 rounded" />
              <div className="h-4 w-full bg-zinc-200 rounded" />
              <div className="h-4 w-full bg-zinc-200 rounded" />
              <Separator />
              <div className="h-6 w-full bg-zinc-200 rounded" />
            </CardContent>
          </Card>
        }
      >
        <Card className="animate-pulse">
          <CardHeader className="space-y-3">
            <div className="h-6 w-32 bg-zinc-200 rounded" />
            <div className="h-4 w-56 bg-zinc-200 rounded" />
            <div className="h-4 w-40 bg-zinc-200 rounded" />
          </CardHeader>
          <CardContent>
            <Separator />
          </CardContent>
          <CardHeader>
            <div className="h-6 w-24 bg-zinc-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="h-4 w-40 bg-zinc-200 rounded" />
            <div className="h-4 w-72 bg-zinc-200 rounded" />
            <div className="h-4 w-28 bg-zinc-200 rounded" />
          </CardContent>
          <CardContent>
            <Separator />
          </CardContent>
          <CardHeader>
            <div className="h-6 w-36 bg-zinc-200 rounded" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-24 w-full bg-zinc-200 rounded" />
            <div className="h-24 w-full bg-zinc-200 rounded" />
          </CardContent>
        </Card>
      </PageLayout>
    </MainContent>
  </MainLayout>
);

const ShippingInfoSection = ({ info }: { info: ShippingInfo }) => (
  <>
    <p>
      <span className="text-zinc-500">수령인:</span> {info.recipientName}
    </p>
    <p>
      <span className="text-zinc-500">연락처:</span> {info.recipientPhone}
    </p>
    <p>
      <span className="text-zinc-500">주소:</span> ({info.postalCode}){" "}
      {info.address}
      {info.addressDetail && ` ${info.addressDetail}`}
    </p>
    {info.deliveryMemo && (
      <p>
        <span className="text-zinc-500">배송메모:</span> {info.deliveryMemo}
      </p>
    )}
    {info.deliveryRequest && (
      <p>
        <span className="text-zinc-500">배송요청:</span> {info.deliveryRequest}
      </p>
    )}
  </>
);

const TrackingInfoSection = ({ info }: { info: TrackingInfo }) => {
  const trackingUrl = buildTrackingUrl(
    info.courierCompany,
    info.trackingNumber,
  );
  return (
    <>
      <p>
        <span className="text-zinc-500">택배사:</span> {info.courierCompany}
      </p>
      <p>
        <span className="text-zinc-500">송장번호:</span> {info.trackingNumber}
      </p>
      {info.shippedAt && (
        <p>
          <span className="text-zinc-500">발송일시:</span>{" "}
          {formatDate(info.shippedAt)}
        </p>
      )}
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 text-blue-600 underline"
        >
          배송조회
        </a>
      )}
    </>
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
                    <span className="text-zinc-600">배송비</span>
                    <span>무료</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>총 결제 금액</span>
                  <span className="text-blue-600">
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
            {/* 주문 정보 헤더 */}
            <CardHeader className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle>주문 상세</CardTitle>
                <div className="text-sm text-zinc-500">
                  주문번호: {order.orderNumber}
                </div>
                <div className="text-sm text-zinc-500">
                  주문일시: {formatDate(order.date)}
                </div>
              </div>
              <OrderStatusBadge status={order.status} />
            </CardHeader>

            <CardContent>
              <Separator />
            </CardContent>

            {/* 배송지 정보 */}
            {order.orderType !== "token" && (
              <>
                <CardHeader>
                  <CardTitle>배송지 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {order.shippingInfo ? (
                    <ShippingInfoSection info={order.shippingInfo} />
                  ) : (
                    <p className="text-zinc-500">배송지 정보가 없습니다.</p>
                  )}
                </CardContent>
              </>
            )}

            {/* 배송 추적 정보 */}
            {order.trackingInfo && (
              <>
                <CardContent>
                  <Separator />
                </CardContent>
                <CardHeader>
                  <CardTitle>배송 추적</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <TrackingInfoSection info={order.trackingInfo} />
                </CardContent>
              </>
            )}

            {order.orderType !== "token" && (
              <CardContent>
                <Separator />
              </CardContent>
            )}

            {/* 구매확정 */}
            {order.customerActions.some((a) => a === "confirm_purchase") && (
              <CardContent>
                <PurchaseConfirmSection orderId={order.id} />
              </CardContent>
            )}

            {/* 수선품 발송 안내 (발송대기) */}
            {order.status === "발송대기" && (
              <CardContent>
                <RepairShippingPendingSection orderId={order.id} />
              </CardContent>
            )}

            {/* 수선품 발송 정보 (발송중) */}
            {order.status === "발송중" &&
              order.trackingInfo?.courierCompany &&
              order.trackingInfo?.trackingNumber && (
                <CardContent>
                  <RepairShippingInTransitSection
                    courierCompany={order.trackingInfo.courierCompany}
                    trackingNumber={order.trackingInfo.trackingNumber}
                  />
                </CardContent>
              )}

            {/* 주문 상품 목록 */}
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
