import { useState } from "react";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Empty } from "@/components/composite/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useDesignTokenBalanceQuery,
  useDesignTokenHistoryQuery,
} from "@/features/design/api/ai-design-query";
import {
  useRefundableTokenOrdersQuery,
  useRequestTokenRefundMutation,
} from "@/features/my-page/token-history/api/token-refund-query";
import type { RefundableTokenOrder } from "@/features/my-page/token-history/api/token-refund-api";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

const TOKEN_TYPE_LABELS: Record<string, string> = {
  grant: "지급",
  use: "사용",
  refund: "환불",
  admin: "관리자",
  purchase: "구매",
};

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

interface RefundDialogProps {
  order: RefundableTokenOrder;
  open: boolean;
  onClose: () => void;
}

function RefundDialog({ order, open, onClose }: RefundDialogProps) {
  const { mutateAsync: requestRefund, isPending } = useRequestTokenRefundMutation();

  const handleConfirm = async () => {
    try {
      await requestRefund({ orderId: order.orderId });
      toast.success("환불 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "환불 신청 중 오류가 발생했습니다.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>환불 신청</DialogTitle>
          <DialogDescription>
            아래 주문에 대해 환불을 신청합니다. 관리자 승인 후 결제 취소가 진행됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">주문번호</span>
            <span className="font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">유료 토큰</span>
            <span className="font-medium">{order.paidTokensGranted.toLocaleString()}개</span>
          </div>
          {order.bonusTokensGranted > 0 && (
            <div className="flex justify-between">
              <span className="text-zinc-500">보너스 토큰 (회수)</span>
              <span className="font-medium text-amber-600">{order.bonusTokensGranted.toLocaleString()}개</span>
            </div>
          )}
          <div className="flex justify-between border-t border-zinc-200 pt-3">
            <span className="font-semibold text-zinc-700">환불 금액</span>
            <span className="font-bold text-zinc-900">{order.totalPrice.toLocaleString()}원</span>
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          * 보너스 토큰은 환불 불가하며 환불 승인 시 자동 회수됩니다.<br />
          * 유료 토큰을 1개라도 사용한 경우 환불이 불가합니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "신청 중..." : "환불 신청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TokenHistoryPage() {
  const [refundTarget, setRefundTarget] = useState<RefundableTokenOrder | null>(null);

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
  const {
    data: refundableOrders,
  } = useRefundableTokenOrdersQuery();

  const balance = rawBalance ?? { total: 0, paid: 0, bonus: 0 };
  const history = rawHistory ?? [];
  const refundableList = (refundableOrders ?? []).filter((o) => o.isRefundable);

  const historyErrorMessage = historyError instanceof Error
    ? historyError.message
    : "오류가 발생했습니다.";

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
                  <Skeleton className="h-9 w-32" />
                ) : balanceError && rawBalance === undefined ? (
                  <p className="text-sm text-red-600">잔액을 불러오는 중 오류가 발생했습니다.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="text-3xl font-semibold tracking-tight text-zinc-900">
                      {balance.total.toLocaleString()}
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

            {/* 환불 가능한 구매 내역 (있는 경우만) */}
            {refundableList.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>환불 신청 가능한 구매</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="space-y-3">
                    {refundableList.map((order) => (
                      <div
                        key={order.orderId}
                        className="flex items-center justify-between gap-4 rounded-lg border border-zinc-100 p-4"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="text-sm font-medium text-zinc-900">
                            {order.orderNumber}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(order.createdAt)} · 유료 {order.paidTokensGranted}개
                            {order.bonusTokensGranted > 0 && ` + 보너스 ${order.bonusTokensGranted}개`}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-zinc-900">
                            {order.totalPrice.toLocaleString()}원
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-1 h-7 text-xs"
                            onClick={() => setRefundTarget(order)}
                          >
                            환불 신청
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 토큰 내역 카드 */}
            <Card>
              <CardHeader>
                <CardTitle>토큰 내역</CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {rawHistory === undefined && isHistoryLoading ? (
                  <TokenHistorySkeleton />
                ) : rawHistory === undefined && historyError ? (
                  <Empty
                    title="토큰 내역을 불러올 수 없습니다."
                    description={historyErrorMessage}
                  />
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

      {refundTarget && (
        <RefundDialog
          order={refundTarget}
          open
          onClose={() => setRefundTarget(null)}
        />
      )}
    </MainLayout>
  );
}
