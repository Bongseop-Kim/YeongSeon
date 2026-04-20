import { useMutation } from "@tanstack/react-query";

import {
  aiDesignApi,
  type AiDesignRequest,
  type AiDesignResponse,
  DESIGN_TOKEN_BALANCE_QUERY_KEY,
  useDesignTokenBalanceQuery,
} from "@/entities/design";

export { DESIGN_TOKEN_BALANCE_QUERY_KEY, useDesignTokenBalanceQuery };

export function useAiDesignMutation() {
  return useMutation<AiDesignResponse, Error, AiDesignRequest>({
    mutationFn: aiDesignApi,
  });
}
