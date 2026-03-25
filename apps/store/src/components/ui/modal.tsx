import {
  Dialog,
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
    title,
    description,
    confirmText,
    cancelText,
    confirmVariant,
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
      <DialogContent>
        <DialogHeader>
          {title && <DialogTitle>{title}</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalModal;
