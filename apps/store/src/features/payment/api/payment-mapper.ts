import { isRecord } from "@/shared/lib/type-guard";

interface OrderConfirmPaymentResponse {
  type?: never;
  paymentKey: string;
  paymentGroupId: string;
  orders: Array<{
    orderId: string;
    orderType: string;
    couponIssued?: boolean | null;
  }>;
  status: string;
}

interface TokenPurchaseConfirmPaymentResponse {
  type: "token_purchase";
  paymentKey: string;
  paymentGroupId: string;
  orders: Array<{
    orderId: string;
    orderType: string;
    couponIssued?: boolean | null;
  }>;
  tokenAmount: number;
  status: string;
}

type ConfirmPaymentResponse =
  | OrderConfirmPaymentResponse
  | TokenPurchaseConfirmPaymentResponse;

const mapOrderItem = (
  o: Record<string, unknown>,
): { orderId: string; orderType: string; couponIssued?: boolean | null } => {
  if (typeof o.orderId !== "string" || typeof o.orderType !== "string") {
    throw new Error("주문 항목 형식이 올바르지 않습니다");
  }

  if (o.couponIssued !== undefined) {
    const isValidCouponIssued =
      typeof o.couponIssued === "boolean" || o.couponIssued === null;
    if (!isValidCouponIssued) {
      throw new Error(
        `주문 ${o.orderId}의 couponIssued 값이 올바르지 않습니다: ${String(o.couponIssued)}`,
      );
    }
  }

  return {
    orderId: o.orderId,
    orderType: o.orderType,
    couponIssued: o.couponIssued as boolean | null | undefined,
  };
};

export const parseConfirmPaymentResponse = (
  data: unknown,
): ConfirmPaymentResponse => {
  if (!isRecord(data)) {
    throw new Error("결제 승인 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (typeof data.paymentKey !== "string") {
    throw new Error("결제 승인 응답이 올바르지 않습니다: paymentKey 누락.");
  }
  if (typeof data.paymentGroupId !== "string") {
    throw new Error("결제 승인 응답이 올바르지 않습니다: paymentGroupId 누락.");
  }
  if (typeof data.status !== "string") {
    throw new Error("결제 승인 응답이 올바르지 않습니다: status 누락.");
  }
  if (!Array.isArray(data.orders)) {
    throw new Error("결제 승인 응답이 올바르지 않습니다: orders 누락.");
  }

  const mapOrders = (orders: unknown[], label: string) =>
    orders.map((o, i) => {
      if (!isRecord(o)) {
        throw new Error(
          `결제 승인 응답이 올바르지 않습니다: ${label}[${i}]가 올바른 객체가 아닙니다.`,
        );
      }
      return mapOrderItem(o);
    });

  if (data.type === "token_purchase") {
    if (typeof data.tokenAmount !== "number") {
      throw new Error("결제 승인 응답이 올바르지 않습니다: tokenAmount 누락.");
    }
    return {
      type: "token_purchase",
      paymentKey: data.paymentKey,
      paymentGroupId: data.paymentGroupId,
      orders: mapOrders(data.orders, "orders"),
      tokenAmount: data.tokenAmount,
      status: data.status,
    };
  }
  return {
    paymentKey: data.paymentKey,
    paymentGroupId: data.paymentGroupId,
    orders: mapOrders(data.orders, "orders"),
    status: data.status,
  };
};
