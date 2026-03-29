import type { CustomPaymentState } from "@/shared/lib/custom-payment-state";

const CUSTOM_PAYMENT_STATE_STORAGE_KEY = "customPaymentState";

export const saveCustomPaymentState = (state: CustomPaymentState) => {
  sessionStorage.setItem(
    CUSTOM_PAYMENT_STATE_STORAGE_KEY,
    JSON.stringify(state),
  );
};

export const removeCustomPaymentState = () => {
  sessionStorage.removeItem(CUSTOM_PAYMENT_STATE_STORAGE_KEY);
};
