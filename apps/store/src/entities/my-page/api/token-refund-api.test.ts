import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenRefundRpcError } from "@/entities/my-page/api/token-refund-api";
import { requestTokenRefund } from "@/entities/my-page/api/token-refund-api";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("requestTokenRefund", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("만료된 토큰 주문 오류를 구조화된 코드로 해석한다", async () => {
    rpcMock.mockResolvedValue({
      error: {
        message: "token_order_expired",
        code: "P0001",
        details: JSON.stringify({
          code: "token_order_expired",
          message: "refund period has passed",
        }),
      },
    });

    await expect(requestTokenRefund("order-1")).rejects.toMatchObject({
      code: "token_order_expired",
      message: "refund period has passed",
    } satisfies Partial<TokenRefundRpcError>);
  });

  it("구조화되지 않은 RPC 오류는 일반 실패 메시지로 감싼다", async () => {
    rpcMock.mockResolvedValue({
      error: {
        message: "unexpected failure",
      },
    });

    await expect(requestTokenRefund("order-1")).rejects.toThrow(
      "환불 신청 실패: unexpected failure",
    );
  });
});
