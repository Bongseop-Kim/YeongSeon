import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getGenerationStats,
  getGenerationLogs,
} from "@/features/generation-logs/api/generation-logs-api";
import type {
  AdminGenerationLogItem,
  GenerationStatsData,
} from "@/features/generation-logs/types/admin-generation-log";

const PAGE_SIZE = 50;

export function useGenerationStatsQuery(dateRange: [Dayjs, Dayjs]): {
  data: GenerationStatsData | undefined;
  isLoading: boolean;
} {
  const startDate = dateRange[0].format("YYYY-MM-DD");
  const endDate = dateRange[1].format("YYYY-MM-DD");

  return useQuery({
    queryKey: ["generation-logs", "stats", startDate, endDate],
    queryFn: () => getGenerationStats(startDate, endDate),
  });
}

export function useGenerationLogsQuery(params: {
  dateRange: [Dayjs, Dayjs];
  aiModel: string | null;
  page: number;
}): {
  data: AdminGenerationLogItem[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
} {
  const startDate = params.dateRange[0].format("YYYY-MM-DD");
  const endDate = params.dateRange[1].format("YYYY-MM-DD");

  const query = useQuery({
    queryKey: [
      "generation-logs",
      "list",
      startDate,
      endDate,
      params.aiModel,
      params.page,
    ],
    queryFn: () =>
      getGenerationLogs({
        startDate,
        endDate,
        aiModel: params.aiModel,
        limit: PAGE_SIZE + 1,
        offset: (params.page - 1) * PAGE_SIZE,
      }),
  });

  const rawData = query.data;

  return {
    data: rawData?.slice(0, PAGE_SIZE),
    hasMore: (rawData?.length ?? 0) > PAGE_SIZE,
    isLoading: query.isLoading,
  };
}

export { PAGE_SIZE as GENERATION_LOG_PAGE_SIZE };
