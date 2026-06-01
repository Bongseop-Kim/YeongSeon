import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/components/AdminDataTable";
import type {
  ErrorDistribution,
  InputTypeStats,
  ModelStats,
  PatternStats,
} from "@/features/generation-logs/types/admin-generation-log";
import { formatNullableLocaleNumber } from "@/utils/format-number";

interface DesignContextStatsProps {
  byModel: ModelStats[];
  byInputType: InputTypeStats[];
  byPattern: PatternStats[];
  byError: ErrorDistribution[];
  loading: boolean;
}

type StatsTab = "by_model" | "by_input_type" | "by_pattern" | "by_error";

const STATS_TABS: Array<{ key: StatsTab; label: string }> = [
  { key: "by_model", label: "모델별" },
  { key: "by_input_type", label: "입력 유형별" },
  { key: "by_pattern", label: "패턴별" },
  { key: "by_error", label: "에러 분포" },
];

function formatNullableFixed(
  value: number | null | undefined,
  digits: number,
): string {
  return value == null ? "-" : value.toFixed(digits);
}

function formatNullablePercent(
  value: number | null | undefined,
  digits: number,
): string {
  return value == null ? "-" : `${value.toFixed(digits)}%`;
}

function NumberCell({ children }: { children: string }) {
  return <span className="generationLogNumberCell">{children}</span>;
}

export function DesignContextStats({
  byModel,
  byInputType,
  byPattern,
  byError,
  loading,
}: DesignContextStatsProps) {
  const [activeTab, setActiveTab] = useState<StatsTab>("by_model");
  const modelColumns = useMemo<ColumnDef<ModelStats>[]>(
    () => [
      { accessorKey: "aiModel", header: "AI 모델" },
      {
        accessorKey: "requestCount",
        header: "요청 수",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.requestCount)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgTextLatencyMs",
        header: "텍스트 API 평균(ms)",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.avgTextLatencyMs)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgImageLatencyMs",
        header: "이미지 API 평균(ms)",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.avgImageLatencyMs)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgTokenCost",
        header: "평균 토큰 비용",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableFixed(row.original.avgTokenCost, 1)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "imageSuccessRate",
        header: "이미지 성공률",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullablePercent(row.original.imageSuccessRate, 1)}
          </NumberCell>
        ),
      },
    ],
    [],
  );
  const inputTypeColumns = useMemo<ColumnDef<InputTypeStats>[]>(
    () => [
      { accessorKey: "inputType", header: "입력 유형" },
      {
        accessorKey: "requestCount",
        header: "요청 수",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.requestCount)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "imageSuccessRate",
        header: "이미지 성공률",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullablePercent(row.original.imageSuccessRate, 1)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgLatencyMs",
        header: "평균 레이턴시(ms)",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.avgLatencyMs)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgTokenCost",
        header: "평균 토큰 비용",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableFixed(row.original.avgTokenCost, 1)}
          </NumberCell>
        ),
      },
    ],
    [],
  );
  const patternColumns = useMemo<ColumnDef<PatternStats>[]>(
    () => [
      { accessorKey: "pattern", header: "패턴" },
      {
        accessorKey: "requestCount",
        header: "요청 수",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.requestCount)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "imageSuccessRate",
        header: "이미지 성공률",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullablePercent(row.original.imageSuccessRate, 1)}
          </NumberCell>
        ),
      },
      {
        accessorKey: "avgTokenCost",
        header: "평균 토큰 비용",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableFixed(row.original.avgTokenCost, 1)}
          </NumberCell>
        ),
      },
    ],
    [],
  );
  const errorColumns = useMemo<ColumnDef<ErrorDistribution>[]>(
    () => [
      { accessorKey: "errorType", header: "유형" },
      {
        accessorKey: "count",
        header: "건수",
        cell: ({ row }) => (
          <NumberCell>
            {formatNullableLocaleNumber(row.original.count)}
          </NumberCell>
        ),
      },
    ],
    [],
  );

  return (
    <div className="generationLogPanel">
      <div
        className="generationLogTabList"
        role="tablist"
        aria-label="통계 유형"
      >
        {STATS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="generationLogTabButton"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {loading ? <p className="generationLogMutedText">불러오는 중…</p> : null}
      {activeTab === "by_model" ? (
        <AdminDataTable
          data={byModel}
          columns={modelColumns}
          getRowId={(row) => row.aiModel}
          emptyText="모델별 통계가 없습니다."
          minWidth={860}
        />
      ) : null}
      {activeTab === "by_input_type" ? (
        <AdminDataTable
          data={byInputType}
          columns={inputTypeColumns}
          getRowId={(row) => row.inputType}
          emptyText="입력 유형별 통계가 없습니다."
          minWidth={760}
        />
      ) : null}
      {activeTab === "by_pattern" ? (
        <AdminDataTable
          data={byPattern}
          columns={patternColumns}
          getRowId={(row) => row.pattern}
          emptyText="패턴별 통계가 없습니다."
          minWidth={640}
        />
      ) : null}
      {activeTab === "by_error" ? (
        <AdminDataTable
          data={byError}
          columns={errorColumns}
          getRowId={(row) => row.errorType}
          emptyText="에러 분포가 없습니다."
          minWidth={420}
        />
      ) : null}
    </div>
  );
}
