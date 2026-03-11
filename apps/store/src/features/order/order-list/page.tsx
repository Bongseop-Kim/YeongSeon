import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Empty } from "@/components/composite/empty";
import { OrderStatusBadge } from "@/components/composite/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import {
  CONTACT_METHOD_LABELS,
  type QuoteRequestStatus,
} from "@yeongseon/shared";
import { OrderItemCard } from "@/features/order/components/order-item-card";
import { useNavigate } from "react-router-dom";
import { useSearchStore } from "@/store/search";
import { useEffect, useMemo, useState } from "react";
import { ROUTES } from "@/constants/ROUTES";
import { useOrders } from "@/features/order/api/order-query";
import { useQuoteRequests } from "@/features/quote-request/api/quote-request-query";
import {
  toDateString,
  type ListFilters,
} from "@/features/order/utils/list-filters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  CLAIM_ACTION_LABEL,
  getClaimActions,
} from "@yeongseon/shared/constants/claim-actions";

const QUOTE_REQUEST_BADGE_CLASS: Record<QuoteRequestStatus, string> = {
  요청: "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-100",
  견적발송: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
  협의중: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
  확정: "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
  종료: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50",
};

export default function OrderListPage() {
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
  const { data: orders = [], isLoading, error } = useOrders(queryFilters);
  const { data: quoteRequests = [], error: quoteRequestError } = useQuoteRequests();
  const showQuoteRequestSection = quoteRequests.length > 0 || !!quoteRequestError;

  useEffect(() => {
    setSearchEnabled(true, {
      placeholder: "주문 검색...",
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

  const handleClaimRequest = (
    type: string,
    orderId: string,
    itemId: string
  ) => {
    navigate(`${ROUTES.CLAIM_FORM}/${type}/${orderId}/${itemId}`);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <MainContent>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-zinc-500">주문 목록을 불러오는 중...</div>
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
              title="주문 목록을 불러올 수 없습니다."
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
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">주문 내역</h2>
              </div>
              {orders.length === 0 ? (
                <Card>
                  <Empty
                    title="주문 내역이 없습니다."
                    description="첫 주문을 시작해보세요!"
                  />
                </Card>
              ) : (
                orders.map((order) => {
                  const claimActions = getClaimActions(order.status);

                  return (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {formatDate(order.date)}
                          </CardTitle>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="mt-1 text-sm text-zinc-500">
                          주문번호: {order.orderNumber}
                        </div>
                      </CardHeader>

                      <div className="space-y-0">
                        {order.items.map((item) => (
                          <CardContent key={item.id} className="py-4">
                            <OrderItemCard
                              item={item}
                              onClick={() =>
                                navigate(`${ROUTES.ORDER_DETAIL}/${order.id}`)
                              }
                              actions={
                                claimActions.length > 0 ? (
                                  <div className="flex gap-2">
                                    {claimActions.map((actionType) => (
                                      <Button
                                        key={actionType}
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClaimRequest(
                                            actionType,
                                            order.id,
                                            item.id
                                          );
                                        }}
                                      >
                                        {CLAIM_ACTION_LABEL[actionType]}
                                      </Button>
                                    ))}
                                  </div>
                                ) : undefined
                              }
                            />
                          </CardContent>
                        ))}
                      </div>

                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-bold">주문 총액</Label>
                          <Label className="text-lg font-bold">
                            {order.totalPrice.toLocaleString()}원
                          </Label>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </section>

            {showQuoteRequestSection ? (
              <section className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">견적 요청 내역</h2>
                </div>
                {quoteRequestError ? (
                  <Card>
                    <Empty
                      title="견적 요청 내역을 불러올 수 없습니다."
                      description={
                        quoteRequestError instanceof Error
                          ? quoteRequestError.message
                          : "오류가 발생했습니다."
                      }
                    />
                  </Card>
                ) : (
                  quoteRequests.map((quoteRequest) => (
                    <Card key={quoteRequest.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <CardTitle className="text-base">
                              견적번호: {quoteRequest.quoteNumber}
                            </CardTitle>
                            <div className="text-sm text-zinc-500">
                              요청일: {formatDate(quoteRequest.date)}
                            </div>
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
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-zinc-700">
                        <div className="flex items-center justify-between gap-3">
                          <span>수량</span>
                          <span>{quoteRequest.quantity}개</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>담당자</span>
                          <span>{quoteRequest.contactName}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>연락 방법</span>
                          <span>
                            {CONTACT_METHOD_LABELS[quoteRequest.contactMethod]}
                          </span>
                        </div>
                        {quoteRequest.quotedAmount != null && (
                          <div className="flex items-center justify-between gap-3">
                            <span>견적 금액</span>
                            <span className="font-semibold text-zinc-900">
                              {quoteRequest.quotedAmount.toLocaleString()}원
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </section>
            ) : null}
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
