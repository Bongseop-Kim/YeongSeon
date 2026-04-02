import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Empty } from "@/shared/composite/empty";
import { OrderStatusBadge } from "@/shared/composite/status-badge";
import { UtilityListPageShell } from "@/shared/composite/utility-list-page-shell";
import { Button } from "@/shared/ui-extended/button";
import {
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { formatDate } from "@yeongseon/shared/utils/format-date";
import { OrderItemCard } from "@/shared/composite/order-item-card";
import { TokenRefundAction } from "@/features/order";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ROUTES } from "@/shared/constants/ROUTES";
import { useOrders } from "@/entities/order";
import { useRefundableTokenOrdersQuery } from "@/entities/my-page";
import { toDateString, type ListFilters } from "@/shared/lib/list-filters";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useSearchTabs } from "@/shared/hooks/use-search-tabs";
import {
  CLAIM_ACTION_LABEL,
  getClaimActionsFromCustomerActions,
  type ClaimActionType,
} from "@yeongseon/shared";
import type { Order } from "@yeongseon/shared/types/view/order";

type OrderTypeFilter =
  | "전체"
  | "일반구매"
  | "수선"
  | "주문제작"
  | "샘플 제작"
  | "토큰구매";

const ORDER_TYPE_TABS: OrderTypeFilter[] = [
  "전체",
  "일반구매",
  "수선",
  "주문제작",
  "샘플 제작",
  "토큰구매",
];

const ORDER_TYPE_MAP: Record<
  Exclude<OrderTypeFilter, "전체">,
  Order["orderType"]
> = {
  일반구매: "sale",
  수선: "repair",
  주문제작: "custom",
  "샘플 제작": "sample",
  토큰구매: "token",
};

export default function OrderListPage() {
  const navigate = useNavigate();
  const [searchFilters, setSearchFilters] = useState<ListFilters>({});
  const activeTab = useSearchTabs({
    tabs: ORDER_TYPE_TABS,
    defaultTab: "전체",
    placeholder: "주문 검색...",
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
  const { data: orders = [], isLoading, error } = useOrders(queryFilters);
  const { data: refundableOrders } = useRefundableTokenOrdersQuery();
  const refundOrderMap = useMemo(
    () =>
      new Map((refundableOrders ?? []).map((order) => [order.orderId, order])),
    [refundableOrders],
  );

  const filteredOrders = useMemo(() => {
    return activeTab === "전체"
      ? orders
      : orders.filter((order) => order.orderType === ORDER_TYPE_MAP[activeTab]);
  }, [orders, activeTab]);

  const ordersByDate = useMemo(() => {
    const grouped = new Map<string, typeof filteredOrders>();
    for (const order of filteredOrders) {
      const dateKey = formatDate(order.date);
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      const group = grouped.get(dateKey);
      if (group) group.push(order);
    }
    return Array.from(grouped.entries());
  }, [filteredOrders]);

  const handleClaimRequest = (
    type: string,
    orderId: string,
    itemId: string,
  ) => {
    navigate(`${ROUTES.CLAIM_FORM}/${type}/${orderId}/${itemId}`);
  };

  return (
    <UtilityListPageShell
      isLoading={isLoading}
      loadingMessage="주문 목록을 불러오는 중..."
      error={error}
      errorTitle="주문 목록을 불러올 수 없습니다."
    >
      <MainLayout>
        <MainContent>
          <PageLayout contentClassName="py-4 lg:py-8">
            <div className="space-y-8 lg:space-y-10">
              <UtilityPageIntro
                eyebrow="Orders"
                title="주문 내역"
                description="결제 이후 진행 상태, 상품 구성, 클레임 가능 동작을 확인합니다."
              />

              <UtilityPageSection
                title="주문 목록"
                description="검색과 기간 필터, 주문 유형 탭은 상단 공용 도구를 사용합니다."
              >
                {filteredOrders.length === 0 ? (
                  <Empty
                    title={
                      activeTab === "전체"
                        ? "주문 내역이 없습니다."
                        : `${activeTab} 내역이 없습니다.`
                    }
                    description={
                      activeTab === "전체"
                        ? "첫 주문을 시작해보세요!"
                        : `${activeTab}에 해당하는 주문이 없습니다.`
                    }
                  />
                ) : (
                  ordersByDate.map(([dateLabel, dateOrders]) => (
                    <section key={dateLabel} className="space-y-0">
                      <h3 className="sticky top-0 z-10 bg-white py-3 text-sm font-semibold text-zinc-500">
                        {dateLabel}
                      </h3>
                      {dateOrders.map((order) => (
                        <article
                          key={order.id}
                          data-testid={`order-card-${order.id}`}
                          className="border-b border-stone-200 py-5"
                        >
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <OrderStatusBadge status={order.status} />
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                                  <span>주문번호: {order.orderNumber}</span>
                                  <span className="text-stone-300">/</span>
                                  <span>상품 {order.items.length}개</span>
                                </div>
                              </div>

                              <div className="text-left lg:text-right">
                                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                                  Total
                                </p>
                                <p className="mt-1 text-lg font-semibold text-zinc-950">
                                  {order.totalPrice.toLocaleString()}원
                                </p>
                              </div>
                            </div>

                            <div className="divide-y divide-stone-200">
                              {order.items.map((item) => {
                                const claimActions =
                                  item.type === "token"
                                    ? ([] as ClaimActionType[])
                                    : getClaimActionsFromCustomerActions(
                                        order.customerActions,
                                      );

                                return (
                                  <div
                                    key={item.id}
                                    className="py-4 first:pt-0 last:pb-0"
                                    data-testid={`order-item-link-${order.id}-${item.id}`}
                                  >
                                    <OrderItemCard
                                      item={item}
                                      onClick={() =>
                                        navigate(
                                          `${ROUTES.ORDER_DETAIL}/${order.id}`,
                                        )
                                      }
                                      actions={
                                        item.type === "token" ? (
                                          <div className="flex gap-2">
                                            <TokenRefundAction
                                              refundOrder={
                                                refundOrderMap.get(order.id) ??
                                                null
                                              }
                                            />
                                          </div>
                                        ) : claimActions.length > 0 ? (
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
                                                    item.id,
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
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </article>
                      ))}
                    </section>
                  ))
                )}
              </UtilityPageSection>
            </div>
          </PageLayout>
        </MainContent>
      </MainLayout>
    </UtilityListPageShell>
  );
}
