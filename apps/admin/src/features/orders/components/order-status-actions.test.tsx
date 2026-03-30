import { App } from "antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OrderStatusActions } from "@/features/orders/components/order-status-actions";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";

function createOrder(
  overrides: Partial<AdminOrderDetail> = {},
): AdminOrderDetail {
  return {
    id: "order-1",
    orderNumber: "ORD-1",
    date: "2026-03-31",
    orderType: "sale",
    status: "결제중",
    totalPrice: 10000,
    originalPrice: 10000,
    totalDiscount: 0,
    userId: "user-1",
    customerName: "홍길동",
    customerPhone: null,
    customerEmail: null,
    shippingAddress: null,
    trackingInfo: null,
    deliveredAt: null,
    confirmedAt: null,
    paymentGroupId: null,
    shippingCost: 0,
    adminActions: ["advance", "rollback", "cancel"],
    ...overrides,
  };
}

describe("OrderStatusActions", () => {
  it("롤백 모달에서 사유를 입력해야 롤백이 실행된다", async () => {
    const onRollback = vi.fn().mockResolvedValue(true);

    render(
      <App>
        <OrderStatusActions
          order={createOrder()}
          nextStatus="진행중"
          rollbackStatus="대기중"
          onStatusChange={vi.fn().mockResolvedValue(undefined)}
          onRollback={onRollback}
          isUpdating={false}
        />
      </App>,
    );

    expect(
      screen.queryByPlaceholderText("상태 변경 사유 (이력에 기록됨)"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "대기중으로 롤백" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "롤백" }));

    expect(onRollback).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("롤백 사유 (필수)"), {
      target: { value: "관리자 확인 후 롤백" },
    });
    fireEvent.click(screen.getByRole("button", { name: "롤백" }));

    expect(onRollback).toHaveBeenCalledWith("대기중", "관리자 확인 후 롤백");
  });

  it("상태 변경 실패 시 모달을 닫지 않는다", async () => {
    const onStatusChange = vi.fn().mockResolvedValue(false);

    render(
      <App>
        <OrderStatusActions
          order={createOrder()}
          nextStatus="진행중"
          rollbackStatus="대기중"
          onStatusChange={onStatusChange}
          onRollback={vi.fn().mockResolvedValue(true)}
          isUpdating={false}
        />
      </App>,
    );

    fireEvent.click(screen.getByRole("button", { name: "진행중으로 변경" }));
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith("진행중", "");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("롤백 실패 시 모달을 닫지 않는다", async () => {
    const onRollback = vi.fn().mockResolvedValue(false);

    render(
      <App>
        <OrderStatusActions
          order={createOrder()}
          nextStatus="진행중"
          rollbackStatus="대기중"
          onStatusChange={vi.fn().mockResolvedValue(true)}
          onRollback={onRollback}
          isUpdating={false}
        />
      </App>,
    );

    fireEvent.click(screen.getByRole("button", { name: "대기중으로 롤백" }));
    fireEvent.change(screen.getByPlaceholderText("롤백 사유 (필수)"), {
      target: { value: "관리자 확인 후 롤백" },
    });
    fireEvent.click(screen.getByRole("button", { name: "롤백" }));

    await waitFor(() => {
      expect(onRollback).toHaveBeenCalledWith("대기중", "관리자 확인 후 롤백");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("취소 실패 시 모달을 닫지 않는다", async () => {
    const onStatusChange = vi.fn().mockResolvedValue(false);

    render(
      <App>
        <OrderStatusActions
          order={createOrder()}
          nextStatus="진행중"
          rollbackStatus="대기중"
          onStatusChange={onStatusChange}
          onRollback={vi.fn().mockResolvedValue(true)}
          isUpdating={false}
        />
      </App>,
    );

    fireEvent.click(screen.getByRole("button", { name: "취소 처리" }));
    fireEvent.click(screen.getAllByRole("button", { name: "취소 처리" })[1]);

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith("취소", "");
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
