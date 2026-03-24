import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationConsentModal } from "@/features/notification/components/notification-consent-modal";
import { PhoneVerificationForm } from "@/features/notification/components/phone-verification-form";
import type { NotificationConsentFlowState } from "@/features/notification/hooks/use-notification-consent-flow";

interface Props {
  consentFlow: NotificationConsentFlowState;
}

export function NotificationConsentFlowModals({ consentFlow }: Props) {
  return (
    <>
      <NotificationConsentModal
        isOpen={consentFlow.showConsentModal}
        onConsent={consentFlow.handleConsent}
      />
      <Dialog
        open={consentFlow.showVerifyModal}
        onOpenChange={(open) => !open && consentFlow.closeVerifyModal()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전화번호 인증</DialogTitle>
          </DialogHeader>
          <PhoneVerificationForm onVerified={consentFlow.onVerified} />
        </DialogContent>
      </Dialog>
    </>
  );
}
