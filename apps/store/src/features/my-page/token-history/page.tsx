import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Empty } from "@/components/composite/empty";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDesignTokenBalanceQuery,
  useDesignTokenHistoryQuery,
} from "@/features/design/api/ai-design-query";
import { cn } from "@/lib/utils";

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
  return <Skeleton className="h-9 w-32" />;
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── 사용 내역 탭 ─────────────────────────────────────────────────────────────

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

/**
 * work_id 패턴에서 base UUID 추출
 * 'abc_use_paid' → 'abc', 'abc_use_bonus' → 'abc', 'abc' → 'abc', null → null
 */
const extractBaseWorkId = (workId: string | null): string | null => {
  if (!workId) return null;
  return workId.replace(/_use_paid$|_use_bonus$/, "");
};

/**
 * use + refund 쌍을 base workId 기준으로 합산해 순 차감량만 노출.
 * - 이미지 성공: use(-3) → -3 표시
 * - 이미지 실패: use(-3) + refund(+2) → -1 표시
 * - grant / admin 항목은 그대로 유지.
 * - workId 없는 refund(구매 환불)는 제외 (주문 목록에서 토큰 환불로 처리).
 */
function mergeUsageItems(items: HistoryItem[]): MergedUsageItem[] {
  const groupMap = new Map<string, { baseItem: HistoryItem; net: number }>();
  const standalone: HistoryItem[] = [];

  for (const item of items) {
    const baseId = extractBaseWorkId(item.workId ?? null);

    if ((item.type === "use" || item.type === "refund") && baseId) {
      const entry = groupMap.get(baseId);
      if (entry) {
        entry.net += item.amount;
        // use 항목을 대표 항목으로 유지 (description, createdAt 기준)
        if (item.type === "use") entry.baseItem = item;
      } else {
        groupMap.set(baseId, { baseItem: item, net: item.amount });
      }
    } else if (item.type !== "refund") {
      // workId 없는 use(레거시) 또는 grant/admin → 단독 노출
      standalone.push(item);
    }
    // workId 없는 refund는 구매 환불이므로 제외
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
    <div className="divide-y">
      {usageItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-4 py-3"
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

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function TokenHistoryPage() {
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
  const history = rawHistory ?? [];
  const usageHistory = history.filter(
    (item) => item.type === "use" || item.type === "refund",
  );

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="space-y-4 py-6">
            {/* 잔액 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>현재 토큰 잔액</CardTitle>
              </CardHeader>
              <CardContent>
                {isBalanceLoading && rawBalance === undefined ? (
                  <BalanceSkeleton />
                ) : balanceError && rawBalance === undefined ? (
                  <p className="text-sm text-red-600">
                    잔액을 불러오는 중 오류가 발생했습니다.
                  </p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-3xl font-semibold tracking-tight text-zinc-900">
                      {balance.total.toLocaleString()}
                      <span className="ml-1 text-base font-normal text-zinc-400">
                        토큰
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs text-zinc-500">
                      <span>유료 {balance.paid.toLocaleString()}</span>
                      <span>·</span>
                      <span>보너스/무료 {balance.bonus.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 text-sm font-semibold text-zinc-700">
                사용 내역
              </h2>
              <UsageTab
                history={usageHistory}
                isLoading={isHistoryLoading}
                error={historyError instanceof Error ? historyError : null}
              />
            </div>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
