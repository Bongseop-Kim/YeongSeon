import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { toAdminOrderHistoryEntries } from "@/features/orders/api/order-history-mapper";
import { StatusLogTable } from "@/features/orders/components/status-log-table";
import {
  createClaimStatusLogDTO,
  createOrderStatusLogDTO,
} from "@/test/fixtures";

function createOrderScopedClaimStatusLogDTO() {
  return {
    ...createClaimStatusLogDTO({
      id: "claim-log-a",
      createdAt: "2026-03-15T11:00:00Z",
      previousStatus: "접수",
      newStatus: "처리중",
      memo: "클레임 메모",
      claimId: "claim-1",
    }),
    orderId: "order-1",
    claimNumber: "CLM-001",
    claimType: "return" as const,
  };
}

describe("StatusLogTable", () => {
  it("통합 이력을 렌더링하고 같은 timestamp는 deterministic 순서를 유지한다", () => {
    const logs = toAdminOrderHistoryEntries({
      orderLogs: [
        createOrderStatusLogDTO({
          id: "order-log-z",
          createdAt: "2026-03-15T11:00:00Z",
          previousStatus: "결제완료",
          newStatus: "상품준비중",
          memo: "주문 메모",
        }),
      ],
      claimLogs: [createOrderScopedClaimStatusLogDTO()],
    });

    render(<StatusLogTable logs={logs} />);

    expect(screen.getByText("클레임")).toBeInTheDocument();
    expect(screen.getByText("주문")).toBeInTheDocument();
    expect(screen.getByText("CLM-001")).toBeInTheDocument();
    expect(screen.getByText("주문 메모")).toBeInTheDocument();
    expect(screen.getByText("클레임 메모")).toBeInTheDocument();

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("주문 메모");
    expect(rows[1]).toHaveTextContent("클레임 메모");
  });
});
