import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui-extended/dialog";
import { Button } from "@/components/ui-extended/button";

interface NotificationConsentModalProps {
  isOpen: boolean;
  onConsent: (agreed: boolean) => void | Promise<void>;
  onDismiss: () => void;
}

export const NotificationConsentModal = ({
  isOpen,
  onConsent,
  onDismiss,
}: NotificationConsentModalProps) => {
  const handleConsent = (agreed: boolean) => {
    void Promise.resolve(onConsent(agreed)).catch((error) => {
      console.error("Failed to handle notification consent:", error);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>알림 수신 동의</DialogTitle>
          <DialogDescription>
            주문 진행 상황을 문자/카카오톡으로 안내해드립니다. 이를 위해 휴대폰
            번호를 수집합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={() => handleConsent(true)} className="w-full">
            동의하고 계속
          </Button>
          <Button
            variant="outline"
            onClick={() => handleConsent(false)}
            className="w-full"
          >
            동의 없이 계속
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
