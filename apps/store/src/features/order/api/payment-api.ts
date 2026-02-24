import { supabase } from "@/lib/supabase";

interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

interface ConfirmPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
}

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

  return data as ConfirmPaymentResponse;
};
