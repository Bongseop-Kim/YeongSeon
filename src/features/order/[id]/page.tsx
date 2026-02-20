import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildClaimDetailRoute, ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { calculateOrderTotals } from "@/features/order/utils/calculated-order-totals";
import React from "react";
import { formatDate } from "@/utils/formatDate";
import { useOrderDetail } from "@/features/order/api/order-query";
import { Empty } from "@/components/composite/empty";
import type { OrderItem, OrderStatus } from "@/features/order/types/view/order";

type ClaimActionType = "return" | "exchange" | "cancel";

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  완료: "bg-green-100 text-green-800",
  배송중: "bg-blue-100 text-blue-800",
  진행중: "bg-yellow-100 text-yellow-800",
  취소: "bg-red-100 text-red-800",
  대기중: "bg-gray-100 text-gray-800",
};

const CLAIM_ACTIONS_BY_STATUS: Partial<Record<OrderStatus, ClaimActionType[]>> = {
  완료: ["return", "exchange"],
  배송중: ["return", "exchange"],
  진행중: ["cancel"],
  대기중: ["cancel"],
};

const CLAIM_ACTION_LABEL: Record<ClaimActionType, string> = {
  return: "반품 요청",
  exchange: "교환 요청",
  cancel: "취소 요청",
};

const getClaimActions = (status: OrderStatus): ClaimActionType[] =>
  CLAIM_ACTIONS_BY_STATUS[status] ?? [];

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
  status: OrderStatus,
  item: OrderItem,
  onClaim: (type: ClaimActionType, itemId: string) => void,
) => {
  const actions = getClaimActions(status);
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

const OrderDetailSkeleton = () => (
  <MainLayout>
    <MainContent>
      <TwoPanelLayout
        leftPanel={
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
        }
        rightPanel={
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
      />
    </MainContent>
  </MainLayout>
);

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
          <Card>
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

  const totals = calculateOrderTotals(order.items);

  const handleClaimRequest = (type: ClaimActionType, itemId: string) => {
    navigate(buildClaimDetailRoute(type, order.id, itemId));
  };

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <Card>
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
                <Badge className={STATUS_BADGE_CLASS[order.status]}>
                  {order.status}
                </Badge>
              </CardHeader>

              <CardContent>
                <Separator />
              </CardContent>

              {/* 배송지 정보 */}
              <CardHeader>
                <CardTitle>배송지 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-zinc-500">
                  현재 주문 상세 API에는 배송지 정보가 포함되지 않습니다.
                </p>
              </CardContent>

              <CardContent>
                <Separator />
              </CardContent>

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
                      actions={renderClaimButtons(order.status, item, handleClaimRequest)}
                    />
                  </CardContent>
                  {index < order.items.length - 1 && (
                    <CardContent>
                      <Separator />
                    </CardContent>
                  )}
                </React.Fragment>
              ))}
            </Card>
          }
          rightPanel={
            <Card>
              <CardHeader>
                <CardTitle>결제 정보</CardTitle>
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
                  <span>무료</span>
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
          }
          button={
            <Button
              onClick={() => navigate(ROUTES.ORDER_LIST)}
              variant="outline"
              className="w-full"
              size="xl"
            >
              주문 목록으로
            </Button>
          }
        />
      </MainContent>
    </MainLayout>
  );
};

export default OrderDetailPage;
