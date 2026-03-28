import {
  type CustomPaymentState,
  isCustomPaymentState,
} from "@/features/order/custom-payment/types";

const CUSTOM_PAYMENT_STATE_STORAGE_KEY = "customPaymentState";

export const saveCustomPaymentState = (state: CustomPaymentState) => {
  sessionStorage.setItem(
    CUSTOM_PAYMENT_STATE_STORAGE_KEY,
    JSON.stringify(state),
  );
};

export const loadCustomPaymentState = (): CustomPaymentState | null => {
  const rawState = sessionStorage.getItem(CUSTOM_PAYMENT_STATE_STORAGE_KEY);
  if (!rawState) return null;

  try {
    const parsed = JSON.parse(rawState) as unknown;
    return isCustomPaymentState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const consumeCustomPaymentState = (): CustomPaymentState | null => {
  const state = loadCustomPaymentState();
  sessionStorage.removeItem(CUSTOM_PAYMENT_STATE_STORAGE_KEY);
  return state;
};
