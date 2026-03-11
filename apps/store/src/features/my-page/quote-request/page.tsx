import { Empty } from "@/components/composite/empty";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Card } from "@/components/ui/card";
import { useQuoteRequests } from "@/features/quote-request/api/quote-request-query";
import { QuoteRequestCard } from "@/features/quote-request/components/quote-request-card";

export default function QuoteRequestListPage() {
  const { data: quoteRequests = [], isLoading, error } = useQuoteRequests();

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
                  error instanceof Error ? error.message : "오류가 발생했습니다."
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
            <div>
              <h2 className="text-lg font-semibold">견적 요청 내역</h2>
            </div>
            {quoteRequests.length === 0 ? (
              <Card>
                <Empty
                  title="견적 요청 내역이 없습니다."
                  description="필요한 상품의 견적을 요청해보세요."
                />
              </Card>
            ) : (
              quoteRequests.map((quoteRequest) => (
                <QuoteRequestCard
                  key={quoteRequest.id}
                  quoteRequest={quoteRequest}
                />
              ))
            )}
          </section>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
