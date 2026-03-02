import { useState, useEffect } from "react";
import { useTable } from "@refinedev/antd";
import {
  useShow,
  useList,
  useOne,
  useUpdate,
  useInvalidate,
} from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import type {
  AdminOrderListRowDTO,
  AdminOrderDetailRowDTO,
  AdminOrderItemRowDTO,
  AdminSettingRowDTO,
  OrderStatusLogDTO,
  OrderType,
} from "@yeongseon/shared";
import {
  toAdminOrderListItem,
  toAdminOrderDetail,
  toAdminOrderItem,
  toAdminStatusLogEntry,
} from "./orders-mapper";
import { updateOrderStatus } from "./orders-api";
import type {
  AdminOrderListItem,
  AdminOrderDetail,
  AdminOrderItem,
  AdminStatusLogEntry,
} from "../types/admin-order";

// ── List ───────────────────────────────────────────────────────
// useTable returns { tableProps, setFilters } — tableProps.dataSource is TData[]
// We cast tableProps to TableProps<AdminOrderListItem> at this boundary:
// all Refine internal callbacks (onChange, sorter, etc.) operate on column keys,
// not on the data shape, so the cast is structurally safe at runtime.

export function useAdminOrderTable(orderType: OrderType) {
  const { tableProps: rawTableProps, setFilters } = useTable<AdminOrderListRowDTO>({
    resource: "admin_order_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    filters: {
      permanent: [
        { field: "orderType", operator: "eq", value: orderType },
      ],
    },
    syncWithLocation: false,
  });

  const tableProps = {
    ...rawTableProps,
    dataSource: (
      (rawTableProps.dataSource ?? []) as AdminOrderListRowDTO[]
    ).map(toAdminOrderListItem),
  } as TableProps<AdminOrderListItem>;

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
  });

  const order: AdminOrderDetail | undefined = rawOrder
    ? toAdminOrderDetail(rawOrder)
    : undefined;

  return { order, refetch: query.refetch };
}

// ── Items ────────────────────────────────────────────────────
// useList returns { result: { data: TData[], total } }

export function useAdminOrderItems(
  orderId: string | undefined,
  orderType: OrderType
) {
  const { result } = useList<AdminOrderItemRowDTO>({
    resource: "admin_order_item_view",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    queryOptions: { enabled: !!orderId },
  });

  const items: AdminOrderItem[] = result.data.map((dto) =>
    toAdminOrderItem(dto, orderType)
  );

  return { items };
}

// ── Status logs ───────────────────────────────────────────────

export function useAdminOrderStatusLogs(orderId: string | undefined) {
  const { result } = useList<OrderStatusLogDTO>({
    resource: "admin_order_status_log_view",
    filters: [{ field: "orderId", operator: "eq", value: orderId }],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!orderId },
  });

  const logs: AdminStatusLogEntry[] = result.data.map(toAdminStatusLogEntry);

  return { logs };
}

// ── Default courier ───────────────────────────────────────────
// useOne returns { result: TData | undefined }

export function useDefaultCourier(): string | undefined {
  const { result } = useOne<AdminSettingRowDTO>({
    resource: "admin_settings",
    id: "default_courier_company",
    meta: { idColumnName: "key" },
    queryOptions: { enabled: true },
  });

  return result?.value ?? undefined;
}

// ── Status update ─────────────────────────────────────────────

export function useOrderStatusUpdate(
  orderId: string | undefined,
  refetch: () => void
) {
  const invalidate = useInvalidate();
  const [isUpdating, setIsUpdating] = useState(false);

  const invalidateLogs = () =>
    invalidate({
      resource: "admin_order_status_log_view",
      invalidates: ["list"],
    });

  const changeStatus = async (newStatus: string, memo: string) => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus({ orderId, newStatus, memo: memo || null });
      message.success(`상태가 "${newStatus}"(으)로 변경되었습니다.`);
      refetch();
      invalidateLogs();
    } catch (err) {
      message.error(
        `상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const rollback = async (targetStatus: string, memo: string) => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus({
        orderId,
        newStatus: targetStatus,
        memo,
        isRollback: true,
      });
      message.success(`"${targetStatus}"(으)로 롤백되었습니다.`);
      refetch();
      invalidateLogs();
    } catch (err) {
      message.error(
        `롤백 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return { isUpdating, changeStatus, rollback };
}

// ── Tracking save ─────────────────────────────────────────────

export function useTrackingSave() {
  const { mutate: updateOrder, mutation } = useUpdate();

  const saveTracking = (
    orderId: string,
    courierCompany: string,
    trackingNumber: string
  ) => {
    updateOrder(
      {
        resource: "orders",
        id: orderId,
        values: {
          courier_company: courierCompany || null,
          tracking_number: trackingNumber || null,
        },
      },
      {
        onSuccess: () => {
          message.success("배송 정보가 저장되었습니다.");
        },
      }
    );
  };

  return { saveTracking, isPending: mutation.isPending };
}

// ── Tracking local state ──────────────────────────────────────

export function useTrackingState(
  order: AdminOrderDetail | undefined,
  defaultCourier: string | undefined
) {
  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");

  useEffect(() => {
    if (order) {
      if (courierCompany === "") {
        setCourierCompany(
          order.trackingInfo?.courierCompany ?? defaultCourier ?? ""
        );
      }
      if (trackingNumber === "") {
        setTrackingNumber(order.trackingInfo?.trackingNumber ?? "");
      }
    }
  }, [order, defaultCourier, courierCompany, trackingNumber]);

  return {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
  };
}
