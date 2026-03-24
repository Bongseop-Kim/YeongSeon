import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RefundableTokenOrder } from "@/features/my-page/token-history/api/token-refund-api";
import {
  useCancelTokenRefundMutation,
  useRequestTokenRefundMutation,
} from "@/features/my-page/token-history/api/token-refund-query";
import { toast } from "@/lib/toast";

interface TokenRefundDialogProps {
  order: RefundableTokenOrder;
  open: boolean;
  onClose: () => void;
}

function TokenRefundDialog({ order, open, onClose }: TokenRefundDialogProps) {
  const { mutateAsync: requestRefund, isPending } =
    useRequestTokenRefundMutation();

  const handleConfirm = async () => {
    try {
      await requestRefund({ orderId: order.orderId });
      toast.success("환불 신청이 완료되었습니다. 관리자 승인 후 처리됩니다.");
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "환불 신청 중 오류가 발생했습니다.",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
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
            {isPending ? "신청 중..." : "취소 요청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TokenRefundActionProps {
  refundOrder: RefundableTokenOrder | null;
}

export function TokenRefundAction({ refundOrder }: TokenRefundActionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { mutateAsync: cancelRefund, isPending: isCancelling } =
    useCancelTokenRefundMutation();

  if (!refundOrder) return null;

  const handleCancelRefund = async (pendingRequestId: string) => {
    try {
      await cancelRefund(pendingRequestId);
      toast.success("환불 신청이 취소되었습니다.");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "환불 취소 중 오류가 발생했습니다.",
      );
    }
  };

  if (refundOrder.notRefundableReason === "pending_refund") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <Badge className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50">
          환불 신청 중
        </Badge>
        <button
          type="button"
          className="text-xs text-zinc-400 underline-offset-2 hover:text-red-500 hover:underline disabled:opacity-50"
          disabled={isCancelling || !refundOrder.pendingRequestId}
          onClick={() => {
            if (!refundOrder.pendingRequestId) return;
            void handleCancelRefund(refundOrder.pendingRequestId);
          }}
        >
          {isCancelling ? "취소 중..." : "신청 취소"}
        </button>
      </div>
    );
  }

  if (refundOrder.notRefundableReason === "approved_refund") {
    return (
      <Badge className="border-green-300 bg-green-50 text-green-700 hover:bg-green-50">
        환불 완료
      </Badge>
    );
  }

  if (refundOrder.notRefundableReason === "active_refund") {
    return (
      <Badge className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-50">
        환불 처리 중
      </Badge>
    );
  }

  if (refundOrder.isRefundable) {
    return (
      <>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => setDialogOpen(true)}
        >
          취소 요청
        </Button>
        <TokenRefundDialog
          order={refundOrder}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
        />
      </>
    );
  }

  if (refundOrder.notRefundableReason === "tokens_used") {
    return (
      <span className="text-xs leading-tight text-zinc-400">
        환불 불가
        <br />
        (토큰 사용됨)
      </span>
    );
  }

  if (refundOrder.notRefundableReason === "no_paid_tokens") {
    return (
      <span className="text-xs leading-tight text-zinc-400">
        환불 불가
        <br />
        (유료 토큰 없음)
      </span>
    );
  }

  return null;
}
