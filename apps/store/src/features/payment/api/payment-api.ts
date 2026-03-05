import { supabase } from "@/lib/supabase";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  parseConfirmPaymentResponse,
  type ConfirmPaymentResponse,
} from "@/features/payment/api/payment-mapper";

interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export type { ConfirmPaymentResponse };

const extractEdgeFunctionErrorMessage = async (
  error: unknown,
): Promise<string | null> => {
  if (!(error instanceof FunctionsHttpError)) {
    return null;
  }

  try {
    const payload = await error.context.json();
    if (payload && typeof payload === "object" && "error" in payload) {
      const message = payload.error;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
};

export const confirmPayment = async (
  request: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> => {
  const { data, error } = await supabase.functions.invoke("confirm-payment", {
    body: request,
  });

  if (error) {
    const message =
      (await extractEdgeFunctionErrorMessage(error)) ??
      "결제 승인에 실패했습니다.";
    throw new Error(message);
  }

  if (!data) {
    throw new Error("결제 승인 결과를 받을 수 없습니다.");
  }

  return parseConfirmPaymentResponse(data);
};
