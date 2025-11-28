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
    onConfirm,
    onCancel,
    closeModal,
  } = useModalStore();

  const handleConfirm = () => {
    onConfirm?.();
    closeModal();
  };

  const handleCancel = () => {
    onCancel?.();
    closeModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        className={
          modalType === "custom"
            ? "flex flex-col max-w-2xl max-h-[80vh] p-0"
            : undefined
        }
      >
        <DialogHeader
          className={modalType === "custom" ? "px-6 pt-6" : undefined}
        >
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && (
          <div
            className={
              modalType === "custom" ? "flex flex-col flex-1 min-h-90" : "py-4"
            }
          >
            {typeof children === "function" ? children() : children}
          </div>
        )}
        {customFooter
          ? typeof customFooter === "function"
            ? customFooter()
            : customFooter
          : showDefaultFooter && (
              <DialogFooter>
                <DialogClose asChild className="flex-1">
                  <Button variant="outline" onClick={handleCancel}>
                    {cancelText}
                  </Button>
                </DialogClose>
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
