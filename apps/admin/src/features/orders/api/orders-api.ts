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
  courierCompany?: string;
  trackingNumber?: string;
  companyCourierCompany?: string;
  companyTrackingNumber?: string;
}

export async function updateOrderTracking(
  params: UpdateOrderTrackingParams,
): Promise<void> {
  const {
    orderId,
    courierCompany,
    trackingNumber,
    companyCourierCompany,
    companyTrackingNumber,
  } = params;
  const payload: Record<string, string> = {
    p_order_id: orderId,
  };

  if (courierCompany !== undefined) {
    payload.p_courier_company = courierCompany;
  }
  if (trackingNumber !== undefined) {
    payload.p_tracking_number = trackingNumber;
  }
  if (companyCourierCompany !== undefined) {
    payload.p_company_courier_company = companyCourierCompany;
  }
  if (companyTrackingNumber !== undefined) {
    payload.p_company_tracking_number = companyTrackingNumber;
  }

  const { error } = await supabase.rpc("admin_update_order_tracking", payload);

  if (error) {
    throw new Error(error.message);
  }
}
