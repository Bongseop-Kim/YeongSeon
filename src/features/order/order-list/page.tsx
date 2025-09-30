import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import type { OrderItem } from "./types/order-item";
import { formatDate, getOrderTypeLabel, getOrderDetails } from "./utils/fs";
import { ImageViewer } from "@/components/composite/image-viewer";
import { useNavigate } from "react-router-dom";

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
  // 날짜별로 그룹화
  const groupedByDate = dummyData.reduce((groups, order) => {
    const date = order.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(order);
    return groups;
  }, {} as Record<string, typeof dummyData>);

  // 날짜를 최신순으로 정렬
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <MainLayout>
      <MainContent className="bg-stone-100">
        <TwoPanelLayout
          leftPanel={
            <div>
              {sortedDates.map((date) => (
                <>
                  <Card key={date}>
                    <CardHeader>
                      <CardTitle>{formatDate(date)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {groupedByDate[date].map((order) => (
                        <div
                          key={order.id}
                          className="pb-3"
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
                                <Badge variant="secondary">
                                  {order.status}
                                </Badge>
                              </div>

                              <div className="flex flex-col gap-2">
                                <Label>{getOrderDetails(order)}</Label>

                                <Label className="font-bold">
                                  {order.price.toLocaleString()}원
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Separator />
                </>
              ))}
            </div>
          }
        />
      </MainContent>
    </MainLayout>
  );
}
