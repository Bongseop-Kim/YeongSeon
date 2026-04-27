import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getDesignTokenBalance,
  getDesignTokenHistory,
} from "@/entities/design/api/design-token-api";

export const DESIGN_TOKEN_BALANCE_QUERY_KEY = ["design-token-balance"] as const;
const DESIGN_TOKEN_HISTORY_QUERY_KEY = "design-token-history" as const;
const DESIGN_TOKEN_HISTORY_PAGE_SIZE = 50;

export function useDesignTokenBalanceQuery() {
  return useQuery({
    queryKey: DESIGN_TOKEN_BALANCE_QUERY_KEY,
    queryFn: getDesignTokenBalance,
  });
}

interface UseDesignTokenHistoryQueryParams {
  dateFrom?: string;
  dateTo?: string;
}

export function useDesignTokenHistoryQuery(
  params: UseDesignTokenHistoryQueryParams = {},
) {
  return useInfiniteQuery({
    queryKey: [
      DESIGN_TOKEN_HISTORY_QUERY_KEY,
      params.dateFrom ?? null,
      params.dateTo ?? null,
    ],
    queryFn: ({ pageParam }) =>
      getDesignTokenHistory({
        limit: DESIGN_TOKEN_HISTORY_PAGE_SIZE,
        offset: pageParam,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < DESIGN_TOKEN_HISTORY_PAGE_SIZE
        ? undefined
        : allPages.reduce((sum, page) => sum + page.length, 0),
  });
}
