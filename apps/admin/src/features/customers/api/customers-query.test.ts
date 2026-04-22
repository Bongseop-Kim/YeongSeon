import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminCustomerOrders } from "@/features/customers/api/customers-query";

const {
  useTableMock,
  useListMock,
  useShowMock,
  useQueryMock,
  useMutationMock,
  useQueryClientMock,
  toAdminCustomerOrderRowMock,
} = vi.hoisted(() => ({
  useTableMock: vi.fn(),
  useListMock: vi.fn(),
  useShowMock: vi.fn(),
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  useQueryClientMock: vi.fn(),
  toAdminCustomerOrderRowMock: vi.fn((value) => value),
}));

vi.mock("@refinedev/antd", () => ({
  useTable: useTableMock,
}));

vi.mock("@refinedev/core", () => ({
  useList: useListMock,
  useShow: useShowMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock("antd", () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/features/customers/api/customers-mapper", () => ({
  toAdminCustomerListItem: vi.fn((value) => value),
  toAdminCustomerDetail: vi.fn((value) => value),
  toAdminCustomerOrderRow: toAdminCustomerOrderRowMock,
  toAdminCustomerCouponRow: vi.fn((value) => value),
  toAdminCustomerTokenRow: vi.fn((value) => value),
}));

vi.mock("@/features/customers/api/customers-api", () => ({
  getCustomerTokenBalances: vi.fn(),
  getCustomerTokenHistory: vi.fn(),
  manageCustomerTokens: vi.fn(),
}));

describe("customers query contract", () => {
  beforeEach(() => {
    useTableMock.mockReset();
    useListMock.mockReset();
    useShowMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    useListMock.mockReturnValue({
      result: {
        data: [],
        total: 0,
      },
      query: {
        isLoading: false,
      },
    });
    useShowMock.mockReturnValue({
      result: undefined,
      query: {
        refetch: vi.fn(),
        isLoading: false,
        isError: false,
      },
    });
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

  it("고객 상세의 주문 목록은 createdAt으로 정렬한다", () => {
    useAdminCustomerOrders("user-1");

    expect(useListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "admin_order_list_view",
        sorters: [{ field: "createdAt", order: "desc" }],
      }),
    );
  });
});
