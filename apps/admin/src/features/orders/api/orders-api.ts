import { supabase } from "@/lib/supabase";

export interface UpdateOrderStatusParams {
  orderId: string;
  newStatus: string;
  memo: string | null;
  isRollback?: boolean;
}

export async function updateOrderStatus(
  params: UpdateOrderStatusParams
): Promise<void> {
  const { orderId, newStatus, memo, isRollback } = params;
  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_memo: memo,
    p_is_rollback: isRollback ?? false,
  });

  if (error) {
    throw new Error(error.message);
  }
}
