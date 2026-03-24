import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTokenPurchase,
  getTokenPlans,
  type TokenPlanKey,
  type CreateTokenPurchaseResult,
  type TokenPlan,
} from "@/features/token-purchase/api/token-purchase-api";
import { confirmPayment } from "@/features/payment/api/payment-api";
import { DESIGN_TOKEN_BALANCE_QUERY_KEY } from "@/features/design/api/ai-design-query";

const TOKEN_PLANS_QUERY_KEY = ["token-plans"] as const;

export function useTokenPlansQuery() {
  return useQuery<TokenPlan[], Error>({
    queryKey: TOKEN_PLANS_QUERY_KEY,
    queryFn: getTokenPlans,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateTokenPurchaseMutation() {
  return useMutation<CreateTokenPurchaseResult, Error, TokenPlanKey>({
    mutationFn: createTokenPurchase,
  });
}

export const useConfirmTokenPurchase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
      });
    },
  });
};
