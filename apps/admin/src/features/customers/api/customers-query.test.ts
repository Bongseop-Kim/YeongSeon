import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminCustomerOrders } from "@/features/customers/api/customers-api";

const { fromMock, selectMock, eqMock, orderMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  orderMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

describe("customers api contract", () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    eqMock.mockReset();
    orderMock.mockReset();

    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({ data: [], error: null });
  });

  it("고객 상세의 주문 목록은 createdAt으로 정렬한다", async () => {
    await getAdminCustomerOrders("user-1");

    expect(fromMock).toHaveBeenCalledWith("admin_order_list_view");
    expect(eqMock).toHaveBeenCalledWith("userId", "user-1");
    expect(orderMock).toHaveBeenCalledWith("createdAt", { ascending: false });
  });
});
