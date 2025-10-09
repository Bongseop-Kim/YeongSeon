import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { OrderItem } from "./types/order-item";
import { getOrderTypeLabel, getOrderDetails, formatDate } from "./utils/fs";
import { ImageViewer } from "@/components/composite/image-viewer";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect } from "react";

const dummyData: OrderItem[] = [
  {
    id: "1",
    date: "2025-01-15",
    status: "완료",
    type: "reform",
    orderDetails: {
      tieCount: 3,
      measurementType: "length",
    },
    price: 45000,
    orderNumber: "RF-20250115-001",
    image: "/images/detail/tie1.png",
  },
  {
    id: "2",
    date: "2025-01-15",
    status: "진행중",
    type: "custom-order",
    orderDetails: {
      fabricType: "SILK",
      designType: "PRINTING",
      tieType: "MANUAL",
      quantity: 50,
    },
    price: 580000,
    orderNumber: "CO-20250115-001",
    image: "/images/detail/fabric1.png",
  },
  {
    id: "3",
    date: "2025-01-14",
    status: "완료",
    type: "reform",
    orderDetails: {
      tieCount: 1,
      measurementType: "height",
    },
    price: 15000,
    orderNumber: "RF-20250114-001",
  },
  {
    id: "4",
    date: "2025-01-12",
    status: "배송중",
    type: "custom-order",
    orderDetails: {
      fabricType: "POLY",
      designType: "YARN_DYED",
      tieType: "AUTO",
      quantity: 20,
    },
    price: 240000,
    orderNumber: "CO-20250112-001",
    image: "/images/detail/fabric2.png",
  },
  {
    id: "5",
    date: "2025-01-12",
    status: "완료",
    type: "reform",
    orderDetails: {
      tieCount: 2,
      measurementType: "length",
    },
    price: 30000,
    orderNumber: "RF-20250112-001",
    image: "/images/detail/tie3.png",
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

  return (
    <MainLayout>
      <MainContent className="bg-zinc-100">
        <TwoPanelLayout
          leftPanel={dummyData.map((order) => (
            <Card key={order.id} className="border-b-1">
              <CardHeader className="text-lg font-bold">
                <CardTitle>{formatDate(order.date)}</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  className="py-3 block w-full"
                  onClick={() => {
                    router(`/order/${order.id}`);
                  }}
                >
                  <div className="flex gap-3">
                    {order.image && <ImageViewer image={order.image} />}

                    {/* 주문 정보 섹션 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-bold">
                          {getOrderTypeLabel(order.type)}
                        </Label>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label>{getOrderDetails(order)}</Label>

                        <Label className="font-bold">
                          {order.price.toLocaleString()}원
                        </Label>
                      </div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          ))}
        />
      </MainContent>
    </MainLayout>
  );
}
