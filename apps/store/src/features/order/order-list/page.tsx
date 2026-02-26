import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Empty } from "@/components/composite/empty";
import { Button } from "@/components/ui/button";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect, useMemo, useState } from "react";
import React from "react";
import { ROUTES } from "@/constants/ROUTES";
import { useOrders } from "@/features/order/api/order-query";
import {
  toDateString,
  type ListFilters,
} from "@/features/order/api/list-filters";
import { useDebouncedValue } from "@/features/order/hooks/use-debounced-value";
import {
  CLAIM_ACTION_LABEL,
  getClaimActions,
} from "@yeongseon/shared/constants/claim-actions";

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
  const { data: orders = [], isLoading, error } = useOrders(queryFilters);

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
    itemId: string
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
            <div>
              {orders.length === 0 ? (
                <Card>
                  <Empty
                    title="주문 내역이 없습니다."
                    description="첫 주문을 시작해보세요!"
                  />
                </Card>
              ) : (
                orders.map((order) => (
                  <Card key={order.id}>
                    {/* 주문 헤더 */}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {formatDate(order.date)}
                        </CardTitle>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>
                      <div className="text-sm text-zinc-500 mt-1">
                        주문번호: {order.orderNumber}
                      </div>
                    </CardHeader>

                    {/* 주문 상품 목록 */}
                    <div className="space-y-0">
                      {order.items.map((item) => (
                        <React.Fragment key={item.id}>
                          <CardContent className="py-4">
                            <OrderItemCard
                              item={item}
                              onClick={() =>
                                navigate(`${ROUTES.ORDER_DETAIL}/${order.id}`)
                              }
                              actions={
                              getClaimActions(order.status).length > 0 ? (
                                <div className="flex gap-2">
                                  {getClaimActions(order.status).map(
                                    (actionType) => (
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
                                            item.id
                                          );
                                        }}
                                      >
                                        {CLAIM_ACTION_LABEL[actionType]}
                                      </Button>
                                    )
                                  )}
                                </div>
                              ) : undefined
                            }
                            />
                          </CardContent>
                        </React.Fragment>
                      ))}
                    </div>

                    {/* 주문 총액 */}
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold">주문 총액</Label>
                        <Label className="text-lg font-bold">
                          {order.totalPrice.toLocaleString()}원
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
