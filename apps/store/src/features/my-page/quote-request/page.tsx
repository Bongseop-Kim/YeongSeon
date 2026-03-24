import { Empty } from "@/components/composite/empty";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/ROUTES";
import { useQuoteRequests } from "@/features/quote-request/api/quote-request-query";
import { QuoteRequestCard } from "@/features/quote-request/components/quote-request-card";
import { toDateString, type ListFilters } from "@/lib/list-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearch } from "@/hooks/use-search";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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

    if (searchFilters.dateFrom) {
      const dateFrom = searchFilters.dateFrom;
      result = result.filter((q) => q.date >= dateFrom);
    }

    if (searchFilters.dateTo) {
      const dateTo = searchFilters.dateTo;
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
          <PageLayout>
            <Card>
              <Empty
                title="견적 요청 내역을 불러올 수 없습니다."
                description={
                  error instanceof Error
                    ? error.message
                    : "오류가 발생했습니다."
                }
              />
            </Card>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <section className="space-y-4">
            {filteredQuoteRequests.length === 0 ? (
              <Card>
                <Empty
                  title="견적 요청 내역이 없습니다."
                  description="필요한 상품의 견적을 요청해보세요."
                />
              </Card>
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
          </section>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
