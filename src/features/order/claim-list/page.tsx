import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Empty } from "@/components/composite/empty";
import type { ClaimItem } from "../types/claim-item";
import { getClaimTypeLabel } from "../utils/claim-utils";
import { getOrderItemDetails, formatDate } from "../utils/fs";
import { ImageViewer } from "@/components/composite/image-viewer";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect } from "react";
import { PRODUCTS_DATA } from "@/features/shop/constants/PRODUCTS_DATA";

// 더미 클레임 데이터
const dummyClaims: ClaimItem[] = [
  {
    id: "claim-1",
    claimNumber: "CLM-20250115-001",
    date: "2025-01-15",
    status: "처리중",
    type: "return",
    orderId: "order-1",
    orderNumber: "ORD-20250115-001",
    reason: "사이즈가 맞지 않음",
    item: {
      id: "item-1",
      type: "product",
      product: PRODUCTS_DATA[0],
      quantity: 2,
    },
  },
  {
    id: "claim-2",
    claimNumber: "CLM-20250115-002",
    date: "2025-01-15",
    status: "접수",
    type: "exchange",
    orderId: "order-1",
    orderNumber: "ORD-20250115-001",
    reason: "색상 변경 요청",
    item: {
      id: "item-2",
      type: "product",
      product: PRODUCTS_DATA[1],
      selectedOption: { id: "45", name: "45cm", additionalPrice: 0 },
      quantity: 1,
    },
  },
  {
    id: "claim-3",
    claimNumber: "CLM-20250114-001",
    date: "2025-01-14",
    status: "완료",
    type: "cancel",
    orderId: "order-2",
    orderNumber: "ORD-20250114-002",
    reason: "단순 변심",
    item: {
      id: "item-4",
      type: "product",
      product: PRODUCTS_DATA[2],
      quantity: 2,
    },
  },
  {
    id: "claim-4",
    claimNumber: "CLM-20250113-001",
    date: "2025-01-13",
    status: "거부",
    type: "return",
    orderId: "order-3",
    orderNumber: "ORD-20250113-003",
    reason: "제품 불량",
    item: {
      id: "item-5",
      type: "product",
      product: PRODUCTS_DATA[3],
      quantity: 2,
    },
  },
  {
    id: "claim-5",
    claimNumber: "CLM-20250112-001",
    date: "2025-01-12",
    status: "완료",
    type: "cancel",
    orderId: "order-4",
    orderNumber: "ORD-20250112-004",
    reason: "배송 전 취소",
    item: {
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
  }, [setSearchEnabled]);

  return (
    <MainLayout>
      <MainContent>
        <TwoPanelLayout
          leftPanel={
            <div>
              {dummyClaims.length === 0 ? (
                <Card>
                  <Empty
                    title="취소/반품/교환 내역이 없습니다."
                    description="문제가 있으시면 고객센터로 문의해주세요."
                  />
                </Card>
              ) : (
                dummyClaims.map((claim, index) => (
                  <Card key={claim.id}>
                    {/* 클레임 헤더 */}
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {formatDate(claim.date)}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getClaimTypeLabel(claim.type)}
                          </Badge>
                          <Badge variant="secondary">{claim.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                        <span>{claim.claimNumber}</span>
                        <span>·</span>
                        <span>주문번호: {claim.orderNumber}</span>
                      </div>
                    </CardHeader>

                    <Separator />

                    {/* 클레임 상품 정보 */}
                    <CardContent className="py-4">
                      <button
                        type="button"
                        className="block w-full mb-3"
                        onClick={() => {
                          router(`/claim/${claim.id}`);
                        }}
                      >
                        <div className="flex gap-3">
                          {/* 이미지 */}
                          {claim.item.type === "product" && (
                            <ImageViewer image={claim.item.product.image} />
                          )}

                          {/* 상품 상세 정보 */}
                          <div className="flex-1 text-left">
                            <div className="flex flex-col gap-1">
                              <Label className="font-bold">
                                {claim.item.type === "product"
                                  ? claim.item.product.name
                                  : "넥타이 수선"}
                              </Label>
                              <Label className="text-sm text-zinc-500">
                                {getOrderItemDetails(claim.item)}
                              </Label>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-sm text-zinc-500">
                                  수량: {claim.item.quantity}개
                                </span>
                                <Label className="font-bold">
                                  {claim.item.type === "product"
                                    ? (
                                        claim.item.product.price *
                                        claim.item.quantity
                                      ).toLocaleString()
                                    : (
                                        claim.item.reformData.cost *
                                        claim.item.quantity
                                      ).toLocaleString()}
                                  원
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* 클레임 사유 */}
                      <div className="p-3 bg-zinc-50 rounded-md">
                        <Label className="text-sm text-zinc-600">
                          사유: {claim.reason}
                        </Label>
                      </div>
                    </CardContent>

                    {index < dummyClaims.length - 1 && <Separator />}
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
