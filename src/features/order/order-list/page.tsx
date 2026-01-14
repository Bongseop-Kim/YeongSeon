import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Empty } from "@/components/composite/empty";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/utils/formatDate";
import { OrderItemCard } from "../components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect } from "react";
import React from "react";
import { ROUTES } from "@/constants/ROUTES";
import { useOrders } from "../api/order-query";
export default function OrderListPage() {
  const navigate = useNavigate();
  const { setSearchEnabled } = useSearchStore();
  const { data: orders = [], isLoading, error } = useOrders();

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder: "주문 검색...",
      onSearch: (query, dateFilter) => {
        console.log("검색:", query);
        console.log("기간:", dateFilter);
        // 검색 로직 구현
      },
    });

    return () => setSearchEnabled(false);
  }, []);

  const handleReturnRequest = (orderId: string, itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/return/${orderId}/${itemId}`);
  };

  const handleExchangeRequest = (orderId: string, itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/exchange/${orderId}/${itemId}`);
  };

  const handleCancelRequest = (orderId: string, itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/cancel/${orderId}/${itemId}`);
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
        <TwoPanelLayout
          leftPanel={
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
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReturnRequest(order.id, item.id);
                                    }}
                                  >
                                    반품 요청
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancelRequest(order.id, item.id);
                                    }}
                                  >
                                    취소 요청
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleExchangeRequest(order.id, item.id);
                                    }}
                                  >
                                    교환 요청
                                  </Button>
                                </div>
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
          }
        />
      </MainContent>
    </MainLayout>
  );
}
