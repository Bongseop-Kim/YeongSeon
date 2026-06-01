import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminCustomerCoupons,
  getAdminCustomerDetail,
  getAdminCustomerOrders,
  getAdminCustomers,
  getCustomerTokenBalances,
  getCustomerTokenHistory,
  manageCustomerTokens,
  type ManageCustomerTokensParams,
} from "@/features/customers/api/customers-api";
import {
  toAdminCustomerTokenRow,
  type DesignTokenRow,
} from "@/features/customers/api/customers-mapper";
import type { AdminCustomerTokenRow } from "@/features/customers/types/admin-customer";

const CUSTOMER_TOKEN_BALANCES_KEY = ["customers", "token-balances"] as const;
const CUSTOMER_TOKEN_HISTORY_KEY = ["customers", "token-history"] as const;
export const CUSTOMER_PAGE_SIZE = 20;

export function useAdminCustomerTable(params: {
  page: number;
  name?: string | null;
}) {
  return useQuery({
    queryKey: ["customers", "list", params.page, params.name ?? null],
    queryFn: () =>
      getAdminCustomers({
        page: params.page,
        pageSize: CUSTOMER_PAGE_SIZE,
        name: params.name ?? null,
      }),
  });
}

export function useAdminCustomerDetail(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => getAdminCustomerDetail(customerId ?? ""),
    enabled: Boolean(customerId),
  });
}

export function useAdminCustomerOrders(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customers", "orders", customerId],
    queryFn: () => getAdminCustomerOrders(customerId ?? ""),
    enabled: Boolean(customerId),
  });
}

export function useAdminCustomerCoupons(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customers", "coupons", customerId],
    queryFn: () => getAdminCustomerCoupons(customerId ?? ""),
    enabled: Boolean(customerId),
  });
}

export function useCustomerTokenBalancesQuery(userIds: string[]) {
  return useQuery({
    queryKey: [...CUSTOMER_TOKEN_BALANCES_KEY, userIds],
    queryFn: () => getCustomerTokenBalances(userIds),
    enabled: userIds.length > 0,
  });
}

export function useCustomerTokenHistoryQuery(userId: string) {
  return useQuery({
    queryKey: [...CUSTOMER_TOKEN_HISTORY_KEY, userId],
    queryFn: async (): Promise<AdminCustomerTokenRow[]> => {
      const rows: DesignTokenRow[] = await getCustomerTokenHistory(userId);
      return rows.map(toAdminCustomerTokenRow);
    },
    enabled: Boolean(userId),
  });
}

export function useManageCustomerTokensMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ManageCustomerTokensParams) =>
      manageCustomerTokens(params),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...CUSTOMER_TOKEN_HISTORY_KEY, variables.userId],
        }),
        queryClient.invalidateQueries({
          queryKey: CUSTOMER_TOKEN_BALANCES_KEY,
        }),
      ]);
    },
  });
}
