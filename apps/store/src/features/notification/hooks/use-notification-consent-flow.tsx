import { useState } from "react";
import { saveNotificationConsent } from "@/features/notification/api/notification-api";
import { useNotificationStatus } from "@/features/notification/api/notification-status-query";

export interface NotificationConsentFlowState {
  showConsentModal: boolean;
  showVerifyModal: boolean;
  handleConsent: (agreed: boolean) => Promise<void>;
  onVerified: () => Promise<void>;
  dismissConsentModal: () => void;
  closeVerifyModal: () => Promise<void>;
}

export function useNotificationConsentFlow(onProceed: () => Promise<void>) {
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const { data: notificationStatus, refetch: refetchStatus } =
    useNotificationStatus();

  const initiateWithConsentCheck = async () => {
    if (!notificationStatus?.notificationConsent) {
      setShowConsentModal(true);
      return;
    }
    await onProceed();
  };

  const handleConsent = async (agreed: boolean) => {
    setShowConsentModal(false);
    if (agreed) {
      if (!notificationStatus?.phoneVerified) {
        setShowVerifyModal(true);
        return;
      }
      await saveNotificationConsent(true);
      await refetchStatus();
    }
    await onProceed();
  };

  const proceedWithoutConsent = async () => {
    setShowConsentModal(false);
    setShowVerifyModal(false);
    await onProceed();
  };

  const dismissConsentModal = () => {
    void proceedWithoutConsent();
  };

  const onVerified = async () => {
    await saveNotificationConsent(true);
    await refetchStatus();
    setShowVerifyModal(false);
    await onProceed();
  };

  const closeVerifyModal = async () => {
    await proceedWithoutConsent();
  };

  const consentFlow: NotificationConsentFlowState = {
    showConsentModal,
    showVerifyModal,
    handleConsent,
    onVerified,
    dismissConsentModal,
    closeVerifyModal,
  };

  return { initiateWithConsentCheck, consentFlow };
}
