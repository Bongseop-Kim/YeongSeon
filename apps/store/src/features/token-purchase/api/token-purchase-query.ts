import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createTokenPurchase,
  getTokenPlans,
  type TokenPlanKey,
  type CreateTokenPurchaseResult,
  type TokenPlan,
} from "@/features/token-purchase/api/token-purchase-api";

export const TOKEN_PLANS_QUERY_KEY = ["token-plans"] as const;

export function useTokenPlansQuery() {
  return useQuery<TokenPlan[], Error>({
    queryKey: TOKEN_PLANS_QUERY_KEY,
    queryFn: getTokenPlans,
  });
}

export function useCreateTokenPurchaseMutation() {
  return useMutation<CreateTokenPurchaseResult, Error, TokenPlanKey>({
    mutationFn: createTokenPurchase,
  });
}
