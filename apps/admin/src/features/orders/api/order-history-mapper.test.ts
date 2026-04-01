import type { ClaimStatusLogDTO } from "@yeongseon/shared";
import { describe, expect, it } from "vitest";
import { toAdminOrderHistoryEntries } from "@/features/orders/api/order-history-mapper";
import {
  createClaimStatusLogDTO,
  createOrderStatusLogDTO,
} from "@/test/fixtures";

function createOrderScopedClaimStatusLogDTO(
  overrides?: Partial<
    ClaimStatusLogDTO & {
      orderId: string;
      claimNumber: string;
      claimType: "cancel" | "return" | "exchange" | "token_refund";
    }
  >,
) {
  return {
    ...createClaimStatusLogDTO(),
    orderId: "order-1",
    claimNumber: "CLM-001",
    claimType: "return",
    ...overrides,
  } as ClaimStatusLogDTO & {
    orderId: string;
    claimNumber: string;
    claimType: "cancel" | "return" | "exchange" | "token_refund";
  };
}

describe("toAdminOrderHistoryEntries", () => {
  it("주문 로그와 클레임 로그를 createdAt 내림차순 통합 이력으로 합친다", () => {
    const logs = toAdminOrderHistoryEntries({
      orderLogs: [
        createOrderStatusLogDTO({
          id: "order-log-older",
          createdAt: "2026-03-15T10:00:00Z",
          previousStatus: "결제완료",
          newStatus: "상품준비중",
        }),
        createOrderStatusLogDTO({
          id: "order-log-newer",
          createdAt: "2026-03-15T12:00:00Z",
          previousStatus: "상품준비중",
          newStatus: "배송중",
        }),
      ],
      claimLogs: [
        createOrderScopedClaimStatusLogDTO({
          id: "claim-log-middle",
          createdAt: "2026-03-15T11:00:00Z",
          previousStatus: "접수",
          newStatus: "처리중",
          claimId: "claim-1",
          claimNumber: "CLM-001",
          claimType: "return",
        }),
      ],
    });

    expect(logs).toEqual([
      expect.objectContaining({
        id: "order-log-newer",
        kind: "order",
        createdAt: "2026-03-15T12:00:00Z",
      }),
      expect.objectContaining({
        id: "claim-log-middle",
        kind: "claim",
        claimId: "claim-1",
        claimNumber: "CLM-001",
        claimType: "return",
        previousStatus: "접수",
        newStatus: "처리중",
        createdAt: "2026-03-15T11:00:00Z",
      }),
      expect.objectContaining({
        id: "order-log-older",
        kind: "order",
        createdAt: "2026-03-15T10:00:00Z",
      }),
    ]);
  });

  it("같은 createdAt이면 id로 tie-break하여 결정적으로 정렬한다", () => {
    const logs = toAdminOrderHistoryEntries({
      orderLogs: [
        createOrderStatusLogDTO({
          id: "order-log-z",
          createdAt: "2026-03-15T11:00:00Z",
          previousStatus: "결제완료",
          newStatus: "상품준비중",
        }),
      ],
      claimLogs: [
        createOrderScopedClaimStatusLogDTO({
          id: "claim-log-a",
          createdAt: "2026-03-15T11:00:00Z",
          previousStatus: "접수",
          newStatus: "처리중",
          claimId: "claim-1",
          claimNumber: "CLM-001",
          claimType: "return",
        }),
      ],
    });

    expect(logs.map((log) => log.id)).toEqual(["order-log-z", "claim-log-a"]);
  });
});
