import { beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import { useAdminOrderTable } from "@/features/orders/api/orders-query";

const {
  useTableMock,
  useListMock,
  useShowMock,
  useInvalidateMock,
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  toAdminOrderListItemMock,
  toAdminOrderDetailMock,
  toAdminOrderItemMock,
} = vi.hoisted(() => ({
  useTableMock: vi.fn(),
  useListMock: vi.fn(),
  useShowMock: vi.fn(),
  useInvalidateMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  toAdminOrderListItemMock: vi.fn((value) => value),
  toAdminOrderDetailMock: vi.fn((value) => value),
  toAdminOrderItemMock: vi.fn((value) => value),
}));

vi.mock("@refinedev/antd", () => ({
  useTable: useTableMock,
}));

vi.mock("@refinedev/core", () => ({
  useList: useListMock,
  useShow: useShowMock,
  useInvalidate: useInvalidateMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock("@/features/orders/api/orders-mapper", () => ({
  toAdminOrderListItem: toAdminOrderListItemMock,
  toAdminOrderDetail: toAdminOrderDetailMock,
  toAdminOrderItem: toAdminOrderItemMock,
}));

vi.mock("@/features/orders/api/order-history-mapper", () => ({
  toAdminOrderHistoryEntries: vi.fn(() => []),
}));

vi.mock("@/features/orders/api/orders-api", () => ({
  updateOrderStatus: vi.fn(),
  updateOrderTracking: vi.fn(),
}));

function createListResult(data: unknown[] = []) {
  return {
    result: {
      data,
      total: data.length,
    },
    query: {
      isLoading: false,
    },
  };
}

describe("admin_order_list_view query contract", () => {
  beforeEach(() => {
    useTableMock.mockReset();
    useListMock.mockReset();
    useShowMock.mockReset();
    useInvalidateMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    useTableMock.mockReturnValue({
      tableProps: {
        loading: false,
        pagination: false,
        onChange: vi.fn(),
        dataSource: [],
      },
      setFilters: vi.fn(),
    });
    useListMock.mockReturnValue(createListResult());
    useShowMock.mockReturnValue({
      result: undefined,
      query: {
        refetch: vi.fn(),
        isLoading: false,
        isError: false,
      },
    });
    useInvalidateMock.mockReturnValue(vi.fn());
    useQueryMock.mockReturnValue({ data: undefined });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useQueryClientMock.mockReturnValue({
      invalidateQueries: vi.fn(),
    });
  });

  it("주문 목록 테이블은 admin_order_list_view의 camelCase createdAt 계약으로 정렬/필터링한다", () => {
    useAdminOrderTable("custom", ["2026-04-01", "2026-04-30"]);

    expect(useTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "admin_order_list_view",
        sorters: { initial: [{ field: "createdAt", order: "desc" }] },
        filters: expect.objectContaining({
          initial: [
            {
              field: "createdAt",
              operator: "gte",
              value: dayjs("2026-04-01").startOf("day").toISOString(),
            },
            {
              field: "createdAt",
              operator: "lte",
              value: dayjs("2026-04-30").endOf("day").toISOString(),
            },
          ],
        }),
      }),
    );
  });
});
