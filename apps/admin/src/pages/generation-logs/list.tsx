import { useState } from "react";
import { Button, Card, Input, Select, Space, Spin, Typography } from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import {
  DesignContextStats,
  GenerationLogStats,
  GenerationLogTable,
  useGenerationLogsQuery,
  useGenerationStatsQuery,
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
  const [requestType, setRequestType] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [idSearch, setIdSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [statsOpen, setStatsOpen] = useState(false);

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
    requestType,
    status,
    idSearch: idSearch.trim() || null,
  });

  const resetPage = () => setPage(1);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    resetPage();
  };
  const handleAiModelChange = (v: string | null) => {
    setAiModel(v);
    resetPage();
  };
  const handleRequestTypeChange = (v: string | null) => {
    setRequestType(v);
    resetPage();
  };
  const handleStatusChange = (v: string | null) => {
    setStatus(v);
    resetPage();
  };
  const handleIdSearchChange = (v: string) => {
    setIdSearch(v);
    resetPage();
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

      <Card
        style={{ marginBottom: 16 }}
        styles={{ body: { padding: 0 } }}
        extra={
          <Button
            type="link"
            size="small"
            icon={statsOpen ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setStatsOpen((v) => !v)}
          >
            {statsOpen ? "통계 접기" : "통계 펼치기"}
          </Button>
        }
        title={
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            모델·패턴·에러 통계
          </Typography.Text>
        }
      >
        {statsOpen && (
          <div style={{ padding: 16 }}>
            <DesignContextStats
              byModel={statsData?.byModel ?? []}
              byInputType={statsData?.byInputType ?? []}
              byPattern={statsData?.byPattern ?? []}
              byError={statsData?.byError ?? []}
              loading={statsLoading}
            />
          </div>
        )}
      </Card>

      <Card>
        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          로그 목록
        </Typography.Title>

        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            placeholder="모든 요청 유형"
            value={requestType}
            onChange={handleRequestTypeChange}
            allowClear
            style={{ width: 150 }}
            options={[
              { value: "analysis", label: "분석" },
              { value: "prep", label: "보정" },
              { value: "render_standard", label: "렌더(표준)" },
              { value: "render_high", label: "렌더(고품질)" },
            ]}
          />
          <Select
            placeholder="모든 상태"
            value={status}
            onChange={handleStatusChange}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: "success", label: "성공" },
              { value: "error", label: "에러" },
            ]}
          />
          <Input.Search
            placeholder="workflow_id / work_id"
            value={idSearch}
            onChange={(e) => handleIdSearchChange(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
        </Space>

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
