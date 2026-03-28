import {
  isCustomPaymentState,
  type CustomPaymentState,
} from "@/lib/custom-payment-state";
import { ROUTES } from "@/constants/ROUTES";

export const AUTH_REDIRECT_STORAGE_KEY = "authRedirect";
const CUSTOM_PAYMENT_STATE_STORAGE_KEY = "customPaymentState";

export const consumeAuthRedirect = (): {
  redirectPath: string;
  state?: CustomPaymentState;
} | null => {
  const redirectPath = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  if (!redirectPath) return null;

  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);

  if (redirectPath !== ROUTES.CUSTOM_PAYMENT) {
    return { redirectPath };
  }

  const rawState = sessionStorage.getItem(CUSTOM_PAYMENT_STATE_STORAGE_KEY);
  sessionStorage.removeItem(CUSTOM_PAYMENT_STATE_STORAGE_KEY);

  if (!rawState) return { redirectPath };

  try {
    const parsed = JSON.parse(rawState) as unknown;
    return {
      redirectPath,
      state: isCustomPaymentState(parsed) ? parsed : undefined,
    };
  } catch {
    return { redirectPath };
  }
};
