import { supabase } from "@/lib/supabase";
import {
  parseConfirmPaymentResponse,
  type ConfirmPaymentResponse,
} from "@/features/order/api/payment-mapper";

interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export type { ConfirmPaymentResponse };

export const confirmPayment = async (
  request: ConfirmPaymentRequest
): Promise<ConfirmPaymentResponse> => {
  const { data, error } = await supabase.functions.invoke("confirm-payment", {
    body: request,
  });

  if (error) {
    throw new Error(`결제 승인 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("결제 승인 결과를 받을 수 없습니다.");
  }

  return parseConfirmPaymentResponse(data);
};
