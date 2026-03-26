import type { ReactNode } from "react";
import { Button } from "@/components/ui-extended/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CartEditDialogProps {
  open: boolean;
  title: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

export const CartEditDialog = ({
  open,
  title,
  isSubmitting,
  onClose,
  onConfirm,
  children,
}: CartEditDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && !isSubmitting && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? "변경 중..." : "변경"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
