import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOrders } from "@/features/orders/api/orders-api";

const { fromMock, queryMock } = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    ilike: vi.fn(),
    then: vi.fn(),
  };
  return {
    fromMock: vi.fn(() => query),
    queryMock: query,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
  },
}));

function resetQueryMock() {
  Object.values(queryMock).forEach((mock) => mock.mockReset());
  queryMock.select.mockReturnValue(queryMock);
  queryMock.eq.mockReturnValue(queryMock);
  queryMock.gte.mockReturnValue(queryMock);
  queryMock.lte.mockReturnValue(queryMock);
  queryMock.order.mockReturnValue(queryMock);
  queryMock.range.mockReturnValue(queryMock);
  queryMock.ilike.mockReturnValue(queryMock);
  queryMock.then.mockImplementation((resolve) =>
    Promise.resolve(resolve({ data: [], error: null, count: 0 })),
  );
}

describe("admin_order_list_view query contract", () => {
  beforeEach(() => {
    fromMock.mockClear();
    resetQueryMock();
  });

  it("주문 목록은 admin_order_list_view의 camelCase createdAt/orderType 계약으로 정렬/필터링한다", async () => {
    await getAdminOrders({
      orderType: "custom",
      page: 1,
      pageSize: 20,
      dateFrom: "2026-04-01",
      dateTo: "2026-04-30",
      orderNumber: "ORD-1",
      status: "접수",
    });

    expect(fromMock).toHaveBeenCalledWith("admin_order_list_view");
    expect(queryMock.select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(queryMock.eq).toHaveBeenCalledWith("orderType", "custom");
    expect(queryMock.gte).toHaveBeenCalledWith(
      "createdAt",
      new Date("2026-04-01T00:00:00").toISOString(),
    );
    expect(queryMock.lte).toHaveBeenCalledWith(
      "createdAt",
      new Date("2026-04-30T23:59:59.999").toISOString(),
    );
    expect(queryMock.order).toHaveBeenCalledWith("createdAt", {
      ascending: false,
    });
    expect(queryMock.range).toHaveBeenCalledWith(0, 19);
    expect(queryMock.ilike).toHaveBeenCalledWith("orderNumber", "%ORD-1%");
    expect(queryMock.eq).toHaveBeenCalledWith("status", "접수");
  });
});
