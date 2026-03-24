import { Table, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  ModelStats,
  InputTypeStats,
  PatternStats,
  ErrorDistribution,
} from "@/features/generation-logs/types/admin-generation-log";
import { formatNullableLocaleNumber } from "@/utils/format-number";

function formatNullableFixed(
  v: number | null | undefined,
  digits: number,
): string {
  return v == null ? "-" : v.toFixed(digits);
}

function formatNullablePercent(
  v: number | null | undefined,
  digits: number,
): string {
  return v == null ? "-" : `${v.toFixed(digits)}%`;
}

// ── 모델별 통계 ───────────────────────────────────────────────

const modelColumns: ColumnsType<ModelStats> = [
  { title: "AI 모델", dataIndex: "aiModel", key: "aiModel" },
  {
    title: "요청 수",
    dataIndex: "requestCount",
    key: "requestCount",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "텍스트 API 평균(ms)",
    dataIndex: "avgTextLatencyMs",
    key: "avgTextLatencyMs",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "이미지 API 평균(ms)",
    dataIndex: "avgImageLatencyMs",
    key: "avgImageLatencyMs",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "평균 토큰 비용",
    dataIndex: "avgTokenCost",
    key: "avgTokenCost",
    align: "right",
    render: (v: number | null | undefined) => formatNullableFixed(v, 1),
  },
  {
    title: "이미지 성공률",
    dataIndex: "imageSuccessRate",
    key: "imageSuccessRate",
    align: "right",
    render: (v: number | null | undefined) => formatNullablePercent(v, 1),
  },
];

// ── 입력 유형별 통계 ──────────────────────────────────────────

const inputTypeColumns: ColumnsType<InputTypeStats> = [
  { title: "입력 유형", dataIndex: "inputType", key: "inputType" },
  {
    title: "요청 수",
    dataIndex: "requestCount",
    key: "requestCount",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "이미지 성공률",
    dataIndex: "imageSuccessRate",
    key: "imageSuccessRate",
    align: "right",
    render: (v: number | null | undefined) => formatNullablePercent(v, 1),
  },
  {
    title: "평균 레이턴시(ms)",
    dataIndex: "avgLatencyMs",
    key: "avgLatencyMs",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "평균 토큰 비용",
    dataIndex: "avgTokenCost",
    key: "avgTokenCost",
    align: "right",
    render: (v: number | null | undefined) => formatNullableFixed(v, 1),
  },
];

// ── 패턴별 통계 ───────────────────────────────────────────────

const patternColumns: ColumnsType<PatternStats> = [
  { title: "패턴", dataIndex: "pattern", key: "pattern" },
  {
    title: "요청 수",
    dataIndex: "requestCount",
    key: "requestCount",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
  {
    title: "이미지 성공률",
    dataIndex: "imageSuccessRate",
    key: "imageSuccessRate",
    align: "right",
    render: (v: number | null | undefined) => formatNullablePercent(v, 1),
  },
  {
    title: "평균 토큰 비용",
    dataIndex: "avgTokenCost",
    key: "avgTokenCost",
    align: "right",
    render: (v: number | null | undefined) => formatNullableFixed(v, 1),
  },
];

// ── 에러 분포 ─────────────────────────────────────────────────

const errorColumns: ColumnsType<ErrorDistribution> = [
  { title: "유형", dataIndex: "errorType", key: "errorType" },
  {
    title: "건수",
    dataIndex: "count",
    key: "count",
    align: "right",
    render: (v: number | null | undefined) => formatNullableLocaleNumber(v),
  },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────────

interface DesignContextStatsProps {
  byModel: ModelStats[];
  byInputType: InputTypeStats[];
  byPattern: PatternStats[];
  byError: ErrorDistribution[];
  loading: boolean;
}

export function DesignContextStats({
  byModel,
  byInputType,
  byPattern,
  byError,
  loading,
}: DesignContextStatsProps) {
  return (
    <Tabs
      items={[
        {
          key: "by_model",
          label: "모델별",
          children: (
            <Table<ModelStats>
              columns={modelColumns}
              dataSource={byModel}
              rowKey="aiModel"
              loading={loading}
              pagination={false}
              size="small"
            />
          ),
        },
        {
          key: "by_input_type",
          label: "입력 유형별",
          children: (
            <Table<InputTypeStats>
              columns={inputTypeColumns}
              dataSource={byInputType}
              rowKey="inputType"
              loading={loading}
              pagination={false}
              size="small"
            />
          ),
        },
        {
          key: "by_pattern",
          label: "패턴별",
          children: (
            <Table<PatternStats>
              columns={patternColumns}
              dataSource={byPattern}
              rowKey="pattern"
              loading={loading}
              pagination={false}
              size="small"
            />
          ),
        },
        {
          key: "by_error",
          label: "에러 분포",
          children: (
            <Table<ErrorDistribution>
              columns={errorColumns}
              dataSource={byError}
              rowKey="errorType"
              loading={loading}
              pagination={false}
              size="small"
            />
          ),
        },
      ]}
    />
  );
}
