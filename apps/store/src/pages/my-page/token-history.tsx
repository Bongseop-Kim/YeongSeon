import { useMemo, useState } from "react";
import { Empty } from "@/shared/composite/empty";
import {
  UtilityPageAside,
  UtilityPageIntro,
  UtilityPageSection,
} from "@/shared/composite/utility-page";
import { MainContent, MainLayout } from "@/shared/layout/main-layout";
import { PageLayout } from "@/shared/layout/page-layout";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  useDesignTokenBalanceQuery,
  useDesignTokenHistoryQuery,
} from "@/entities/design";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useSearch } from "@/shared/hooks/use-search";
import { toDateString, type ListFilters } from "@/shared/lib/list-filters";
import { cn } from "@/shared/lib/utils";

const formatAmount = (amount: number) => {
  const prefix = amount >= 0 ? "+" : "";
  return `${prefix}${amount.toLocaleString()}`;
};

const formatDate = (value: string) =>
  new Date(value)
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replaceAll(". ", "-")
    .replace(".", "");

function BalanceSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-9 w-36" />
      <Skeleton className="h-3 w-44" />
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="divide-y divide-stone-200">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

interface BalanceSummaryProps {
  total: number;
  paid: number;
  bonus: number;
  isLoading: boolean;
  hasError: boolean;
}

function BalanceSummary({
  total,
  paid,
  bonus,
  isLoading,
  hasError,
}: BalanceSummaryProps) {
  if (isLoading) {
    return <BalanceSkeleton />;
  }

  if (hasError) {
    return (
      <p className="text-sm text-red-600">
        잔액을 불러오는 중 오류가 발생했습니다.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <div className="text-3xl font-semibold tracking-tight text-zinc-900">
        {total.toLocaleString()}
        <span className="ml-1 text-base font-normal text-zinc-400">토큰</span>
      </div>
      <div className="flex gap-3 text-xs text-zinc-500">
        <span>유료 {paid.toLocaleString()}</span>
        <span>·</span>
        <span>보너스/무료 {bonus.toLocaleString()}</span>
      </div>
    </div>
  );
}

type HistoryItem = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  createdAt: string;
  workId: string | null;
};

interface MergedUsageItem {
  id: string;
  netAmount: number;
  description: string | null;
  createdAt: string;
  type: string;
}

const extractBaseWorkId = (workId: string | null): string | null => {
  if (!workId) return null;
  return workId.replace(/_use_paid$|_use_bonus$/, "");
};

function mergeUsageItems(items: HistoryItem[]): MergedUsageItem[] {
  const groupMap = new Map<string, { baseItem: HistoryItem; net: number }>();
  const standalone: HistoryItem[] = [];

  for (const item of items) {
    const baseId = extractBaseWorkId(item.workId ?? null);

    if ((item.type === "use" || item.type === "refund") && baseId) {
      const entry = groupMap.get(baseId);
      if (entry) {
        entry.net += item.amount;
        if (item.type === "use") entry.baseItem = item;
      } else {
        groupMap.set(baseId, { baseItem: item, net: item.amount });
      }
    } else if (item.type !== "refund") {
      standalone.push(item);
    }
  }

  const merged: MergedUsageItem[] = [
    ...Array.from(groupMap.values()).map(({ baseItem, net }) => ({
      id: baseItem.id,
      netAmount: net,
      description: baseItem.description,
      createdAt: baseItem.createdAt,
      type: baseItem.type,
    })),
    ...standalone.map((item) => ({
      id: item.id,
      netAmount: item.amount,
      description: item.description,
      createdAt: item.createdAt,
      type: item.type,
    })),
  ];

  return merged.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

interface UsageTabProps {
  history: HistoryItem[];
  isLoading: boolean;
  error: Error | null;
}

function UsageTab({ history, isLoading, error }: UsageTabProps) {
  const rawUsageItems = history.filter(
    (item) => item.type === "use" || item.type === "refund",
  );
  const usageItems = mergeUsageItems(rawUsageItems);

  if (isLoading && history.length === 0) {
    return <HistorySkeleton />;
  }

  if (error && history.length === 0) {
    return (
      <Empty title="내역을 불러올 수 없습니다." description={error.message} />
    );
  }

  if (usageItems.length === 0) {
    return (
      <Empty
        title="사용 내역이 없습니다."
        description="토큰이 사용되거나 지급되면 이곳에서 확인할 수 있습니다."
      />
    );
  }

  return (
    <div className="divide-y divide-stone-200">
      {usageItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 px-4 py-4 lg:px-0"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-700">
              {item.description ??
                (item.type === "grant" ? "토큰 지급" : "토큰 사용")}
            </p>
            <span className="text-xs text-zinc-400">
              {formatDate(item.createdAt)}
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 text-sm font-semibold tabular-nums",
              item.netAmount >= 0 ? "text-green-600" : "text-zinc-700",
            )}
          >
            {formatAmount(item.netAmount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function TokenHistoryPage() {
  const [searchFilters, setSearchFilters] = useState<ListFilters>({});

  useSearch({
    placeholder: "토큰 내역 검색...",
    onSearch: (query, dateFilter) => {
      setSearchFilters({
        keyword: query,
        dateFrom: toDateString(dateFilter.customRange?.from),
        dateTo: toDateString(dateFilter.customRange?.to),
      });
    },
  });

  const debouncedKeyword = useDebouncedValue(searchFilters.keyword ?? "", 300);

  const {
    data: rawBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useDesignTokenBalanceQuery();
  const {
    data: rawHistory,
    isLoading: isHistoryLoading,
    error: historyError,
  } = useDesignTokenHistoryQuery();

  const balance = rawBalance ?? { total: 0, paid: 0, bonus: 0 };
  const { dateFrom, dateTo } = searchFilters;

  const usageHistory = useMemo(() => {
    const history = rawHistory ?? [];
    let result = history.filter(
      (item) => item.type === "use" || item.type === "refund",
    );

    if (debouncedKeyword) {
      const keyword = debouncedKeyword.toLowerCase();
      result = result.filter((item) =>
        (item.description ?? "").toLowerCase().includes(keyword),
      );
    }

    if (dateFrom) {
      result = result.filter((item) => item.createdAt.slice(0, 10) >= dateFrom);
    }

    if (dateTo) {
      result = result.filter((item) => item.createdAt.slice(0, 10) <= dateTo);
    }

    return result;
  }, [rawHistory, debouncedKeyword, dateFrom, dateTo]);
  const balanceProps: BalanceSummaryProps = {
    total: balance.total,
    paid: balance.paid,
    bonus: balance.bonus,
    isLoading: isBalanceLoading && rawBalance === undefined,
    hasError: Boolean(balanceError && rawBalance === undefined),
  };

  return (
    <MainLayout>
      <MainContent>
        <PageLayout contentClassName="py-4 lg:py-8">
          <div className="space-y-8 lg:space-y-10">
            <UtilityPageIntro
              eyebrow="Token History"
              title="토큰 내역"
              description="현재 보유 토큰과 사용, 환불 변동 이력을 확인합니다."
            />

            <div className="lg:hidden">
              <UtilityPageAside
                title="현재 토큰 잔액"
                description="유료 토큰과 보너스 토큰을 구분해 보여줍니다."
                tone="muted"
              >
                <BalanceSummary {...balanceProps} />
              </UtilityPageAside>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
              <div className="min-w-0 space-y-8">
                <UtilityPageSection
                  title="사용 및 환불 이력"
                  description="검색과 기간 필터는 상단 공용 검색 도구를 사용합니다."
                >
                  <UsageTab
                    history={usageHistory}
                    isLoading={isHistoryLoading}
                    error={historyError instanceof Error ? historyError : null}
                  />
                </UtilityPageSection>
              </div>

              <div className="hidden min-w-0 space-y-5 lg:sticky lg:top-24 lg:block lg:self-start">
                <UtilityPageAside
                  title="현재 토큰 잔액"
                  description="유료 토큰과 보너스 토큰을 구분해 보여줍니다."
                  tone="muted"
                >
                  <BalanceSummary {...balanceProps} />
                </UtilityPageAside>
              </div>
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
