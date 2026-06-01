import { useEffect, useRef, useState } from "react";
import { eulo } from "@yeongseon/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderType } from "@yeongseon/shared";
import {
  getAdminOrderDetail,
  getAdminOrderHistory,
  getAdminOrderItems,
  getAdminOrders,
  getRelatedOrders,
  updateOrderStatus,
  updateOrderTracking,
} from "./orders-api";
import type { AdminOrderDetail } from "@/features/orders/types/admin-order";

export const ORDER_PAGE_SIZE = 20;

const ORDER_LIST_KEY = ["orders", "list"] as const;
const ORDER_DETAIL_KEY = ["orders", "detail"] as const;
const ORDER_ITEMS_KEY = ["orders", "items"] as const;
const ORDER_HISTORY_KEY = ["orders", "history"] as const;
const ORDER_RELATED_KEY = ["orders", "related"] as const;

export function useAdminOrderTable(params: {
  orderType: OrderType;
  page: number;
  dateFrom: string;
  dateTo: string;
  orderNumber?: string | null;
  status?: string | null;
}) {
  return useQuery({
    queryKey: [
      ...ORDER_LIST_KEY,
      params.orderType,
      params.page,
      params.dateFrom,
      params.dateTo,
      params.orderNumber ?? null,
      params.status ?? null,
    ],
    queryFn: () => getAdminOrders({ ...params, pageSize: ORDER_PAGE_SIZE }),
  });
}

export function useAdminOrderDetail(orderId: string | undefined) {
  const query = useQuery({
    queryKey: [...ORDER_DETAIL_KEY, orderId ?? null],
    queryFn: () => getAdminOrderDetail(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  return {
    order: query.data,
    refetch: query.refetch,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

export function useAdminOrderItems(
  orderId: string | undefined,
  orderType: OrderType,
) {
  const query = useQuery({
    queryKey: [...ORDER_ITEMS_KEY, orderId ?? null, orderType],
    queryFn: () => getAdminOrderItems({ orderId: orderId ?? "", orderType }),
    enabled: Boolean(orderId),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useRelatedOrders(
  paymentGroupId: string | null | undefined,
  currentOrderId: string,
) {
  const query = useQuery({
    queryKey: [...ORDER_RELATED_KEY, paymentGroupId ?? null, currentOrderId],
    queryFn: () =>
      getRelatedOrders({
        paymentGroupId: paymentGroupId ?? "",
        currentOrderId,
      }),
    enabled: Boolean(paymentGroupId),
  });

  return {
    relatedOrders: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useAdminOrderHistory(orderId: string | undefined) {
  const query = useQuery({
    queryKey: [...ORDER_HISTORY_KEY, orderId ?? null],
    queryFn: () => getAdminOrderHistory(orderId ?? ""),
    enabled: Boolean(orderId),
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useOrderStatusUpdate(
  orderId: string | undefined,
  refetch: () => void,
) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (params: {
      newStatus: string;
      memo: string;
      isRollback: boolean;
    }) => {
      if (!orderId) throw new Error("주문 정보를 찾을 수 없습니다.");
      return updateOrderStatus({
        orderId,
        newStatus: params.newStatus,
        memo: params.memo || null,
        isRollback: params.isRollback,
      });
    },
    onSuccess: async (_data, variables) => {
      refetch();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ORDER_LIST_KEY }),
        queryClient.invalidateQueries({ queryKey: ORDER_DETAIL_KEY }),
        queryClient.invalidateQueries({ queryKey: ORDER_HISTORY_KEY }),
      ]);
      setErrorMessage(null);
      setNotice(
        variables.isRollback
          ? `"${variables.newStatus}"${eulo(variables.newStatus)} 롤백되었습니다.`
          : `상태가 "${variables.newStatus}"${eulo(variables.newStatus)} 변경되었습니다.`,
      );
    },
  });

  const updateStatus = async (
    newStatus: string,
    memo: string,
    isRollback: boolean,
  ): Promise<boolean> => {
    setNotice(null);
    setErrorMessage(null);
    try {
      await mutation.mutateAsync({ newStatus, memo, isRollback });
      return true;
    } catch (err) {
      setErrorMessage(
        `${isRollback ? "롤백" : "상태 변경"} 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
      );
      return false;
    }
  };

  const changeStatus = (newStatus: string, memo: string) =>
    updateStatus(newStatus, memo, false);

  const rollback = (targetStatus: string, memo: string) =>
    updateStatus(targetStatus, memo, true);

  return {
    isUpdating: mutation.isPending,
    changeStatus,
    rollback,
    notice,
    errorMessage,
    clearNotice: () => setNotice(null),
  };
}

export function useTrackingSave(onSuccess?: () => void | Promise<unknown>) {
  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: updateOrderTracking,
    onSuccess: async () => {
      await onSuccess?.();
      setErrorMessage(null);
      setNotice("배송 정보가 저장되었습니다.");
    },
  });

  const saveTracking = async (
    orderId: string,
    courierCompany?: string,
    trackingNumber?: string,
    companyCourierCompany?: string,
    companyTrackingNumber?: string,
  ): Promise<boolean> => {
    setNotice(null);
    setErrorMessage(null);
    try {
      await mutation.mutateAsync({
        orderId,
        courierCompany,
        trackingNumber,
        companyCourierCompany,
        companyTrackingNumber,
      });
      return true;
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "배송 정보 저장에 실패했습니다.",
      );
      return false;
    }
  };

  return {
    saveTracking,
    isPending: mutation.isPending,
    notice,
    errorMessage,
    clearNotice: () => setNotice(null),
  };
}

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
