import { useQuery } from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import {
  getSeamlessLog,
  getSeamlessLogs,
  getSeamlessStats,
} from "@/features/seamless-logs/api/seamless-logs-api";
import { SEAMLESS_LOG_PAGE_SIZE } from "@/features/seamless-logs/constants";
import type {
  AdminSeamlessLogItem,
  SeamlessInputTypeFilter,
  SeamlessStatsData,
  SeamlessStatusFilter,
} from "@/features/seamless-logs/types/admin-seamless-log";

type SeamlessDateRange = [string | Dayjs, string | Dayjs];

function toDateString(value: string | Dayjs): string {
  return typeof value === "string" ? value : value.format("YYYY-MM-DD");
}

export function useSeamlessStatsQuery(
  dateRange: SeamlessDateRange,
  enabled = true,
): {
  data: SeamlessStatsData | undefined;
  isLoading: boolean;
} {
  const startDate = toDateString(dateRange[0]);
  const endDate = toDateString(dateRange[1]);
  return useQuery({
    queryKey: ["seamless-logs", "stats", startDate, endDate],
    queryFn: () => getSeamlessStats(startDate, endDate),
    enabled,
  });
}

export function useSeamlessLogsQuery(params: {
  dateRange: SeamlessDateRange;
  page: number;
  inputType?: SeamlessInputTypeFilter | null;
  status?: SeamlessStatusFilter | null;
  idSearch?: string | null;
  enabled?: boolean;
}): {
  data: AdminSeamlessLogItem[] | undefined;
  hasMore: boolean;
  isLoading: boolean;
} {
  const startDate = toDateString(params.dateRange[0]);
  const endDate = toDateString(params.dateRange[1]);
  const normalizedPage = Math.max(1, Math.floor(Number(params.page) || 1));

  const query = useQuery({
    queryKey: [
      "seamless-logs",
      "list",
      startDate,
      endDate,
      normalizedPage,
      params.inputType ?? null,
      params.status ?? null,
      params.idSearch ?? null,
    ],
    queryFn: () =>
      getSeamlessLogs({
        startDate,
        endDate,
        inputType: params.inputType ?? null,
        status: params.status ?? null,
        idSearch: params.idSearch ?? null,
        limit: SEAMLESS_LOG_PAGE_SIZE + 1,
        offset: (normalizedPage - 1) * SEAMLESS_LOG_PAGE_SIZE,
      }),
    enabled: params.enabled ?? true,
  });

  const rawData = query.data;
  return {
    data: rawData?.slice(0, SEAMLESS_LOG_PAGE_SIZE),
    hasMore: (rawData?.length ?? 0) > SEAMLESS_LOG_PAGE_SIZE,
    isLoading: query.isLoading,
  };
}

export function useSeamlessLogDetailQuery(id: string): {
  data: AdminSeamlessLogItem | undefined;
  isLoading: boolean;
  errorMessage: string | null;
} {
  const query = useQuery({
    queryKey: ["seamless-logs", "detail", id],
    queryFn: () => getSeamlessLog(id),
    enabled: Boolean(id),
  });

  return {
    data: query.data ?? undefined,
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
