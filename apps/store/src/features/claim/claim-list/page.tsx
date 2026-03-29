import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui-extended/button";
import { Empty } from "@/shared/composite/empty";
import { ClaimStatusBadge } from "@/shared/composite/status-badge";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { getClaimTypeLabel } from "@yeongseon/shared/utils/claim-utils";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { buildClaimDetailRoute } from "@/shared/constants/ROUTES";
import { useClaims } from "@/features/claim/api/claims-query";
import { toDateString, type ListFilters } from "@/shared/lib/list-filters";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useSearchTabs } from "@/shared/hooks/use-search-tabs";
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
  const {
    data: claims = [],
    isLoading,
    error,
    refetch,
  } = useClaims(queryFilters);

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
          <PageLayout contentClassName="py-4 lg:py-8">
            <div>
              <Empty
                title="클레임 목록을 불러올 수 없습니다."
                description={
                  error instanceof Error
                    ? error.message
                    : "오류가 발생했습니다."
                }
              />
              <div className="mt-4 flex justify-center">
                <Button variant="outline" onClick={() => void refetch()}>
                  다시 시도
                </Button>
              </div>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Claims"
              title="취소/반품/교환 내역"
              description="클레임 유형, 처리 상태, 대상 상품과 사유를 시간순으로 확인합니다."
            />

            <UtilityPageSection
              title="클레임 목록"
              description="검색과 기간 필터, 클레임 유형 탭은 상단 공용 도구를 사용합니다."
            >
              {filteredClaims.length === 0 ? (
                <div>
                  <Empty
                    title="취소/반품/교환/토큰환불 내역이 없습니다."
                    description="문제가 있으시면 고객센터로 문의해주세요."
                  />
                </div>
              ) : (
                filteredClaims.map((claim) => (
                  <article
                    key={claim.id}
                    data-testid={`claim-card-${claim.orderId}-${claim.type}-${claim.id}`}
                    className="border-b border-stone-200 py-5"
                  >
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base font-semibold text-zinc-950">
                              {formatDate(claim.date)}
                            </p>
                            <Badge variant="outline">
                              {getClaimTypeLabel(claim.type)}
                            </Badge>
                            <ClaimStatusBadge status={claim.status} />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                            <span>클레임번호: {claim.claimNumber}</span>
                            <span className="text-stone-300">/</span>
                            <span>주문번호: {claim.orderNumber}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-stone-200 pt-4">
                        <OrderItemCard
                          item={claim.item}
                          onClick={() =>
                            navigate(buildClaimDetailRoute(claim.id))
                          }
                        />

                        {claim.type === "token_refund" && claim.refundData && (
                          <div className="mt-4 border-l-2 border-blue-200 bg-blue-50 px-4 py-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-zinc-600">환불 토큰</span>
                              <span>{claim.refundData.paidTokenAmount}T</span>
                            </div>
                            <div className="mt-2 flex justify-between font-semibold">
                              <span className="text-zinc-700">환불 금액</span>
                              <span>
                                {claim.refundData.refundAmount.toLocaleString()}
                                원
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="mt-4 border-l-2 border-stone-300 bg-stone-50/70 px-4 py-3">
                          <p className="text-xs text-zinc-500">사유</p>
                          <p className="mt-1 text-sm text-zinc-700">
                            {claim.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </UtilityPageSection>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
