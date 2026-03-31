import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateOrderTracking } from "@/features/orders/api/orders-api";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("updateOrderTracking", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ error: null });
  });

  it("고객 배송 정보만 넘기면 회사 배송 필드는 생략한다", async () => {
    await updateOrderTracking({
      orderId: "order-1",
      courierCompany: "cj",
      trackingNumber: "1234",
    });

    expect(rpcMock).toHaveBeenCalledWith("admin_update_order_tracking", {
      p_order_id: "order-1",
      p_courier_company: "cj",
      p_tracking_number: "1234",
    });
  });

  it("회사 배송 정보만 넘기면 고객 배송 필드는 생략한다", async () => {
    await updateOrderTracking({
      orderId: "order-1",
      companyCourierCompany: "hanjin",
      companyTrackingNumber: "5678",
    });

    expect(rpcMock).toHaveBeenCalledWith("admin_update_order_tracking", {
      p_order_id: "order-1",
      p_company_courier_company: "hanjin",
      p_company_tracking_number: "5678",
    });
  });
});
