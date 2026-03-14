import { useState } from "react";
import { MainContent, MainLayout } from "@/components/layout/main-layout";
import { PageLayout } from "@/components/layout/page-layout";
import { Empty } from "@/components/composite/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useCancelTokenRefundMutation,
} from "@/features/my-page/token-history/api/token-refund-query";
import type { RefundableTokenOrder } from "@/features/my-page/token-history/api/token-refund-api";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";

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

const extractOrderIdFromWorkId = (workId: string | null): string | null => {
  if (!workId) return null;
  const paidMatch = workId.match(/^order_([0-9a-f-]{36})_paid$/);
  if (paidMatch) return paidMatch[1];
  const plainMatch = workId.match(/^order_([0-9a-f-]{36})$/);
  if (plainMatch) return plainMatch[1];
  return null;
};

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

// ─── 환불 신청 다이얼로그 ─────────────────────────────────────────────────────

interface RefundDialogProps {
  order: RefundableTokenOrder;
  open: boolean;
  onClose: () => void;
}

function RefundDialog({ order, open, onClose }: RefundDialogProps) {
  const { mutateAsync: requestRefund, isPending } =
    useRequestTokenRefundMutation();

  const handleConfirm = async () => {
    try {
      await requestRefund({ orderId: order.orderId });
      toast.success("환불 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.");
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "환불 신청 중 오류가 발생했습니다.";
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>환불 신청</DialogTitle>
          <DialogDescription>
            아래 주문에 대해 환불을 신청합니다. 관리자 승인 후 결제 취소가
            진행됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-lg bg-zinc-50 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">주문번호</span>
            <span className="font-medium">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">유료 토큰</span>
            <span className="font-medium">
              {order.paidTokensGranted.toLocaleString()}개
            </span>
          </div>
          <div className="flex justify-between border-t border-zinc-200 pt-3">
            <span className="font-semibold text-zinc-700">환불 금액</span>
            <span className="font-bold text-zinc-900">
              {order.totalPrice.toLocaleString()}원
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400">
          * 가장 최근 구매한 토큰을 하나도 사용하지 않은 경우에만 환불이
          가능합니다.
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

// ─── 구매 내역 탭 ─────────────────────────────────────────────────────────────

interface PurchaseRowProps {
  item: HistoryItem;
  refundOrder: RefundableTokenOrder | null;
  onRequestRefund: (order: RefundableTokenOrder) => void;
}

function PurchaseRow({ item, refundOrder, onRequestRefund }: PurchaseRowProps) {
  const { mutateAsync: cancelRefund, isPending: isCancelling } =
    useCancelTokenRefundMutation();

  const handleCancelRefund = async (pendingRequestId: string) => {
    try {
      await cancelRefund(pendingRequestId);
      toast.success("환불 신청이 취소되었습니다.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "환불 취소 중 오류가 발생했습니다.";
      toast.error(message);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-4">
      <div className="min-w-0 flex-1 space-y-1">
        <span className="text-xs text-zinc-400">
          {formatDate(item.createdAt)}
        </span>
        {refundOrder ? (
          <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
            <span>
              유료 {refundOrder.paidTokensGranted.toLocaleString()}토큰
            </span>
          </div>
        ) : (
          <p className="break-words text-sm text-zinc-700">
            {item.description ??
              (item.type === "admin"
                ? "관리자 지급"
                : item.type === "grant"
                  ? "토큰 지급"
                  : "구매")}
          </p>
        )}
        {refundOrder ? (
          <p className="text-sm font-semibold text-zinc-900">
            {refundOrder.totalPrice.toLocaleString()}원
          </p>
        ) : null}
      </div>

      {/* 환불 상태/버튼 영역 */}
      <div className="shrink-0 text-right">
        {!refundOrder ? (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              item.amount >= 0 ? "text-green-600" : "text-red-500",
            )}
          >
            {formatAmount(item.amount)}
          </span>
        ) : refundOrder.notRefundableReason === "pending_refund" &&
          refundOrder.pendingRequestId ? (
          <div className="flex flex-col items-end gap-1.5">
            <Badge className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-50">
              환불 신청 중
            </Badge>
            <button
              className="text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline disabled:opacity-50"
              disabled={isCancelling}
              onClick={() => handleCancelRefund(refundOrder.pendingRequestId!)}
            >
              {isCancelling ? "취소 중..." : "신청 취소"}
            </button>
          </div>
        ) : refundOrder.notRefundableReason === "approved_refund" ? (
          <Badge className="bg-green-50 text-green-700 border-green-300 hover:bg-green-50">
            환불 완료
          </Badge>
        ) : refundOrder.isRefundable ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => onRequestRefund(refundOrder)}
          >
            환불 신청
          </Button>
        ) : refundOrder.notRefundableReason === "tokens_used" ? (
          <span className="text-xs text-zinc-400 leading-tight">
            환불 불가
            <br />
            (토큰 사용됨)
          </span>
        ) : (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              item.amount >= 0 ? "text-green-600" : "text-red-500",
            )}
          >
            {formatAmount(item.amount)}
          </span>
        )}
      </div>
    </div>
  );
}

interface PurchaseTabProps {
  purchaseItems: HistoryItem[];
  refundOrderMap: Map<string, RefundableTokenOrder>;
  isLoading: boolean;
  onRequestRefund: (order: RefundableTokenOrder) => void;
}

function PurchaseTab({
  purchaseItems,
  refundOrderMap,
  isLoading,
  onRequestRefund,
}: PurchaseTabProps) {
  if (isLoading && purchaseItems.length === 0) {
    return <HistorySkeleton />;
  }

  if (purchaseItems.length === 0) {
    return (
      <Empty
        title="구매 내역이 없습니다."
        description="토큰을 구매하면 이곳에서 확인하고 환불 신청할 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      {purchaseItems.map((item) => {
        const orderId = extractOrderIdFromWorkId(item.workId ?? null);
        const refundOrder = orderId
          ? (refundOrderMap.get(orderId) ?? null)
          : null;
        return (
          <PurchaseRow
            key={item.id}
            item={item}
            refundOrder={refundOrder}
            onRequestRefund={onRequestRefund}
          />
        );
      })}
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
 * - workId 없는 refund(구매 환불)는 제외 (구매 탭에서 처리).
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
  const [refundTarget, setRefundTarget] = useState<RefundableTokenOrder | null>(
    null,
  );

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
  const { data: refundableOrders } = useRefundableTokenOrdersQuery();

  const balance = rawBalance ?? { total: 0, paid: 0, bonus: 0 };
  const history = rawHistory ?? [];

  const purchaseItems = history.filter(
    (item) =>
      item.type === "purchase" ||
      item.type === "admin" ||
      item.type === "grant",
  );
  const refundOrderMap = new Map(
    (refundableOrders ?? []).map((o) => [o.orderId, o]),
  );
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

            {/* 탭 */}
            <Tabs defaultValue="purchase">
              <TabsList className="w-full">
                <TabsTrigger value="purchase" className="flex-1">
                  구매 내역
                </TabsTrigger>
                <TabsTrigger value="usage" className="flex-1">
                  사용 내역
                </TabsTrigger>
              </TabsList>

              <TabsContent value="purchase" className="mt-3">
                <PurchaseTab
                  purchaseItems={purchaseItems}
                  refundOrderMap={refundOrderMap}
                  isLoading={isHistoryLoading}
                  onRequestRefund={setRefundTarget}
                />
              </TabsContent>

              <TabsContent value="usage" className="mt-3">
                <UsageTab
                  history={usageHistory}
                  isLoading={isHistoryLoading}
                  error={historyError instanceof Error ? historyError : null}
                />
              </TabsContent>
            </Tabs>
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
