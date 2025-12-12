import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/store/modal";
import { cn } from "@/lib/utils";
import { useBreakpoint } from "@/providers/breakpoint-provider";

const GlobalModal = () => {
  const {
    isOpen,
    modalType,
    title,
    description,
    children,
    confirmText,
    cancelText,
    confirmVariant,
    customFooter,
    showDefaultFooter,
    fullScreenOnMobile,
    onConfirm,
    onCancel,
    closeModal,
  } = useModalStore();
  const { isMobile } = useBreakpoint();

  const handleConfirm = () => {
    onConfirm?.();
    closeModal();
  };

  const handleCancel = () => {
    onCancel?.();
    closeModal();
  };

  const isFullScreen = fullScreenOnMobile && isMobile;

  const getContentClassName = () => {
    const baseClasses = ["flex flex-col"];

    if (modalType === "custom") {
      baseClasses.push("max-w-2xl p-0");
    }

    if (isFullScreen) {
      baseClasses.push(
        "inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-full h-full max-h-full rounded-none border-0"
      );
    } else {
      baseClasses.push("max-h-[min(600px,80dvh)]");
    }

    return cn(baseClasses);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className={getContentClassName()}>
        <DialogHeader
          className={cn("shrink-0", modalType === "custom" && "px-6 pt-6")}
        >
          {title && <DialogTitle>{title}</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && (
          <div
            className={cn(
              "flex-1 overflow-y-auto",
              modalType === "custom" ? "flex flex-col min-h-0" : "py-4"
            )}
          >
            {typeof children === "function" ? children() : children}
          </div>
        )}
        {customFooter
          ? typeof customFooter === "function"
            ? customFooter()
            : customFooter
          : showDefaultFooter && (
              <DialogFooter className="shrink-0">
                {modalType !== "alert" && (
                  <DialogClose asChild className="flex-1">
                    <Button variant="outline" onClick={handleCancel}>
                      {cancelText}
                    </Button>
                  </DialogClose>
                )}
                <DialogClose asChild className="flex-1">
                  <Button variant={confirmVariant} onClick={handleConfirm}>
                    {confirmText}
                  </Button>
                </DialogClose>
              </DialogFooter>
            )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalModal;
