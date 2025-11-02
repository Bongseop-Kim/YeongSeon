import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import type { ClaimItem } from "../types/claim-item";
import {
  getClaimTypeLabel,
  getOrderDetails,
  formatDate,
} from "../utils/claim-utils";
import { ImageViewer } from "@/components/composite/image-viewer";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect } from "react";

const dummyData: ClaimItem[] = [
  {
    id: "1",
    date: "2025-01-15",
    status: "처리중",
    type: "return",
    orderId: "ORD-001",
    orderNumber: "RF-20250115-001",
    reason: "사이즈가 맞지 않음",
    orderDetails: {
      tieCount: 3,
      measurementType: "length",
    },
    price: 45000,
    image: "/images/detail/tie1.png",
  },
  {
    id: "2",
    date: "2025-01-15",
    status: "접수",
    type: "exchange",
    orderId: "ORD-002",
    orderNumber: "CO-20250115-001",
    reason: "색상 변경 요청",
    orderDetails: {
      fabricType: "SILK",
      designType: "PRINTING",
      tieType: "MANUAL",
      quantity: 50,
    },
    price: 580000,
    image: "/images/detail/fabric1.png",
  },
  {
    id: "3",
    date: "2025-01-14",
    status: "완료",
    type: "cancel",
    orderId: "ORD-003",
    orderNumber: "RF-20250114-001",
    reason: "단순 변심",
    orderDetails: {
      tieCount: 1,
      measurementType: "height",
    },
    price: 15000,
  },
  {
    id: "4",
    date: "2025-01-12",
    status: "거부",
    type: "return",
    orderId: "ORD-004",
    orderNumber: "CO-20250112-001",
    reason: "제품 불량",
    orderDetails: {
      fabricType: "POLY",
      designType: "YARN_DYED",
      tieType: "AUTO",
      quantity: 20,
    },
    price: 240000,
    image: "/images/detail/fabric2.png",
  },
  {
    id: "5",
    date: "2025-01-12",
    status: "완료",
    type: "cancel",
    orderId: "ORD-005",
    orderNumber: "RF-20250112-001",
    reason: "배송지 변경",
    orderDetails: {
      tieCount: 2,
      measurementType: "length",
    },
    price: 30000,
    image: "/images/detail/tie3.png",
  },
];

export default function ClaimListPage() {
  const router = useNavigate();
  const { setSearchEnabled } = useSearchStore();

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder: "취소/반품/교환 검색...",
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
      <MainContent>
        <TwoPanelLayout
          leftPanel={dummyData.map((claim) => (
            <Card key={claim.id}>
              <CardHeader className="text-lg font-bold">
                <CardTitle>{formatDate(claim.date)}</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  className="py-3 block w-full"
                  onClick={() => {
                    router(`/claim/${claim.id}`);
                  }}
                >
                  <div className="flex gap-3">
                    {claim.image && <ImageViewer image={claim.image} />}

                    {/* 클레임 정보 섹션 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="font-bold">
                          {getClaimTypeLabel(claim.type)}
                        </Label>
                        <Badge variant="secondary">{claim.status}</Badge>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label className="text-zinc-500 text-xs">
                          {claim.reason}
                        </Label>
                        <Label>{getOrderDetails(claim)}</Label>

                        <Label className="font-bold">
                          {claim.price.toLocaleString()}원
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
