import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Empty } from "@/shared/composite/empty";
import { UtilityListPageShell } from "@/shared/composite/utility-list-page-shell";
import { UtilityPageIntro } from "@/shared/composite/utility-page";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Badge } from "@/shared/ui/badge";
import { PAGE_BREADCRUMBS } from "@/shared/constants/PAGE_BREADCRUMBS";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useQuoteRequests } from "@/entities/quote-request";
import { QUOTE_REQUEST_BADGE_CLASS } from "@/features/quote-request";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useSearch } from "@/shared/hooks/use-search";
import { toDateString, type ListFilters } from "@/shared/lib/list-filters";
import { CONTACT_METHOD_LABELS } from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared/utils/format-date";

export default function QuoteRequestListPage() {
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
  const { dateFrom, dateTo } = searchFilters;

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

    if (dateFrom) {
      result = result.filter((q) => q.date >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((q) => q.date <= dateTo);
    }

    return result;
  }, [quoteRequests, debouncedKeyword, dateFrom, dateTo]);

  const quoteRequestsByDate = useMemo(() => {
    const grouped = new Map<string, typeof filteredQuoteRequests>();
    const sortedQuoteRequests = [...filteredQuoteRequests].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date),
    );

    for (const quoteRequest of sortedQuoteRequests) {
      const dateKey = formatDate(quoteRequest.date);
      const group = grouped.get(dateKey) ?? [];
      if (!grouped.has(dateKey)) grouped.set(dateKey, group);
      group.push(quoteRequest);
    }
    return Array.from(grouped.entries());
  }, [filteredQuoteRequests]);

  return (
    <UtilityListPageShell
      isLoading={isLoading}
      loadingMessage="견적 요청 내역을 불러오는 중..."
      error={error}
      errorTitle="견적 요청 내역을 불러올 수 없습니다."
      breadcrumbs={PAGE_BREADCRUMBS.QUOTE_REQUEST}
    >
      <MainLayout>
        <MainContent>
          <PageLayout
            breadcrumbs={PAGE_BREADCRUMBS.QUOTE_REQUEST}
            contentClassName="py-4 lg:py-8"
          >
            <div className="space-y-8 lg:space-y-10">
              <UtilityPageIntro
                eyebrow="Quote Requests"
                title="견적 요청 내역"
                description="주문 제작 상담과 견적 응답 상태를 시간순으로 확인합니다."
              />

              {quoteRequestsByDate.length === 0 ? (
                <Empty
                  title="견적 요청 내역이 없습니다."
                  description="필요한 상품의 견적을 요청해보세요."
                />
              ) : (
                quoteRequestsByDate.map(([dateLabel, dateQuoteRequests]) => (
                  <section key={dateLabel} className="space-y-0">
                    <h2 className="sticky top-0 z-10 bg-background py-3 text-lg font-semibold tracking-tight text-zinc-950">
                      {dateLabel}
                    </h2>
                    {dateQuoteRequests.map((quoteRequest) => (
                      <Link
                        key={quoteRequest.id}
                        data-testid={`quote-request-card-${quoteRequest.id}`}
                        className="block border-b border-stone-200 py-5"
                        to={ROUTES.MY_PAGE_QUOTE_REQUEST_DETAIL.replace(
                          ":id",
                          quoteRequest.id,
                        )}
                      >
                        <div className="flex flex-col gap-5">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={
                                    QUOTE_REQUEST_BADGE_CLASS[
                                      quoteRequest.status
                                    ]
                                  }
                                >
                                  {quoteRequest.status}
                                </Badge>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                                <span>
                                  견적번호: {quoteRequest.quoteNumber}
                                </span>
                                <span className="text-stone-300">/</span>
                                <span>수량 {quoteRequest.quantity}개</span>
                                <span className="text-stone-300">/</span>
                                <span>담당자: {quoteRequest.contactName}</span>
                                <span className="text-stone-300">/</span>
                                <span>
                                  연락 방법:{" "}
                                  {
                                    CONTACT_METHOD_LABELS[
                                      quoteRequest.contactMethod
                                    ]
                                  }
                                </span>
                                {quoteRequest.quotedAmount != null ? (
                                  <>
                                    <span className="text-stone-300">/</span>
                                    <span className="font-medium text-zinc-700">
                                      견적 금액:{" "}
                                      {quoteRequest.quotedAmount.toLocaleString()}
                                      원
                                    </span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </section>
                ))
              )}
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    </UtilityListPageShell>
  );
}
