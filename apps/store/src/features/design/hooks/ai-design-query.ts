import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getDesignTokenBalance,
  aiDesignApi,
  type AiDesignRequest,
  type AiDesignResponse,
} from "@/entities/design";

export const DESIGN_TOKEN_BALANCE_QUERY_KEY = ["design-token-balance"] as const;
export function useDesignTokenBalanceQuery() {
  return useQuery({
    queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
    queryFn: getDesignTokenBalance,
  });
}

export function useAiDesignMutation() {
  return useMutation<AiDesignResponse, Error, AiDesignRequest>({
    mutationFn: aiDesignApi,
  });
}
