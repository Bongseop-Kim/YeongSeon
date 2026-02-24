import { MainContent, MainLayout } from "@/components/layout/main-layout";
import TwoPanelLayout from "@/components/layout/two-panel-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Empty } from "@/components/composite/empty";
import { getClaimTypeLabel } from "@/features/order/utils/claim-utils";
import { formatDate } from "@/utils/formatDate";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect, useMemo, useState } from "react";
import { buildClaimDetailRoute } from "@/constants/ROUTES";
import { useClaims } from "@/features/order/api/claims-query";
import {
  toDateString,
  type ListFilters,
} from "@/features/order/api/list-filters";
import { useDebouncedValue } from "@/features/order/hooks/use-debounced-value";

export default function ClaimListPage() {
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
  const { data: claims = [], isLoading, error } = useClaims(queryFilters);

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder: "취소/반품/교환 검색...",
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

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">
              클레임 목록을 불러오는 중...
            </div>
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
        <TwoPanelLayout
          leftPanel={
            <div>
              {claims.length === 0 ? (
                <Card>
                  <Empty
                    title="취소/반품/교환 내역이 없습니다."
                    description="문제가 있으시면 고객센터로 문의해주세요."
                  />
                </Card>
              ) : (
                claims.map((claim) => (
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
                        onClick={() =>
                          navigate(
                            buildClaimDetailRoute(
                              claim.type,
                              claim.orderId,
                              claim.item.id,
                            ),
                          )
                        }
                      />

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
          }
        />
      </MainContent>
    </MainLayout>
  );
}
