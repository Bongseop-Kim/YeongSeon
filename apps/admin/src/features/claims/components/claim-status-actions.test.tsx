import { App } from "antd";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClaimStatusActions } from "@/features/claims/components/claim-status-actions";
import type { AdminClaimDetail } from "@/features/claims/types/admin-claim";

function createClaim(
  overrides: Partial<AdminClaimDetail> = {},
): AdminClaimDetail {
  return {
    id: "claim-1",
    claimNumber: "CLM-1",
    date: "2026-03-31",
    claimType: "cancel",
    status: "접수",
    reason: "단순 변심",
    description: null,
    claimQuantity: 1,
    itemType: "product",
    productName: "상품",
    customer: {
      userId: "user-1",
      name: "홍길동",
      phone: null,
    },
    linkedOrder: {
      orderId: "order-1",
      orderNumber: "ORD-1",
    },
    orderShipping: {
      orderStatus: "배송중",
      courierCompany: null,
      trackingNumber: null,
      shippedAt: null,
    },
    returnTracking: null,
    resendTracking: null,
    refundData: null,
    ...overrides,
  };
}

describe("ClaimStatusActions", () => {
  it("공용 메모 입력 없이 롤백 모달에서만 사유를 받는다", async () => {
    const onRollback = vi.fn().mockResolvedValue(undefined);

    render(
      <App>
        <ClaimStatusActions
          claim={createClaim()}
          nextStatus="처리중"
          rollbackStatus="대기"
          onStatusChange={vi.fn().mockResolvedValue(undefined)}
          onRollback={onRollback}
          isUpdating={false}
        />
      </App>,
    );

    expect(
      screen.queryByPlaceholderText("상태 변경 사유 (이력에 기록됨)"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "대기로 롤백" }));
    fireEvent.click(screen.getByRole("button", { name: "롤백" }));

    expect(onRollback).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("롤백 사유 (필수)"), {
      target: { value: "오처리 복구" },
    });
    fireEvent.click(screen.getByRole("button", { name: "롤백" }));

    expect(onRollback).toHaveBeenCalledWith("대기", "오처리 복구");
  });
});
