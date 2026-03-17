import { supabase } from "@/lib/supabase";
import type { AdminCustomerTokenBalanceRow } from "@/features/customers/types/admin-customer";
import type { DesignTokenRow } from "@/features/customers/api/customers-mapper";

export interface ManageCustomerTokensParams {
  userId: string;
  amount: number;
  description: string;
}

interface TokenBalanceRpcRow {
  user_id: string | null;
  balance: number | null;
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

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).flatMap((row: TokenBalanceRpcRow) => {
    if (!row.user_id) {
      return [];
    }

    return [
      {
        userId: row.user_id,
        balance: row.balance ?? 0,
      },
    ];
  });
}

export async function getCustomerTokenHistory(
  userId: string,
): Promise<DesignTokenRow[]> {
  const { data, error } = await supabase
    .from("design_tokens")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

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

  if (error) {
    throw new Error(error.message);
  }
}
