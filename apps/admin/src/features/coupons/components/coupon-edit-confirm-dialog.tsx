import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogRoot,
  AlertDialogTitle,
} from "seed-design/ui/alert-dialog";
import type { ReactNode } from "react";

export interface CouponEditConfirmState {
  title: string;
  description: string;
  actionLabel: string;
  onConfirm: () => void;
}

interface CouponEditConfirmDialogProps {
  confirmState: CouponEditConfirmState | null;
  onClose: () => void;
}

export function CouponEditConfirmDialog({
  confirmState,
  onClose,
}: CouponEditConfirmDialogProps): ReactNode {
  return (
    <AlertDialogRoot
      open={Boolean(confirmState)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {confirmState ? (
        <AlertDialogContent layerIndex={60}>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="neutralWeak" onClick={onClose}>
              취소
            </AlertDialogAction>
            <AlertDialogAction
              variant="criticalSolid"
              onClick={() => {
                confirmState.onConfirm();
                onClose();
              }}
            >
              {confirmState.actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialogRoot>
  );
}
