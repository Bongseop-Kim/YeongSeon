import { describe, expect, it } from "vitest";
import { TokenRefundRpcError } from "@/entities/my-page/api/token-refund-api";
import { getTokenRefundErrorMessage } from "@/entities/my-page/api/token-refund-query";

describe("getTokenRefundErrorMessage", () => {
  it("만료 오류 코드를 사용자 문구로 변환한다", () => {
    expect(
      getTokenRefundErrorMessage(
        new TokenRefundRpcError(
          "token_order_expired",
          "refund period has passed",
        ),
      ),
    ).toBe("환불 가능 기간이 지난 토큰 주문입니다.");
  });

  it("일반 Error는 기존 메시지를 유지한다", () => {
    expect(getTokenRefundErrorMessage(new Error("환불 신청 실패: x"))).toBe(
      "환불 신청 실패: x",
    );
  });

  it("알 수 없는 오류는 기본 문구를 반환한다", () => {
    expect(getTokenRefundErrorMessage("x")).toBe(
      "환불 신청 중 오류가 발생했습니다.",
    );
  });
});
