import { useMutation, useQuery } from "@tanstack/react-query";

import {
  aiDesignApi,
  getDesignTokenBalance,
  getDesignTokenHistory,
  type AiDesignRequest,
  type AiDesignResponse,
} from "@/entities/design/api/ai-design-api";

export const DESIGN_TOKEN_BALANCE_QUERY_KEY = ["design-token-balance"] as const;
const DESIGN_TOKEN_HISTORY_QUERY_KEY = ["design-token-history"] as const;

export function useDesignTokenBalanceQuery() {
  return useQuery({
    queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
    queryFn: getDesignTokenBalance,
  });
}

export function useDesignTokenHistoryQuery() {
  return useQuery({
    queryKey: DESIGN_TOKEN_HISTORY_QUERY_KEY,
    queryFn: getDesignTokenHistory,
  });
}

export function useAiDesignMutation() {
  return useMutation<AiDesignResponse, Error, AiDesignRequest>({
    mutationFn: aiDesignApi,
  });
}
