import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Empty } from "@/components/composite/empty";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDesignTokenBalanceQuery,
  useDesignTokenHistoryQuery,
} from "@/features/design/api/ai-design-query";
import { cn } from "@/lib/utils";

const TOKEN_TYPE_LABELS: Record<string, string> = {
  grant: "지급",
  use: "사용",
  refund: "환불",
  admin: "관리자",
};

const formatAmount = (amount: number) => {
  const prefix = amount > 0 ? "+" : "";

  return `${prefix}${amount.toLocaleString()}`;
};

const formatDate = (value: string) => value.slice(0, 10);

function TokenHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-14" />
            </div>
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function TokenHistoryPage() {
  const {
    data: balance = 0,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useDesignTokenBalanceQuery();
  const {
    data: history = [],
    isLoading: isHistoryLoading,
    error: historyError,
  } = useDesignTokenHistoryQuery();

  const errorMessage = balanceError instanceof Error
    ? balanceError.message
    : historyError instanceof Error
      ? historyError.message
      : "오류가 발생했습니다.";

  return (
    <MainLayout>
      <MainContent>
        <PageLayout>
          <div className="space-y-4 py-6">
            <Card>
              <CardHeader>
                <CardTitle>현재 토큰 잔액</CardTitle>
              </CardHeader>
              <CardContent>
                {isBalanceLoading ? (
                  <Skeleton className="h-9 w-32" />
                ) : (
                  <div className="text-3xl font-semibold tracking-tight text-zinc-900">
                    {balance.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>토큰 내역</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {historyError || balanceError ? (
                  <Empty
                    title="토큰 내역을 불러올 수 없습니다."
                    description={errorMessage}
                  />
                ) : isHistoryLoading ? (
                  <TokenHistorySkeleton />
                ) : history.length === 0 ? (
                  <Empty
                    title="토큰 내역이 없습니다."
                    description="토큰이 지급되거나 사용되면 이곳에서 확인할 수 있습니다."
                  />
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <Card key={item.id} className="gap-0 py-0 shadow-none">
                        <CardContent className="flex items-start justify-between gap-4 py-4">
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm text-zinc-500">
                                {formatDate(item.createdAt)}
                              </span>
                              <Badge variant="outline">
                                {TOKEN_TYPE_LABELS[item.type] ?? item.type}
                              </Badge>
                            </div>
                            <p className="break-words text-sm text-zinc-700">
                              {item.description ?? "설명이 없습니다."}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "shrink-0 text-base font-semibold",
                              item.amount >= 0 ? "text-green-600" : "text-red-600",
                            )}
                          >
                            {formatAmount(item.amount)}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </PageLayout>
      </MainContent>
    </MainLayout>
  );
}
