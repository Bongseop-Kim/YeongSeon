import {
  DESIGN_TOKEN_SELECT_FIELDS,
  type AdminOrderListRowDTO,
  type DesignTokenRow,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import {
  toAdminCustomerCouponRow,
  toAdminCustomerDetail,
  toAdminCustomerListItem,
  toAdminCustomerOrderRow,
  type ProfileRow,
  type UserCouponRow,
} from "@/features/customers/api/customers-mapper";
import type {
  AdminCustomerCouponRow,
  AdminCustomerDetail,
  AdminCustomerListItem,
  AdminCustomerOrderRow,
  AdminCustomerTokenBalanceRow,
} from "@/features/customers/types/admin-customer";

interface AdminCustomerListResult {
  rows: AdminCustomerListItem[];
  total: number;
}

export interface ManageCustomerTokensParams {
  userId: string;
  amount: number;
  description: string;
}

interface TokenBalanceRpcRow {
  user_id: string | null;
  balance: number | null;
}

export async function getAdminCustomers(params: {
  page: number;
  pageSize: number;
  name?: string | null;
}): Promise<AdminCustomerListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("admin_customer_profile_view")
    .select("id,name,phone,email,role,is_active,created_at,birth", {
      count: "exact",
    })
    .eq("role", "customer");

  const name = params.name?.trim();
  if (name) query = query.ilike("name", `%${name}%`);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as ProfileRow[]).map(toAdminCustomerListItem),
    total: count ?? 0,
  };
}

export async function getAdminCustomerDetail(
  customerId: string,
): Promise<AdminCustomerDetail> {
  const { data, error } = await supabase
    .from("admin_customer_profile_view")
    .select("id,name,phone,email,role,is_active,created_at,birth")
    .eq("id", customerId)
    .eq("role", "customer")
    .single();

  if (error) throw new Error(error.message);
  return toAdminCustomerDetail(data as ProfileRow);
}

export async function getAdminCustomerOrders(
  customerId: string,
): Promise<AdminCustomerOrderRow[]> {
  const { data, error } = await supabase
    .from("admin_order_list_view")
    .select("*")
    .eq("userId", customerId)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminOrderListRowDTO[]).map(toAdminCustomerOrderRow);
}

export async function getAdminCustomerCoupons(
  customerId: string,
): Promise<AdminCustomerCouponRow[]> {
  const { data, error } = await supabase
    .from("user_coupons")
    .select("id,coupon_id,status,issued_at,expires_at")
    .eq("user_id", customerId);

  if (error) throw new Error(error.message);
  return ((data ?? []) as UserCouponRow[]).map(toAdminCustomerCouponRow);
}

export async function getCustomerTokenBalances(
  userIds: string[],
): Promise<AdminCustomerTokenBalanceRow[]> {
  const { data, error } = await supabase.rpc(
    "get_design_token_balances_admin",
    {
      p_user_ids: userIds,
    },
  );
  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row: TokenBalanceRpcRow) =>
    row.user_id ? [{ userId: row.user_id, balance: row.balance ?? 0 }] : [],
  );
}

export async function getCustomerTokenHistory(
  userId: string,
): Promise<DesignTokenRow[]> {
  const { data, error } = await supabase
    .from("design_tokens")
    .select(DESIGN_TOKEN_SELECT_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function manageCustomerTokens({
  userId,
  amount,
  description,
}: ManageCustomerTokensParams): Promise<void> {
  const { error } = await supabase.rpc("manage_design_tokens_admin", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
  });

  if (error) throw new Error(error.message);
}
