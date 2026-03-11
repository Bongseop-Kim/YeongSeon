import { useEffect, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Empty } from "@/components/composite/empty";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/ROUTES";
import { useQuoteRequest } from "@/features/quote-request/api/quote-request-query";
import { QUOTE_REQUEST_BADGE_CLASS } from "@/features/quote-request/components/quote-request-card";
import { cn } from "@/lib/utils";
import { CONTACT_METHOD_LABELS } from "@yeongseon/shared";
import { formatDate } from "@yeongseon/shared/utils/format-date";

const DETAIL_LABEL_CLASS = "text-sm text-zinc-500";
const DETAIL_VALUE_CLASS = "text-sm font-medium text-zinc-900";

const additionalOptionLabels = [
  { key: "triangleStitch", label: "삼각봉제" },
  { key: "sideStitch", label: "옆선봉제" },
  { key: "barTack", label: "바택" },
  { key: "dimple", label: "딤플" },
  { key: "spoderato", label: "스포데라토" },
  { key: "fold7", label: "7폴드" },
  { key: "brandLabel", label: "브랜드라벨" },
  { key: "careLabel", label: "케어라벨" },
] as const;

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-zinc-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className={DETAIL_LABEL_CLASS}>{label}</span>
      <span className={cn(DETAIL_VALUE_CLASS, "text-right")}>{value}</span>
    </div>
  );
}

function QuoteRequestDetailSkeleton() {
  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="space-y-4">
            <Card className="animate-pulse">
              <CardHeader className="space-y-3">
                <div className="h-6 w-40 rounded bg-zinc-200" />
                <div className="h-5 w-20 rounded bg-zinc-200" />
              </CardHeader>
            </Card>
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 w-24 rounded bg-zinc-200" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="h-4 w-full rounded bg-zinc-200" />
                  <div className="h-4 w-full rounded bg-zinc-200" />
                  <div className="h-4 w-2/3 rounded bg-zinc-200" />
                </CardContent>
              </Card>
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
          <PageLayout>
            <Card>
              <Empty
                title="견적 요청 상세를 불러올 수 없습니다."
                description={
                  error instanceof Error ? error.message : "오류가 발생했습니다."
                }
              />
              <CardContent className="pt-0">
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => refetch()}>
                    다시 시도
                  </Button>
                  <Button onClick={() => navigate(ROUTES.MY_PAGE_QUOTE_REQUEST)}>
                    목록으로
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  if (!quoteRequest) {
    return (
      <MainLayout>
        <MainContent>
          <PageLayout>
            <Card>
              <Empty
                title="견적 요청 정보를 찾을 수 없습니다."
                description="목록에서 다시 확인해주세요."
              />
              <CardContent className="pt-0">
                <div className="flex justify-center">
                  <Button onClick={() => navigate(ROUTES.MY_PAGE_QUOTE_REQUEST)}>
                    목록으로
                  </Button>
                </div>
              </CardContent>
            </Card>
          </PageLayout>
        </MainContent>
      </MainLayout>
    );
  }

  const enabledAdditionalOptions = additionalOptionLabels.filter(
    ({ key }) => quoteRequest.options[key]
  );

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-xl">
                    견적번호: {quoteRequest.quoteNumber}
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0",
                    QUOTE_REQUEST_BADGE_CLASS[quoteRequest.status]
                  )}
                >
                  {quoteRequest.status}
                </Badge>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="요청일" value={formatDate(quoteRequest.date)} />
                <DetailRow label="수량" value={`${quoteRequest.quantity}개`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>연락처</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="담당자" value={quoteRequest.contactName} />
                {quoteRequest.contactTitle && (
                  <DetailRow label="직함" value={quoteRequest.contactTitle} />
                )}
                <DetailRow
                  label="연락 방법"
                  value={CONTACT_METHOD_LABELS[quoteRequest.contactMethod]}
                />
                <DetailRow label="연락처" value={quoteRequest.contactValue} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>주문 옵션</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailRow label="넥타이 유형" value={quoteRequest.options.tieType} />
                <DetailRow label="심지" value={quoteRequest.options.interlining} />
                <DetailRow
                  label="디자인 유형"
                  value={quoteRequest.options.designType}
                />
                <DetailRow label="원단 유형" value={quoteRequest.options.fabricType} />
                <DetailRow
                  label="원단 지참"
                  value={quoteRequest.options.fabricProvided ? "예" : "아니오"}
                />
                <DetailRow
                  label="심지 두께"
                  value={quoteRequest.options.interliningThickness}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>추가 옵션</CardTitle>
              </CardHeader>
              <CardContent>
                {enabledAdditionalOptions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {enabledAdditionalOptions.map((option) => (
                      <Badge key={option.key} variant="secondary">
                        {option.label}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500">선택한 추가 옵션이 없습니다.</div>
                )}
              </CardContent>
            </Card>

            {quoteRequest.referenceImageUrls.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>참조 이미지</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {quoteRequest.referenceImageUrls.map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="overflow-hidden rounded-lg border bg-zinc-50"
                      >
                        <img
                          src={imageUrl}
                          alt={`참조 이미지 ${index + 1}`}
                          className="aspect-square h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {quoteRequest.additionalNotes && (
              <Card>
                <CardHeader>
                  <CardTitle>추가 메모</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                    {quoteRequest.additionalNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {quoteRequest.quotedAmount != null && (
              <Card>
                <CardHeader>
                  <CardTitle>견적 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailRow
                    label="견적 금액"
                    value={`${quoteRequest.quotedAmount.toLocaleString()}원`}
                  />
                  {quoteRequest.quoteConditions && (
                    <DetailRow
                      label="견적 조건"
                      value={
                        <span className="whitespace-pre-wrap text-right">
                          {quoteRequest.quoteConditions}
                        </span>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
