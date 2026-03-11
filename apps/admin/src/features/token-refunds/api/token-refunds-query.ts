import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveTokenRefund,
  getTokenRefundRequests,
  rejectTokenRefund,
} from "@/features/token-refunds/api/token-refunds-api";
import type { TokenRefundStatus } from "@/features/token-refunds/types/admin-token-refund";

export const TOKEN_REFUND_REQUESTS_QUERY_KEY = ["token-refund-requests"] as const;

export function useTokenRefundRequestsQuery(status?: TokenRefundStatus) {
  return useQuery({
    queryKey: [...TOKEN_REFUND_REQUESTS_QUERY_KEY, status],
    queryFn: () => getTokenRefundRequests(status),
  });
}

export function useApproveTokenRefundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (refundRequestId: string) => approveTokenRefund(refundRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOKEN_REFUND_REQUESTS_QUERY_KEY });
    },
  });
}

export function useRejectTokenRefundMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, adminMemo }: { requestId: string; adminMemo?: string }) =>
      rejectTokenRefund(requestId, adminMemo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOKEN_REFUND_REQUESTS_QUERY_KEY });
    },
  });
}
