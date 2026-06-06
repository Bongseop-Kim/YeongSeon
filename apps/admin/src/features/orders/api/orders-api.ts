import type {
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  AdminOrderListRowDTO,
  ClaimStatusLogDTO,
  OrderStatusLogDTO,
  OrderType,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import { toAdminOrderHistoryEntries } from "@/features/orders/api/order-history-mapper";
import {
  toAdminOrderDetail,
  toAdminOrderItem,
  toAdminOrderListItem,
} from "@/features/orders/api/orders-mapper";
import {
  mapRepairPickupRequestRow,
  mapRepairShippingReceiptRow,
  type RepairPickupRequestRowDTO,
  type RepairShippingReceiptRowDTO,
} from "@/features/orders/api/orders-repair-shipping-mapper";
import type {
  AdminOrderDetail,
  AdminOrderHistoryEntry,
  AdminOrderItem,
  AdminOrderListItem,
  AdminRepairPickupRequest,
  AdminRepairShippingReceipt,
} from "@/features/orders/types/admin-order";

interface AdminOrderListResult {
  rows: AdminOrderListItem[];
  total: number;
}

export async function getAdminOrders(params: {
  orderType: OrderType;
  page: number;
  pageSize: number;
  dateFrom: string;
  dateTo: string;
  orderNumber?: string | null;
  status?: string | null;
}): Promise<AdminOrderListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("admin_order_list_view")
    .select("*", { count: "exact" })
    .eq("orderType", params.orderType)
    .gte("createdAt", new Date(`${params.dateFrom}T00:00:00`).toISOString())
    .lte("createdAt", new Date(`${params.dateTo}T23:59:59.999`).toISOString())
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (params.orderNumber) {
    query = query.ilike("orderNumber", `%${params.orderNumber}%`);
  }

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as AdminOrderListRowDTO[]).map(toAdminOrderListItem),
    total: count ?? 0,
  };
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail> {
  const { data, error } = await supabase
    .from("admin_order_detail_view")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw new Error(error.message);
  return toAdminOrderDetail(data as AdminOrderDetailRowDTO);
}

export async function getAdminOrderItems(params: {
  orderId: string;
  orderType: OrderType;
}): Promise<AdminOrderItem[]> {
  const { data, error } = await supabase
    .from("admin_order_item_view")
    .select("*")
    .eq("orderId", params.orderId);

  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminOrderItemRowDTO[]).map((dto) =>
    toAdminOrderItem(dto, params.orderType),
  );
}

export async function getRelatedOrders(params: {
  paymentGroupId: string;
  currentOrderId: string;
}): Promise<AdminOrderListItem[]> {
  const { data, error } = await supabase
    .from("admin_order_list_view")
    .select("*")
    .eq("paymentGroupId", params.paymentGroupId)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AdminOrderListRowDTO[])
    .filter((dto) => dto.id !== params.currentOrderId)
    .map(toAdminOrderListItem);
}

export async function getAdminOrderHistory(
  orderId: string,
): Promise<AdminOrderHistoryEntry[]> {
  const [orderLogsResult, claimLogsResult] = await Promise.all([
    supabase
      .from("admin_order_status_log_view")
      .select("*")
      .eq("orderId", orderId)
      .order("createdAt", { ascending: false }),
    supabase
      .from("admin_claim_status_log_view")
      .select("*")
      .eq("orderId", orderId)
      .order("createdAt", { ascending: false }),
  ]);

  if (orderLogsResult.error) throw new Error(orderLogsResult.error.message);
  if (claimLogsResult.error) throw new Error(claimLogsResult.error.message);

  return toAdminOrderHistoryEntries({
    orderLogs: (orderLogsResult.data ?? []) as OrderStatusLogDTO[],
    claimLogs: (claimLogsResult.data ?? []) as ClaimStatusLogDTO[],
  });
}

/** 방문 수거 신청 정보 (수선 주문 전용, 없으면 null) */
export async function getRepairPickupRequest(
  orderId: string,
): Promise<AdminRepairPickupRequest | null> {
  const { data, error } = await supabase
    .from("repair_pickup_requests")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapRepairPickupRequestRow(data as RepairPickupRequestRowDTO);
}

/** 고객 발송 접수 기록 (송장 사진 / 송장 없는 접수) — 최신순 */
export async function getRepairShippingReceipts(
  orderId: string,
): Promise<AdminRepairShippingReceipt[]> {
  const { data, error } = await supabase
    .from("repair_shipping_receipts")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as RepairShippingReceiptRowDTO[]).map(
    mapRepairShippingReceiptRow,
  );
}

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
