import { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { eulo } from "@yeongseon/shared";
import { useTable } from "@refinedev/antd";
import { useShow, useList, useInvalidate } from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import type {
  AdminOrderListRowDTO,
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  ClaimStatusLogDTO,
  OrderStatusLogDTO,
  OrderType,
} from "@yeongseon/shared";
import {
  toAdminOrderListItem,
  toAdminOrderDetail,
  toAdminOrderItem,
} from "./orders-mapper";
import { toAdminOrderHistoryEntries } from "./order-history-mapper";
import { updateOrderStatus, updateOrderTracking } from "./orders-api";
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  AdminOrderItem,
  AdminOrderHistoryEntry,
} from "@/features/orders/types/admin-order";

// ── List ───────────────────────────────────────────────────────
// useTable returns { tableProps, setFilters } — tableProps.dataSource is TData[]
// We cast tableProps to TableProps<AdminOrderListItem> at this boundary:
// all Refine internal callbacks (onChange, sorter, etc.) operate on column keys,
// not on the data shape, so the cast is structurally safe at runtime.

export function useAdminOrderTable(
  orderType: OrderType,
  initialDateRange: [string, string],
) {
  const { tableProps: rawTableProps, setFilters } =
    useTable<AdminOrderListRowDTO>({
      resource: "admin_order_list_view",
      sorters: { initial: [{ field: "createdAt", order: "desc" }] },
      filters: {
        permanent: [{ field: "orderType", operator: "eq", value: orderType }],
        initial: [
          {
            field: "createdAt",
            operator: "gte",
            value: dayjs(initialDateRange[0]).startOf("day").toISOString(),
          },
          {
            field: "createdAt",
            operator: "lte",
            value: dayjs(initialDateRange[1]).endOf("day").toISOString(),
          },
        ],
      },
      syncWithLocation: false,
    });

  const tableProps: TableProps<AdminOrderListItem> = {
    loading: rawTableProps.loading,
    pagination: rawTableProps.pagination,
    onChange:
      rawTableProps.onChange as TableProps<AdminOrderListItem>["onChange"],
    dataSource: (rawTableProps.dataSource ?? []).map(toAdminOrderListItem),
  };

  return {
    tableProps,
    setFilters,
  };
}

// ── Detail ────────────────────────────────────────────────────
// useShow returns { query, result } where result: TData | undefined

export function useAdminOrderDetail(orderId: string | undefined) {
  const { query, result: rawOrder } = useShow<AdminOrderDetailRowDTO>({
    resource: "admin_order_detail_view",
    id: orderId,
    queryOptions: { enabled: !!orderId },
  });

  const order: AdminOrderDetail | undefined = rawOrder
    ? toAdminOrderDetail(rawOrder)
    : undefined;

  return {
    order,
    refetch: query.refetch,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

// ── Items ────────────────────────────────────────────────────
// useList returns { result: { data: TData[], total } }

export function useAdminOrderItems(
  orderId: string | undefined,
  orderType: OrderType,
) {
  const { result } = useList<AdminOrderItemRowDTO>({
    resource: "admin_order_item_view",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    queryOptions: { enabled: !!orderId },
  });

  const items: AdminOrderItem[] = result.data.map((dto) =>
    toAdminOrderItem(dto, orderType),
  );

  return { items };
}

// ── Related orders ────────────────────────────────────────────

export function useRelatedOrders(
  paymentGroupId: string | null | undefined,
  currentOrderId: string,
) {
  const { query, result } = useList<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    filters: [
      { field: "paymentGroupId", operator: "eq", value: paymentGroupId },
    ],
    queryOptions: { enabled: !!paymentGroupId },
  });

  const relatedOrders = result.data
    .filter((dto) => dto.id !== currentOrderId)
    .map(toAdminOrderListItem);

  return { relatedOrders, isLoading: query.isLoading };
}

// ── Status logs ───────────────────────────────────────────────

export function useAdminOrderHistory(orderId: string | undefined) {
  const { result: orderResult } = useList<OrderStatusLogDTO>({
    resource: "admin_order_status_log_view",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!orderId },
  });

  const { result: claimResult } = useList<ClaimStatusLogDTO>({
    resource: "admin_claim_status_log_view",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!orderId },
  });

  const logs: AdminOrderHistoryEntry[] = toAdminOrderHistoryEntries({
    orderLogs: orderResult.data,
    claimLogs: claimResult.data,
  });

  return { logs };
}

// ── Status update ─────────────────────────────────────────────

export function useOrderStatusUpdate(
  orderId: string | undefined,
  refetch: () => void,
) {
  const invalidate = useInvalidate();
  const [isUpdating, setIsUpdating] = useState(false);

  const invalidateLogs = () =>
    invalidate({
      resource: "admin_order_status_log_view",
      invalidates: ["list"],
    });

  const updateStatus = async (
    newStatus: string,
    memo: string,
    isRollback: boolean,
  ): Promise<boolean> => {
    if (!orderId) return false;
    setIsUpdating(true);
    try {
      await updateOrderStatus({
        orderId,
        newStatus,
        memo: memo || null,
        isRollback,
      });
      message.success(
        isRollback
          ? `"${newStatus}"${eulo(newStatus)} 롤백되었습니다.`
          : `상태가 "${newStatus}"${eulo(newStatus)} 변경되었습니다.`,
      );
      refetch();
      invalidateLogs();
      return true;
    } catch (err) {
      message.error(
        `${isRollback ? "롤백" : "상태 변경"} 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
      );
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const changeStatus = (newStatus: string, memo: string) =>
    updateStatus(newStatus, memo, false);

  const rollback = (targetStatus: string, memo: string) =>
    updateStatus(targetStatus, memo, true);

  return { isUpdating, changeStatus, rollback };
}

// ── Tracking save ─────────────────────────────────────────────
export function useTrackingSave(onSuccess?: () => void | Promise<unknown>) {
  const [isPending, setIsPending] = useState(false);

  const saveTracking = async (
    orderId: string,
    courierCompany?: string,
    trackingNumber?: string,
    companyCourierCompany?: string,
    companyTrackingNumber?: string,
  ): Promise<boolean> => {
    setIsPending(true);
    try {
      await updateOrderTracking({
        orderId,
        courierCompany,
        trackingNumber,
        companyCourierCompany,
        companyTrackingNumber,
      });
      message.success("배송 정보가 저장되었습니다.");
      await onSuccess?.();
      return true;
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : "배송 정보 저장에 실패했습니다.",
      );
      return false;
    } finally {
      setIsPending(false);
    }
  };

  return { saveTracking, isPending };
}

// ── Tracking local state ──────────────────────────────────────

export function useTrackingState(
  order: AdminOrderDetail | undefined,
  defaultCourier: string | undefined,
) {
  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const [companyCourierCompany, setCompanyCourierCompany] =
    useState<string>("");
  const [companyTrackingNumber, setCompanyTrackingNumber] =
    useState<string>("");
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!order) return;
    if (order.id === prevOrderIdRef.current) return;
    prevOrderIdRef.current = order.id;
    setCourierCompany(
      order.trackingInfo?.courierCompany ?? defaultCourier ?? "",
    );
    setTrackingNumber(order.trackingInfo?.trackingNumber ?? "");
    setCompanyCourierCompany(order.trackingInfo?.companyCourierCompany ?? "");
    setCompanyTrackingNumber(order.trackingInfo?.companyTrackingNumber ?? "");
  }, [order, defaultCourier]);

  return {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
    companyCourierCompany,
    setCompanyCourierCompany,
    companyTrackingNumber,
    setCompanyTrackingNumber,
  };
}
