import { useTable } from "@refinedev/antd";
import { useShow, useList } from "@refinedev/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import type { TableProps } from "antd";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import {
  toAdminCustomerListItem,
  toAdminCustomerDetail,
  toAdminCustomerOrderRow,
  toAdminCustomerCouponRow,
  toAdminCustomerTokenRow,
} from "./customers-mapper";
import type { DesignTokenRow, ProfileRow, UserCouponRow } from "./customers-mapper";
import {
  getCustomerTokenBalances,
  getCustomerTokenHistory,
  manageCustomerTokens,
} from "./customers-api";
import type {
  AdminCustomerListItem,
  AdminCustomerDetail,
  AdminCustomerOrderRow,
  AdminCustomerCouponRow,
  AdminCustomerTokenBalanceRow,
  AdminCustomerTokenRow,
} from "../types/admin-customer";
import type { ManageCustomerTokensParams } from "./customers-api";

const CUSTOMER_TOKEN_BALANCES_KEY = ["customers", "token-balances"] as const;
const CUSTOMER_TOKEN_HISTORY_KEY = ["customers", "token-history"] as const;

// ── List ───────────────────────────────────────────────────────

export function useAdminCustomerTable() {
  const { tableProps: rawTableProps, setFilters } = useTable<ProfileRow>({
    resource: "profiles",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  const tableProps = {
    ...rawTableProps,
    dataSource: (rawTableProps.dataSource ?? []).map(toAdminCustomerListItem),
  } as TableProps<AdminCustomerListItem>;

  return { tableProps, setFilters };
}

// ── Detail ─────────────────────────────────────────────────────

export function useAdminCustomerDetail(customerId: string | undefined) {
  const { result: rawProfile } = useShow<ProfileRow>({
    resource: "profiles",
    id: customerId,
    queryOptions: { enabled: !!customerId },
  });

  const customer: AdminCustomerDetail | undefined = rawProfile
    ? toAdminCustomerDetail(rawProfile)
    : undefined;

  return { customer };
}

// ── Orders ─────────────────────────────────────────────────────

export function useAdminCustomerOrders(customerId: string | undefined) {
  const { result } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    filters: [{ field: "userId", operator: "eq", value: customerId }],
    sorters: [{ field: "created_at", order: "desc" }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!customerId },
  });

  const orders: AdminCustomerOrderRow[] = (result.data ?? []).map(
    toAdminCustomerOrderRow
  );

  return { orders };
}

// ── Coupons ────────────────────────────────────────────────────

export function useAdminCustomerCoupons(customerId: string | undefined) {
  const { result } = useList<UserCouponRow>({
    resource: "user_coupons",
    filters: [{ field: "user_id", operator: "eq", value: customerId }],
    pagination: { mode: "off" },
    queryOptions: { enabled: !!customerId },
  });

  const coupons: AdminCustomerCouponRow[] = (result.data ?? []).map(
    toAdminCustomerCouponRow
  );

  return { coupons };
}

export function useCustomerTokenBalancesQuery(userIds: string[]) {
  return useQuery({
    queryKey: [...CUSTOMER_TOKEN_BALANCES_KEY, userIds],
    queryFn: (): Promise<AdminCustomerTokenBalanceRow[]> =>
      getCustomerTokenBalances(userIds),
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
    enabled: !!userId,
  });
}

export function useManageCustomerTokensMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: ManageCustomerTokensParams) => manageCustomerTokens(params),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [...CUSTOMER_TOKEN_HISTORY_KEY, variables.userId],
        }),
        queryClient.invalidateQueries({
          queryKey: CUSTOMER_TOKEN_BALANCES_KEY,
        }),
      ]);
      message.success("토큰이 처리되었습니다.");
    },
    onError: (error: Error) => {
      message.error(`토큰 처리에 실패했습니다: ${error.message}`);
    },
  });
}
