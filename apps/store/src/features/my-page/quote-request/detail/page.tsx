import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui-extended/button";
import { Empty } from "@/components/composite/empty";
import { CustomOrderOptionsSection } from "@/components/composite/custom-order-options-section";
import {
  UtilityKeyValueRow,
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/components/composite/utility-page";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { ROUTES } from "@/constants/ROUTES";
import { useQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { QUOTE_REQUEST_BADGE_CLASS } from "@/features/quote-request/components/quote-request-card";
import { cn } from "@/lib/utils";
import { CONTACT_METHOD_LABELS } from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared/utils/format-date";

function QuoteRequestDetailSkeleton() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-4 px-4 lg:px-0">
            <div className="h-8 w-52 rounded bg-zinc-200" />
            <div className="h-5 w-80 rounded bg-zinc-200" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="space-y-3 border-b border-stone-200 py-4"
              >
                <div className="h-5 w-24 rounded bg-zinc-200" />
                <div className="h-4 w-full rounded bg-zinc-200" />
                <div className="h-4 w-2/3 rounded bg-zinc-200" />
              </div>
            ))}
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}

export default function QuoteRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: quoteRequest, isLoading, error, refetch } = useQuoteRequest(id);

  useEffect(() => {
    if (!id) {
      navigate(ROUTES.MY_PAGE_QUOTE_REQUEST);
    }
  }, [id, navigate]);

  if (!id) {
    return null;
  }

  if (isLoading) {
    return <QuoteRequestDetailSkeleton />;
  }

  if (error) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <div className="px-4 lg:px-0">
              <Empty
                title="견적 요청 상세를 불러올 수 없습니다."
                description={
                  error instanceof Error
                    ? error.message
                    : "오류가 발생했습니다."
                }
              />
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  다시 시도
                </Button>
                <Button onClick={() => navigate(ROUTES.MY_PAGE_QUOTE_REQUEST)}>
                  목록으로
                </Button>
              </div>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  if (!quoteRequest) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <div className="px-4 lg:px-0">
              <Empty
                title="견적 요청 정보를 찾을 수 없습니다."
                description="목록에서 다시 확인해주세요."
              />
              <div className="mt-4 flex justify-center">
                <Button onClick={() => navigate(ROUTES.MY_PAGE_QUOTE_REQUEST)}>
                  목록으로
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
              eyebrow="Quote Detail"
              title={`견적번호 ${quoteRequest.quoteNumber}`}
              description="요청 기본 정보와 연락처, 옵션, 견적 응답 상태를 확인합니다."
              meta={
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    QUOTE_REQUEST_BADGE_CLASS[quoteRequest.status],
                  )}
                >
                  {quoteRequest.status}
                </Badge>
              }
            />

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8 px-4 lg:px-0">
                <UtilityPageSection
                  title="기본 정보"
                  description="요청 시점과 수량 정보를 보여줍니다."
                >
                  <dl>
                    <UtilityKeyValueRow
                      label="요청일"
                      value={formatDate(quoteRequest.date)}
                    />
                    <UtilityKeyValueRow
                      label="수량"
                      value={`${quoteRequest.quantity}개`}
                    />
                  </dl>
                </UtilityPageSection>

                <UtilityPageSection
                  title="연락처"
                  description="견적 응답을 위한 담당자 정보입니다."
                >
                  <dl>
                    <UtilityKeyValueRow
                      label="담당자"
                      value={quoteRequest.contactName}
                    />
                    {quoteRequest.contactTitle && (
                      <UtilityKeyValueRow
                        label="직함"
                        value={quoteRequest.contactTitle}
                      />
                    )}
                    <UtilityKeyValueRow
                      label="연락 방법"
                      value={CONTACT_METHOD_LABELS[quoteRequest.contactMethod]}
                    />
                    <UtilityKeyValueRow
                      label="연락처"
                      value={quoteRequest.contactValue}
                    />
                  </dl>
                </UtilityPageSection>

                <UtilityPageSection
                  title="주문 옵션"
                  description="요청 당시 선택한 옵션과 참고 자료입니다."
                >
                  <CustomOrderOptionsSection
                    options={quoteRequest.options}
                    referenceImageUrls={quoteRequest.referenceImageUrls}
                    additionalNotes={quoteRequest.additionalNotes}
                    hasSample={false}
                  />
                </UtilityPageSection>
              </div>

              <div className="min-w-0 space-y-5 px-4 lg:sticky lg:top-24 lg:self-start lg:px-0">
                <UtilityPageAside
                  title="요약"
                  description="견적 진행 상태를 빠르게 확인합니다."
                  tone="muted"
                >
                  <dl>
                    <UtilityKeyValueRow
                      label="상태"
                      value={quoteRequest.status}
                    />
                    {quoteRequest.quotedAmount != null && (
                      <UtilityKeyValueRow
                        label="견적 금액"
                        value={`${quoteRequest.quotedAmount.toLocaleString()}원`}
                      />
                    )}
                  </dl>
                </UtilityPageAside>

                {quoteRequest.quoteConditions && (
                  <UtilityPageAside
                    title="견적 조건"
                    description="담당자가 전달한 추가 조건입니다."
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-600">
                      {quoteRequest.quoteConditions}
                    </p>
                  </UtilityPageAside>
                )}

                <UtilityPageAside
                  title="이동"
                  description="다른 요청을 확인하려면 목록으로 이동하세요."
                >
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(ROUTES.MY_PAGE_QUOTE_REQUEST)}
                  >
                    목록으로
                  </Button>
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
