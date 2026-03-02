import { useTable } from "@refinedev/antd";
import { useShow, useList } from "@refinedev/core";
import type { TableProps } from "antd";
import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import {
  toAdminCustomerListItem,
  toAdminCustomerDetail,
  toAdminCustomerOrderRow,
  toAdminCustomerCouponRow,
} from "./customers-mapper";
import type { ProfileRow, UserCouponRow } from "./customers-mapper";
import type {
  AdminCustomerListItem,
  AdminCustomerDetail,
  AdminCustomerOrderRow,
  AdminCustomerCouponRow,
} from "../types/admin-customer";

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
  const { query, result: rawProfile } = useShow<ProfileRow>({
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
    pagination: { pageSize: 10 },
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
    queryOptions: { enabled: !!customerId },
  });

  const coupons: AdminCustomerCouponRow[] = (result.data ?? []).map(
    toAdminCustomerCouponRow
  );

  return { coupons };
}
