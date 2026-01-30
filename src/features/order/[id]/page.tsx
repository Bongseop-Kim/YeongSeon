import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/constants/ROUTES";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { OrderItemCard } from "../components/order-item-card";
import type { Order } from "../types/view/order";
import { calculateOrderTotals } from "../utils/calculated-order-totals";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";
import React from "react";
import { formatDate } from "@/utils/formatDate";

// 더미 주문 데이터 (실제로는 API에서 가져올 것)
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
        product: PRODUCTS_DATA[0],
        quantity: 2,
      },
      {
        id: "item-2",
        type: "product",
        product: PRODUCTS_DATA[1],
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
        product: PRODUCTS_DATA[2],
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
        product: PRODUCTS_DATA[3],
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

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!id) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    // 실제로는 API에서 주문 정보를 가져올 것
    const foundOrder = dummyOrders.find((o) => o.id === id);
    if (!foundOrder) {
      navigate(ROUTES.ORDER_LIST);
      return;
    }

    setOrder(foundOrder);
  }, [id, navigate]);

  if (!order) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex flex-col items-center justify-center min-h-96 space-y-4">
            <div>주문 정보를 불러오는 중...</div>
          </div>
        </MainContent>
      </MainLayout>
    );
  }

  const totals = calculateOrderTotals(order.items);

  const handleReturnRequest = (itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/return/${order.id}/${itemId}`);
  };

  const handleExchangeRequest = (itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/exchange/${order.id}/${itemId}`);
  };

  const handleCancelRequest = (itemId: string) => {
    navigate(`${ROUTES.CLAIM_FORM}/cancel/${order.id}/${itemId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "완료":
        return "bg-green-100 text-green-800";
      case "배송중":
        return "bg-blue-100 text-blue-800";
      case "진행중":
        return "bg-yellow-100 text-yellow-800";
      case "대기중":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
                <Badge className={getStatusColor(order.status)}>
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
                <p>김봉섭</p>
                <p>대전 동구 가양동 418-25 ESSE SION</p>
                <p>042-462-0510</p>
                <p className="text-zinc-500 mt-2">문 앞에 놔주세요.</p>
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
                      actions={
                        order.status === "완료" || order.status === "배송중" ? (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleReturnRequest(item.id)}
                            >
                              반품 요청
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleExchangeRequest(item.id)}
                            >
                              교환 요청
                            </Button>
                          </div>
                        ) : order.status === "진행중" ||
                          order.status === "대기중" ? (
                          <div className="flex gap-2 mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleCancelRequest(item.id)}
                            >
                              취소 요청
                            </Button>
                          </div>
                        ) : null
                      }
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
