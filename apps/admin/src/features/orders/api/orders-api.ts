import { supabase } from "@/lib/supabase";

interface UpdateOrderStatusParams {
  orderId: string;
  newStatus: string;
  memo: string | null;
  isRollback?: boolean;
}

export async function updateOrderStatus(
  params: UpdateOrderStatusParams,
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

interface UpdateOrderTrackingParams {
  orderId: string;
  courierCompany: string;
  trackingNumber: string;
}

export async function updateOrderTracking(
  params: UpdateOrderTrackingParams,
): Promise<void> {
  const { orderId, courierCompany, trackingNumber } = params;
  const { error } = await supabase.rpc("admin_update_order_tracking", {
    p_order_id: orderId,
    p_courier_company: courierCompany || null,
    p_tracking_number: trackingNumber || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
