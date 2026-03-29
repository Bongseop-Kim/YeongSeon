import { supabase } from "@/shared/lib/supabase";
import { FunctionsHttpError } from "@yeongseon/supabase";
import {
  parseConfirmPaymentResponse,
  type ConfirmPaymentResponse,
} from "@/features/payment/api/payment-mapper";

export interface ConfirmPaymentRequest {
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
  request: ConfirmPaymentRequest,
): Promise<ConfirmPaymentResponse> => {
  if (!request.paymentKey || !request.orderId) {
    throw new Error("결제 정보가 올바르지 않습니다.");
  }
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    throw new Error("결제 금액이 올바르지 않습니다.");
  }

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
