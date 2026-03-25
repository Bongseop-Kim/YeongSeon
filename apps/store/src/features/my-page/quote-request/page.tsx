import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Empty } from "@/components/composite/empty";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { ROUTES } from "@/constants/ROUTES";
import { useQuoteRequests } from "@/features/quote-request/api/quote-request-query";
import { QuoteRequestCard } from "@/features/quote-request/components/quote-request-card";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearch } from "@/hooks/use-search";
import { toDateString, type ListFilters } from "@/lib/list-filters";

export default function QuoteRequestListPage() {
  const navigate = useNavigate();
  const [searchFilters, setSearchFilters] = useState<ListFilters>({});

  useSearch({
    placeholder: "견적 요청 검색...",
    onSearch: (query, dateFilter) => {
      setSearchFilters({
        keyword: query,
        dateFrom: toDateString(dateFilter.customRange?.from),
        dateTo: toDateString(dateFilter.customRange?.to),
      });
    },
  });

  const debouncedKeyword = useDebouncedValue(searchFilters.keyword ?? "", 300);
  const { data: quoteRequests = [], isLoading, error } = useQuoteRequests();

  const filteredQuoteRequests = useMemo(() => {
    let result = quoteRequests;

    if (debouncedKeyword) {
      const keyword = debouncedKeyword.toLowerCase();
      result = result.filter(
        (q) =>
          q.quoteNumber.toLowerCase().includes(keyword) ||
          q.contactName.toLowerCase().includes(keyword),
      );
    }

    const { dateFrom, dateTo } = searchFilters;
    if (dateFrom) {
      result = result.filter((q) => q.date >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((q) => q.date <= dateTo);
    }

    return result;
  }, [
    quoteRequests,
    debouncedKeyword,
    searchFilters.dateFrom,
    searchFilters.dateTo,
  ]);

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex min-h-96 items-center justify-center">
            <div className="text-zinc-500">견적 요청 내역을 불러오는 중...</div>
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
            <div className="px-4 lg:px-0">
              <Empty
                title="견적 요청 내역을 불러올 수 없습니다."
                description={
                  error instanceof Error
                    ? error.message
                    : "오류가 발생했습니다."
                }
              />
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
              eyebrow="Quote Requests"
              title="견적 요청 내역"
              description="주문 제작 상담과 견적 응답 상태를 시간순으로 확인합니다."
            />

            <UtilityPageSection
              title="요청 목록"
              description="검색과 기간 필터는 상단 공용 검색 도구를 사용합니다."
            >
              {filteredQuoteRequests.length === 0 ? (
                <div className="px-4 lg:px-0">
                  <Empty
                    title="견적 요청 내역이 없습니다."
                    description="필요한 상품의 견적을 요청해보세요."
                  />
                </div>
              ) : (
                filteredQuoteRequests.map((quoteRequest) => (
                  <QuoteRequestCard
                    key={quoteRequest.id}
                    quoteRequest={quoteRequest}
                    onClick={() =>
                      navigate(
                        ROUTES.MY_PAGE_QUOTE_REQUEST_DETAIL.replace(
                          ":id",
                          quoteRequest.id,
                        ),
                      )
                    }
                  />
                ))
              )}
            </UtilityPageSection>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
