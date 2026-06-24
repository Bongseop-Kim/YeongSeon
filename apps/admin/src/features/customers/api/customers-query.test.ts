import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminCustomerOrders,
  getAdminCustomers,
} from "@/features/customers/api/customers-api";

const { fromMock, selectMock, eqMock, ilikeMock, orderMock, rangeMock } =
  vi.hoisted(() => ({
    fromMock: vi.fn(),
    selectMock: vi.fn(),
    eqMock: vi.fn(),
    ilikeMock: vi.fn(),
    orderMock: vi.fn(),
    rangeMock: vi.fn(),
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
    ilikeMock.mockReset();
    orderMock.mockReset();
    rangeMock.mockReset();
  });

  it("고객 상세의 주문 목록은 createdAt으로 정렬한다", async () => {
    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
    orderMock.mockResolvedValue({ data: [], error: null });

    await getAdminCustomerOrders("user-1");

    expect(fromMock).toHaveBeenCalledWith("admin_order_list_view");
    expect(eqMock).toHaveBeenCalledWith("userId", "user-1");
    expect(orderMock).toHaveBeenCalledWith("createdAt", { ascending: false });
  });

  it("고객 목록은 customer role만 조회한다", async () => {
    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ ilike: ilikeMock, order: orderMock });
    orderMock.mockReturnValue({ range: rangeMock });
    rangeMock.mockResolvedValue({ data: [], error: null, count: 0 });

    await getAdminCustomers({ page: 1, pageSize: 20 });

    expect(fromMock).toHaveBeenCalledWith("admin_customer_profile_view");
    expect(selectMock).toHaveBeenCalledWith(
      "id,name,phone,email,role,is_active,created_at,birth",
      { count: "exact" },
    );
    expect(eqMock).toHaveBeenCalledWith("role", "customer");
    expect(ilikeMock).not.toHaveBeenCalled();
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rangeMock).toHaveBeenCalledWith(0, 19);
  });

  it("고객 목록 이름 검색은 ilike 이후 정렬과 페이지 범위를 적용한다", async () => {
    fromMock.mockReturnValue({ select: selectMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ ilike: ilikeMock, order: orderMock });
    ilikeMock.mockReturnValue({ order: orderMock });
    orderMock.mockReturnValue({ range: rangeMock });
    rangeMock.mockResolvedValue({ data: [], error: null, count: 0 });

    await getAdminCustomers({ page: 2, pageSize: 10, name: " 홍길동 " });

    expect(eqMock).toHaveBeenCalledWith("role", "customer");
    expect(ilikeMock).toHaveBeenCalledWith("name", "%홍길동%");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(rangeMock).toHaveBeenCalledWith(10, 19);
  });
});
