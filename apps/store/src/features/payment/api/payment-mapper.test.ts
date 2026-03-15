import { describe, expect, it } from "vitest";
import { parseConfirmPaymentResponse } from "@/features/payment/api/payment-mapper";
import { createConfirmPaymentResponseRaw } from "@/test/fixtures";

describe("parseConfirmPaymentResponse", () => {
  it("일반 주문 결제 응답을 파싱한다", () => {
    expect(
      parseConfirmPaymentResponse(createConfirmPaymentResponseRaw()),
    ).toEqual({
      paymentKey: "pay-key",
      paymentGroupId: "pg-1",
      orders: [{ orderId: "order-1", orderType: "sale" }],
      status: "DONE",
    });
  });

  it("토큰 구매 결제 응답을 파싱한다", () => {
    expect(
      parseConfirmPaymentResponse(
        createConfirmPaymentResponseRaw({
          type: "token_purchase",
          tokenAmount: 20,
          orders: [{ orderId: "order-2", orderType: "token" }],
        }),
      ),
    ).toEqual({
      type: "token_purchase",
      paymentKey: "pay-key",
      paymentGroupId: "pg-1",
      orders: [{ orderId: "order-2", orderType: "token" }],
      tokenAmount: 20,
      status: "DONE",
    });
  });

  describe("에러 케이스", () => {
    it("객체가 아니면 에러를 던진다", () => {
      expect(() => parseConfirmPaymentResponse(null)).toThrow(
        "결제 승인 응답이 올바르지 않습니다: 객체가 아닙니다.",
      );
    });

    it("orders 항목 형식이 잘못되면 에러를 던진다", () => {
      expect(() =>
        parseConfirmPaymentResponse(
          createConfirmPaymentResponseRaw({
            orders: [{ orderId: "order-1" }],
          }),
        ),
      ).toThrow("주문 항목 형식이 올바르지 않습니다");
    });

    it("토큰 구매 응답에서 tokenAmount가 없으면 에러를 던진다", () => {
      expect(() =>
        parseConfirmPaymentResponse(
          createConfirmPaymentResponseRaw({
            type: "token_purchase",
          }),
        ),
      ).toThrow("결제 승인 응답이 올바르지 않습니다: tokenAmount 누락.");
    });

    it("status가 문자열이 아니면 에러를 던진다", () => {
      expect(() =>
        parseConfirmPaymentResponse(
          createConfirmPaymentResponseRaw({
            status: 123,
          }),
        ),
      ).toThrow("결제 승인 응답이 올바르지 않습니다: status 누락.");
    });
  });
});
