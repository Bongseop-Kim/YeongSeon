import { useState, useEffect, useRef } from "react";
import { eulo } from "@yeongseon/shared";
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
    queryOptions: { enabled: !!orderId },
  });

  const order: AdminOrderDetail | undefined = rawOrder
    ? toAdminOrderDetail(rawOrder)
    : undefined;

  return { order, refetch: query.refetch, isLoading: query.isLoading, isError: query.isError };
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

  const updateStatus = async (newStatus: string, memo: string, isRollback: boolean) => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      await updateOrderStatus({ orderId, newStatus, memo: memo || null, isRollback });
      message.success(
        isRollback
          ? `"${newStatus}"${eulo(newStatus)} 롤백되었습니다.`
          : `상태가 "${newStatus}"${eulo(newStatus)} 변경되었습니다.`
      );
      refetch();
      invalidateLogs();
    } catch (err) {
      message.error(
        `${isRollback ? "롤백" : "상태 변경"} 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
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

// TODO: 직접 테이블 쓰기 가드레일 위반 — `orders` 테이블에 직접 UPDATE하고 있음.
// 가드레일에 따르면 직접 테이블 쓰기는 `cart_items` DELETE만 허용된다.
// 배송 정보 저장은 `admin_update_order_tracking` RPC로 이관해야 한다.
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
  const prevOrderIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!order) return;
    if (order.id === prevOrderIdRef.current) return;
    prevOrderIdRef.current = order.id;
    setCourierCompany(order.trackingInfo?.courierCompany ?? defaultCourier ?? "");
    setTrackingNumber(order.trackingInfo?.trackingNumber ?? "");
  }, [order, defaultCourier]);

  return {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
  };
}
