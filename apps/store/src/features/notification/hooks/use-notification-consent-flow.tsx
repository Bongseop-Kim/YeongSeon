import { useState } from "react";
import { saveNotificationConsent } from "@/features/notification/api/notification-api";
import { useProfile } from "@/features/my-page/api/profile-query";

export interface NotificationConsentFlowState {
  showConsentModal: boolean;
  showVerifyModal: boolean;
  handleConsent: (agreed: boolean) => Promise<void>;
  onVerified: () => Promise<void>;
  closeVerifyModal: () => void;
}

export function useNotificationConsentFlow(onProceed: () => Promise<void>) {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { data: profile, refetch: refetchProfile } = useProfile();

  const initiateWithConsentCheck = async () => {
    if (!profile?.notificationConsent) {
      setShowConsentModal(true);
      return;
    }
    await onProceed();
  };

  const handleConsent = async (agreed: boolean) => {
    setShowConsentModal(false);
    if (agreed) {
      if (!profile?.phoneVerified) {
        setShowVerifyModal(true);
        return;
      }
      await saveNotificationConsent(true);
      await refetchProfile();
    }
    await onProceed();
  };

  const onVerified = async () => {
    await saveNotificationConsent(true);
    await refetchProfile();
    setShowVerifyModal(false);
    await onProceed();
  };

  const closeVerifyModal = () => setShowVerifyModal(false);

  const consentFlow: NotificationConsentFlowState = {
    showConsentModal,
    showVerifyModal,
    handleConsent,
    onVerified,
    closeVerifyModal,
  };

  return { initiateWithConsentCheck, consentFlow };
}
