import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDesignGeneration,
  getDesignGenerations,
} from "@/entities/design/api/design-generation-api";

export const DESIGN_GENERATIONS_QUERY_KEY = ["design-generations"] as const;
const DESIGN_GENERATION_PAGE_SIZE = 30;

export function useDesignGenerationsQuery() {
  return useQuery({
    queryKey: DESIGN_GENERATIONS_QUERY_KEY,
    queryFn: () =>
      getDesignGenerations({ limit: DESIGN_GENERATION_PAGE_SIZE, offset: 0 }),
    staleTime: 2 * 60 * 1000,
  });
}

export function useDeleteDesignGenerationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDesignGeneration,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: DESIGN_GENERATIONS_QUERY_KEY,
      });
    },
  });
}
