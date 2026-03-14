import { supabase } from "@/lib/supabase";

export interface UpdateClaimStatusParams {
  claimId: string;
  newStatus: string;
  memo: string | null;
  isRollback?: boolean;
}

export async function updateClaimStatus(
  params: UpdateClaimStatusParams,
): Promise<void> {
  const { claimId, newStatus, memo, isRollback } = params;
  const { error } = await supabase.rpc("admin_update_claim_status", {
    p_claim_id: claimId,
    p_new_status: newStatus,
    p_memo: memo,
    p_is_rollback: isRollback ?? false,
  });

  if (error) {
    throw new Error(error.message);
  }
}
