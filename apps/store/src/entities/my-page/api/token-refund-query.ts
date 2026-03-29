import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTokenRefund,
  getRefundableTokenOrders,
  requestTokenRefund,
} from "@/entities/my-page/api/token-refund-api";
import { DESIGN_TOKEN_BALANCE_QUERY_KEY } from "@/entities/design/api/ai-design-query";

const REFUNDABLE_ORDERS_QUERY_KEY = ["refundable-token-orders"] as const;

export function useRefundableTokenOrdersQuery() {
  return useQuery({
    queryKey: REFUNDABLE_ORDERS_QUERY_KEY,
    queryFn: getRefundableTokenOrders,
  });
}

export function useRequestTokenRefundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string }) =>
      requestTokenRefund(orderId),
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
