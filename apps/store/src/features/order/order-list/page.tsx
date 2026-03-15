import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Empty } from "@/components/composite/empty";
import { OrderStatusBadge } from "@/components/composite/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/constants/ROUTES";
import { useOrders } from "@/features/order/api/order-query";
import {
  toDateString,
  type ListFilters,
} from "@/features/order/utils/list-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  CLAIM_ACTION_LABEL,
  getClaimActionsForItem,
} from "@yeongseon/shared/constants/claim-actions";
import type { Order } from "@yeongseon/shared/types/view/order";

type OrderTypeFilter = "전체" | "일반구매" | "수선" | "주문제작" | "토큰구매";

const ORDER_TYPE_TABS: OrderTypeFilter[] = [
  "전체",
  "일반구매",
  "수선",
  "주문제작",
  "토큰구매",
];

const ORDER_TYPE_MAP: Record<
  Exclude<OrderTypeFilter, "전체">,
  Order["orderType"]
> = {
  일반구매: "sale",
  수선: "repair",
  주문제작: "custom",
  토큰구매: "token",
};

export default function OrderListPage() {
  const navigate = useNavigate();
  const { setSearchEnabled } = useSearchStore();
  const [searchFilters, setSearchFilters] = useState<ListFilters>({});
  const debouncedKeyword = useDebouncedValue(searchFilters.keyword ?? "", 300);
  const queryFilters = useMemo(
    () => ({
      keyword: debouncedKeyword,
      dateFrom: searchFilters.dateFrom,
      dateTo: searchFilters.dateTo,
    }),
    [debouncedKeyword, searchFilters.dateFrom, searchFilters.dateTo],
  );
  const [activeTab, setActiveTab] = useState<OrderTypeFilter>("전체");
  const { data: orders = [], isLoading, error } = useOrders(queryFilters);

  const filteredOrders = useMemo(() => {
    if (activeTab === "전체") return orders;
    const orderType = ORDER_TYPE_MAP[activeTab];
    return orders.filter((order) => order.orderType === orderType);
  }, [orders, activeTab]);

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder: "주문 검색...",
      onSearch: (query, dateFilter) => {
        setSearchFilters({
          keyword: query,
          dateFrom: toDateString(dateFilter.customRange?.from),
          dateTo: toDateString(dateFilter.customRange?.to),
        });
      },
    });

    return () => setSearchEnabled(false);
  }, [setSearchEnabled]);

  const handleClaimRequest = (
    type: string,
    orderId: string,
    itemId: string,
  ) => {
    navigate(`${ROUTES.CLAIM_FORM}/${type}/${orderId}/${itemId}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">주문 목록을 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <Card>
            <Empty
              title="주문 목록을 불러올 수 없습니다."
              description={
                error instanceof Error ? error.message : "오류가 발생했습니다."
              }
            />
          </Card>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">주문 내역</h2>
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {ORDER_TYPE_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      activeTab === tab
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {filteredOrders.length === 0 ? (
                <Card>
                  <Empty
                    title={
                      activeTab === "전체"
                        ? "주문 내역이 없습니다."
                        : `${activeTab} 내역이 없습니다.`
                    }
                    description={
                      activeTab === "전체"
                        ? "첫 주문을 시작해보세요!"
                        : `${activeTab}에 해당하는 주문이 없습니다.`
                    }
                  />
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  return (
                    <Card key={order.id} data-testid={`order-card-${order.id}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {formatDate(order.date)}
                          </CardTitle>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="mt-1 text-sm text-zinc-500">
                          주문번호: {order.orderNumber}
                        </div>
                      </CardHeader>

                      <div className="space-y-0">
                        {order.items.map((item) => {
                          const claimActions = getClaimActionsForItem(
                            order.status,
                            item.type,
                          );
                          return (
                            <CardContent
                              key={item.id}
                              className="py-4"
                              data-testid={`order-item-link-${order.id}-${item.id}`}
                            >
                              <OrderItemCard
                                item={item}
                                onClick={() =>
                                  navigate(`${ROUTES.ORDER_DETAIL}/${order.id}`)
                                }
                                actions={
                                  claimActions.length > 0 ? (
                                    <div className="flex gap-2">
                                      {claimActions.map((actionType) => (
                                        <Button
                                          key={actionType}
                                          variant="outline"
                                          size="sm"
                                          className="flex-1"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleClaimRequest(
                                              actionType,
                                              order.id,
                                              item.id,
                                            );
                                          }}
                                        >
                                          {CLAIM_ACTION_LABEL[actionType]}
                                        </Button>
                                      ))}
                                    </div>
                                  ) : undefined
                                }
                              />
                            </CardContent>
                          );
                        })}
                      </div>

                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">주문 총액</Label>
                          <Label className="text-lg font-bold">
                            {order.totalPrice.toLocaleString()}원
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
