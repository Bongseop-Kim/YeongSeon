import { useMutation, useQuery } from "@tanstack/react-query";

import {
  aiDesignApi,
  getDesignTokenBalance,
  type AiDesignRequest,
  type AiDesignResponse,
} from "@/features/design/api/ai-design-api";

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
