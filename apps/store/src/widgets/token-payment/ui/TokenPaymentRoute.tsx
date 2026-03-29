import { useCallback, useEffect, useRef } from "react";
import {
  useNotificationConsentFlow,
  NotificationConsentFlowModals,
} from "@/features/notification";
import { TokenPaymentPage } from "@/features/token-purchase";

export function TokenPaymentWidget() {
  const proceedToPaymentRef = useRef<() => Promise<void>>(async () => {});
  const isMountedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { initiateWithConsentCheck, consentFlow } = useNotificationConsentFlow(
    async () => {
      console.log(
        "[TokenPaymentWidget] onProceed called, isMounted:",
        isMountedRef.current,
        "proceedRef:",
        proceedToPaymentRef.current?.name,
      );
      if (isMountedRef.current) {
        await proceedToPaymentRef.current();
      }
    },
  );

  const registerProceedToPayment = useCallback(
    (handler: () => Promise<void>) => {
      proceedToPaymentRef.current = handler;
    },
    [],
  );

  return (
    <>
      <TokenPaymentPage
        onRequestPayment={initiateWithConsentCheck}
        registerProceedToPayment={registerProceedToPayment}
      />
      <NotificationConsentFlowModals consentFlow={consentFlow} />
    </>
  );
}
