import type { ReactNode } from "react";

import { Button } from "@/shared/ui-extended/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import type { DialogMobilePresentation } from "@/shared/ui/dialog-presentation";
import { cn } from "@/shared/lib/utils";

interface ResponsiveDialogScaffoldProps {
  title: ReactNode;
  children: ReactNode;
  cancelLabel?: string;
  confirmLabel: ReactNode;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  mobilePresentation?: DialogMobilePresentation;
  contentId?: string;
  contentClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

export function ResponsiveDialogScaffold({
  title,
  children,
  cancelLabel = "취소",
  confirmLabel,
  confirmDisabled,
  cancelDisabled,
  onCancel,
  onConfirm,
  mobilePresentation = "sheet",
  contentId,
  contentClassName,
  bodyClassName,
  footerClassName,
}: ResponsiveDialogScaffoldProps) {
  return (
    <DialogContent
      id={contentId}
      mobilePresentation={mobilePresentation}
      className={cn(
        "flex max-h-[min(640px,85dvh)] flex-col gap-0 p-0",
        contentClassName,
      )}
    >
      <DialogHeader className="shrink-0 border-b border-zinc-200 p-5">
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-5", bodyClassName)}>
        {children}
      </div>
      <DialogFooter
        className={cn("shrink-0 border-t border-zinc-200 p-5", footerClassName)}
      >
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={cancelDisabled}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
