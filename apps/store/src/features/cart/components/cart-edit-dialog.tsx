import type { ReactNode } from "react";
import { Dialog } from "@/shared/ui-extended/dialog";
import { ResponsiveDialogScaffold } from "@/shared/ui-extended/responsive-dialog-scaffold";

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
      <ResponsiveDialogScaffold
        title={title}
        cancelDisabled={isSubmitting}
        confirmDisabled={isSubmitting}
        confirmLabel={isSubmitting ? "변경 중..." : "변경"}
        onCancel={onClose}
        onConfirm={onConfirm}
      >
        {children}
      </ResponsiveDialogScaffold>
    </Dialog>
  );
};
