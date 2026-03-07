import { useMutation } from "@tanstack/react-query";

import {
  mockAiDesignApi,
  type AiDesignRequest,
  type AiDesignResponse,
} from "@/features/design/api/ai-design-api";

export function useAiDesignMutation() {
  return useMutation<AiDesignResponse, Error, AiDesignRequest>({
    mutationFn: mockAiDesignApi,
  });
}
