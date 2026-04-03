import { useState } from "react";
import { Typography, Card, Spin } from "antd";
import dayjs from "dayjs";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import {
  GenerationLogStats,
  DesignContextStats,
  GenerationLogTable,
  useGenerationStatsQuery,
  useGenerationLogsQuery,
} from "@/features/generation-logs";

const EMPTY_SUMMARY = {
  totalRequests: 0,
  imageSuccessRate: 0,
  totalTokensConsumed: 0,
  avgTotalLatencyMs: 0,
};

export default function GenerationLogList() {
  const [dateRange, setDateRange] = useState<DateRange>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data: statsData, isLoading: statsLoading } =
    useGenerationStatsQuery(dateRange);
  const {
    data: logsData,
    hasMore: logsHasMore,
    isLoading: logsLoading,
  } = useGenerationLogsQuery({
    dateRange,
    aiModel,
    page,
  });

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setPage(1);
  };

  const handleAiModelChange = (model: string | null) => {
    setAiModel(model);
    setPage(1);
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>
        AI 생성 로그
      </Typography.Title>

      <div style={{ marginBottom: 16 }}>
        <DateRangeFilter value={dateRange} onChange={handleDateRangeChange} />
      </div>

      {statsLoading ? (
        <Spin style={{ display: "block", margin: "40px auto" }} />
      ) : (
        <GenerationLogStats stats={statsData?.summary ?? EMPTY_SUMMARY} />
      )}

      <Card style={{ marginBottom: 24 }}>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>
          디자인 컨텍스트 통계
        </Typography.Title>
        <DesignContextStats
          byModel={statsData?.byModel ?? []}
          byInputType={statsData?.byInputType ?? []}
          byPattern={statsData?.byPattern ?? []}
          byError={statsData?.byError ?? []}
          loading={statsLoading}
        />
      </Card>

      <Card>
        <Typography.Title level={5} style={{ marginBottom: 16 }}>
          로그 목록
        </Typography.Title>
        <GenerationLogTable
          data={logsData ?? []}
          loading={logsLoading}
          page={page}
          hasMore={logsHasMore}
          onPageChange={setPage}
          aiModel={aiModel}
          onAiModelChange={handleAiModelChange}
        />
      </Card>
    </div>
  );
}
