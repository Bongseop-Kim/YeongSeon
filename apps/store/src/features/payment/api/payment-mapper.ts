import { isRecord } from "@/lib/type-guard";

export interface ConfirmPaymentResponse {
  paymentKey: string;
  paymentGroupId: string;
  orders: Array<{ orderId: string; orderType: string }>;
  status: string;
}

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
  if (typeof data.paymentGroupId !== "string") {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: paymentGroupId 누락."
    );
  }
  if (!Array.isArray(data.orders)) {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: orders 누락."
    );
  }
  if (typeof data.status !== "string") {
    throw new Error(
      "결제 승인 응답이 올바르지 않습니다: status 누락."
    );
  }
  return {
    paymentKey: data.paymentKey,
    paymentGroupId: data.paymentGroupId,
    orders: (data.orders as Array<Record<string, unknown>>).map((o) => ({
      orderId: o.orderId as string,
      orderType: o.orderType as string,
    })),
    status: data.status,
  };
};
