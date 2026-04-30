import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getGenerationStats,
  getGenerationLogs,
  getGenerationLogGroups,
} from "@/features/generation-logs/api/generation-logs-api";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/constants";
import type {
  AdminGenerationLogGroup,
  AdminGenerationLogItem,
  GenerationRequestTypeFilter,
  GenerationStatusFilter,
  GenerationStatsData,
} from "@/features/generation-logs/types/admin-generation-log";

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
  requestType?: GenerationRequestTypeFilter | null;
  status?: GenerationStatusFilter | null;
  idSearch?: string | null;
}): {
  data: AdminGenerationLogGroup[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
} {
  const startDate = params.dateRange[0].format("YYYY-MM-DD");
  const endDate = params.dateRange[1].format("YYYY-MM-DD");
  const normalizedPage = Math.max(1, Math.floor(Number(params.page) || 1));

  const query = useQuery({
    queryKey: [
      "generation-logs",
      "list",
      startDate,
      endDate,
      params.aiModel,
      normalizedPage,
      params.requestType ?? null,
      params.status ?? null,
      params.idSearch ?? null,
    ],
    queryFn: () =>
      getGenerationLogGroups({
        startDate,
        endDate,
        aiModel: params.aiModel,
        limit: GENERATION_LOG_PAGE_SIZE + 1,
        offset: (normalizedPage - 1) * GENERATION_LOG_PAGE_SIZE,
        requestType: params.requestType ?? null,
        status: params.status ?? null,
        idSearch: params.idSearch ?? null,
      }),
  });

  const rawData = query.data;
  return {
    data: rawData?.slice(0, GENERATION_LOG_PAGE_SIZE),
    hasMore: (rawData?.length ?? 0) > GENERATION_LOG_PAGE_SIZE,
    isLoading: query.isLoading,
  };
}

export function useGenerationLogDetailQuery(id: string): {
  data: AdminGenerationLogItem | undefined;
  isLoading: boolean;
  errorMessage: string | null;
} {
  // p_id 단건 조회 시 날짜 범위 필터가 항상 적용되므로
  // 충분히 넓은 범위를 지정해 날짜 조건이 결과를 제한하지 않도록 한다.
  const query = useQuery({
    queryKey: ["generation-logs", "detail", id],
    queryFn: () =>
      getGenerationLogs({
        startDate: null,
        endDate: null,
        id,
        limit: 1,
        offset: 0,
      }),
    enabled: Boolean(id),
  });

  return {
    data: query.data?.[0],
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}

export function useGenerationWorkflowLogsQuery(workflowId: string): {
  data: AdminGenerationLogItem[];
  isLoading: boolean;
  errorMessage: string | null;
} {
  const normalizedWorkflowId = workflowId.trim();
  const query = useQuery({
    queryKey: ["generation-logs", "workflow", normalizedWorkflowId],
    queryFn: () =>
      getGenerationLogs({
        startDate: null,
        endDate: null,
        idSearch: normalizedWorkflowId,
        limit: 200,
        offset: 0,
      }),
    enabled: normalizedWorkflowId.length > 0,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
