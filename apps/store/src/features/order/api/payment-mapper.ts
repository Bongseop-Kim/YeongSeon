export interface ConfirmPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const parseConfirmPaymentResponse = (
  data: unknown
): ConfirmPaymentResponse => {
  if (!isRecord(data)) {
    throw new Error("결제 승인 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (typeof data.paymentKey !== "string") {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: paymentKey 누락."
    );
  }
  if (typeof data.orderId !== "string") {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: orderId 누락."
    );
  }
  if (typeof data.status !== "string") {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: status 누락."
    );
  }
  return {
    paymentKey: data.paymentKey,
    orderId: data.orderId,
    status: data.status,
  };
};
