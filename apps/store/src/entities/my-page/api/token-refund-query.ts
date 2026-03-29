import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTokenRefund,
  getRefundableTokenOrders,
  requestTokenRefund,
  TokenRefundRpcError,
} from "@/entities/my-page/api/token-refund-api";
import { DESIGN_TOKEN_BALANCE_QUERY_KEY } from "@/entities/design/api/ai-design-query";

const REFUNDABLE_ORDERS_QUERY_KEY = ["refundable-token-orders"] as const;

export function getTokenRefundErrorMessage(error: unknown): string {
  if (
    error instanceof TokenRefundRpcError &&
    error.code === "token_order_expired"
  ) {
    return "환불 가능 기간이 지난 토큰 주문입니다.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "환불 신청 중 오류가 발생했습니다.";
}

export function useRefundableTokenOrdersQuery() {
  return useQuery({
    queryKey: REFUNDABLE_ORDERS_QUERY_KEY,
    queryFn: getRefundableTokenOrders,
  });
}

export function useRequestTokenRefundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      try {
        await requestTokenRefund(orderId);
      } catch (error) {
        throw new Error(getTokenRefundErrorMessage(error));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFUNDABLE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
    },
  });
}

export function useCancelTokenRefundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => cancelTokenRefund(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFUNDABLE_ORDERS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
    },
  });
}
