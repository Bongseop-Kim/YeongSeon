import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Empty } from "@/components/composite/empty";
import { ClaimStatusBadge } from "@/components/composite/status-badge";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { buildClaimDetailRoute } from "@/constants/ROUTES";
import { useClaims } from "@/features/claim/api/claims-query";
import {
  toDateString,
  type ListFilters,
} from "@/features/order/utils/list-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchTabs } from "@/hooks/use-search-tabs";
import type { ClaimType } from "@yeongseon/shared/types/view/claim-item";

type ClaimTypeFilter = "전체" | "취소" | "반품" | "교환" | "토큰환불";

const CLAIM_TYPE_TABS: ClaimTypeFilter[] = [
  "전체",
  "취소",
  "반품",
  "교환",
  "토큰환불",
];

const CLAIM_TYPE_MAP: Record<Exclude<ClaimTypeFilter, "전체">, ClaimType> = {
  취소: "cancel",
  반품: "return",
  교환: "exchange",
  토큰환불: "token_refund",
};

export default function ClaimListPage() {
  const navigate = useNavigate();
  const [searchFilters, setSearchFilters] = useState<ListFilters>({});
  const activeTab = useSearchTabs({
    tabs: CLAIM_TYPE_TABS,
    defaultTab: "전체",
    placeholder: "취소/반품/교환/토큰환불 검색...",
    onSearch: (query, dateFilter) => {
      setSearchFilters({
        keyword: query,
        dateFrom: toDateString(dateFilter.customRange?.from),
        dateTo: toDateString(dateFilter.customRange?.to),
      });
    },
  });
  const debouncedKeyword = useDebouncedValue(searchFilters.keyword ?? "", 300);
  const queryFilters = useMemo(
    () => ({
      keyword: debouncedKeyword,
      dateFrom: searchFilters.dateFrom,
      dateTo: searchFilters.dateTo,
    }),
    [debouncedKeyword, searchFilters.dateFrom, searchFilters.dateTo],
  );
  const { data: claims = [], isLoading, error } = useClaims(queryFilters);

  const filteredClaims = useMemo(() => {
    if (activeTab === "전체") return claims;
    const claimType = CLAIM_TYPE_MAP[activeTab];
    return claims.filter((claim) => claim.type === claimType);
  }, [claims, activeTab]);

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">클레임 목록을 불러오는 중...</div>
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
              title="클레임 목록을 불러올 수 없습니다."
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
            {filteredClaims.length === 0 ? (
              <Card>
                <Empty
                  title="취소/반품/교환/토큰환불 내역이 없습니다."
                  description="문제가 있으시면 고객센터로 문의해주세요."
                />
              </Card>
            ) : (
              filteredClaims.map((claim) => (
                <Card
                  key={claim.id}
                  data-testid={`claim-card-${claim.orderId}-${claim.type}-${claim.id}`}
                >
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
                        <ClaimStatusBadge status={claim.status} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                      <span>클레임번호: {claim.claimNumber}</span>
                      <span>·</span>
                      <span>주문번호: {claim.orderNumber}</span>
                    </div>
                  </CardHeader>

                  <Separator />

                  {/* 클레임 상품 정보 */}
                  <CardContent className="py-4">
                    <OrderItemCard
                      item={claim.item}
                      onClick={() => navigate(buildClaimDetailRoute(claim.id))}
                    />

                    {claim.type === "token_refund" && claim.refundData && (
                      <div className="p-3 bg-blue-50 rounded-md mt-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-600">환불 토큰</span>
                          <span>{claim.refundData.paidTokenAmount}T</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-zinc-600">환불 금액</span>
                          <span>
                            {claim.refundData.refundAmount.toLocaleString()}원
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 클레임 사유 */}
                    <div className="p-3 bg-zinc-50 rounded-md mt-3">
                      <Label className="text-sm text-zinc-600">
                        사유: {claim.reason}
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
