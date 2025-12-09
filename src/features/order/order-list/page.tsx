import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Empty } from "@/components/composite/empty";
import { Button } from "@/components/ui/button";
import type { Order } from "../types/order-item";
import { formatDate } from "../utils/fs";
import { OrderItemCard } from "../components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect } from "react";
import React from "react";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";

// 더미 주문 데이터
const dummyOrders: Order[] = [
  {
    id: "order-1",
    orderNumber: "ORD-20250115-001",
    date: "2025-01-15",
    status: "완료",
    totalPrice: 135000,
    items: [
      {
        id: "item-1",
        type: "product",
        product: PRODUCTS_DATA[0], // 실크 넥타이 1
        quantity: 2,
      },
      {
        id: "item-2",
        type: "product",
        product: PRODUCTS_DATA[1], // 실크 넥타이 2
        selectedOption: { id: "45", name: "45cm", additionalPrice: 0 },
        quantity: 1,
      },
      {
        id: "item-3",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-1",
            measurementType: "length",
            tieLength: 145,
          },
          cost: 15000,
        },
      },
    ],
  },
  {
    id: "order-2",
    orderNumber: "ORD-20250114-002",
    date: "2025-01-14",
    status: "배송중",
    totalPrice: 96000,
    items: [
      {
        id: "item-4",
        type: "product",
        product: PRODUCTS_DATA[2], // 실크 넥타이 3
        quantity: 2,
      },
    ],
  },
  {
    id: "order-3",
    orderNumber: "ORD-20250113-003",
    date: "2025-01-13",
    status: "진행중",
    totalPrice: 78000,
    items: [
      {
        id: "item-5",
        type: "product",
        product: PRODUCTS_DATA[3], // 실크 넥타이 4
        quantity: 2,
      },
    ],
  },
  {
    id: "order-4",
    orderNumber: "ORD-20250112-004",
    date: "2025-01-12",
    status: "완료",
    totalPrice: 30000,
    items: [
      {
        id: "item-6",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-2",
            measurementType: "height",
            wearerHeight: 175,
          },
          cost: 15000,
        },
      },
      {
        id: "item-7",
        type: "reform",
        quantity: 1,
        reformData: {
          tie: {
            id: "tie-3",
            measurementType: "length",
            tieLength: 150,
          },
          cost: 15000,
        },
      },
    ],
  },
];

export default function OrderListPage() {
  const router = useNavigate();
  const { setSearchEnabled } = useSearchStore();

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
    console.log("반품 요청:", orderId, itemId);
    // 반품 요청 로직
  };

  const handleExchangeRequest = (orderId: string, itemId: string) => {
    console.log("교환 요청:", orderId, itemId);
    // 교환 요청 로직
  };

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <div>
              {dummyOrders.length === 0 ? (
                <Card>
                  <Empty
                    title="주문 내역이 없습니다."
                    description="첫 주문을 시작해보세요!"
                  />
                </Card>
              ) : (
                dummyOrders.map((order) => (
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
                              onClick={() => router(`/order/${order.id}`)}
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
