import { useMemo } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { GENERATION_LOG_PAGE_SIZE } from "@/features/generation-logs/constants";
import { requestTypeLabel } from "@/features/generation-logs/utils";
import { formatNullableLocaleNumber } from "@/utils/format-number";
import type { AdminGenerationLogGroup } from "@/features/generation-logs/types/admin-generation-log";
import "./generation-logs.css";

interface GenerationLogTableProps {
  data: AdminGenerationLogGroup[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  aiModel: string | null;
  onAiModelChange: (model: string | null) => void;
}

function ResultThumbnailGrid({ group }: { group: AdminGenerationLogGroup }) {
  const images = group.resultImages.slice(0, 4);
  const cells = Array.from({ length: 4 }, (_, index) => images[index] ?? null);

  return (
    <div className="generationLogThumbGrid">
      {cells.map((image, index) => (
        <div
          key={image?.workId ?? `empty-${index}`}
          className={
            image?.status === "error"
              ? "generationLogThumbCell generationLogThumbCellError"
              : "generationLogThumbCell"
          }
        >
          {image?.url ? (
            <img
              className="generationLogThumbImage"
              src={image.url}
              alt={`생성 결과 ${index + 1}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span>이미지 없음</span>
          )}
        </div>
      ))}
    </div>
  );
}

function GroupStatusBadge({ group }: { group: AdminGenerationLogGroup }) {
  return (
    <StatusBadge tone={group.errorCount > 0 ? "critical" : "positive"}>
      {group.successCount}/{group.imageCount} 성공
    </StatusBadge>
  );
}

function StatusCell({ group }: { group: AdminGenerationLogGroup }) {
  return group.errorCount > 0 ? (
    <StatusBadge tone="critical">에러 {group.errorCount}</StatusBadge>
  ) : (
    <StatusBadge tone="positive">성공</StatusBadge>
  );
}

export function GenerationLogTable({
  data,
  loading,
  page,
  hasMore,
  onPageChange,
  aiModel,
  onAiModelChange,
}: GenerationLogTableProps) {
  const columns = useMemo<ColumnDef<AdminGenerationLogGroup>[]>(
    () => [
      {
        id: "resultImages",
        header: "생성 결과",
        cell: ({ row }) => <ResultThumbnailGrid group={row.original} />,
      },
      {
        accessorKey: "userMessage",
        header: "요청",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="generationLogRequestCell">
              <span className="generationLogRequestText">
                {record.userMessage}
              </span>
              <div className="generationLogChipRow">
                <StatusBadge tone="brand">{record.aiModel}</StatusBadge>
                <StatusBadge>
                  {requestTypeLabel(record.requestType)}
                </StatusBadge>
                {record.patternType ? (
                  <StatusBadge>{record.patternType}</StatusBadge>
                ) : null}
                {record.fabricType ? (
                  <StatusBadge>{record.fabricType}</StatusBadge>
                ) : null}
              </div>
              <Link
                className="generationLogCodeText"
                to={`/generation-logs/${record.primaryLogId}`}
                aria-label={`${record.workflowId} 생성 로그 상세 보기`}
              >
                {record.workflowId}
              </Link>
            </div>
          );
        },
      },
      {
        id: "imageCount",
        header: "이미지",
        cell: ({ row }) => <GroupStatusBadge group={row.original} />,
      },
      {
        id: "tokens",
        header: "토큰",
        cell: ({ row }) => {
          const net = row.original.tokensCharged - row.original.tokensRefunded;
          return (
            <span>
              {net}
              {row.original.tokensRefunded > 0 ? (
                <span className="generationLogMutedText">
                  {" "}
                  (-{row.original.tokensRefunded})
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        accessorKey: "totalLatencyMs",
        header: "응답(ms)",
        cell: ({ row }) =>
          formatNullableLocaleNumber(row.original.totalLatencyMs),
      },
      {
        accessorKey: "errorCount",
        header: "상태",
        cell: ({ row }) => <StatusCell group={row.original} />,
      },
      {
        accessorKey: "createdAt",
        header: "시각",
        cell: ({ row }) =>
          dayjs(row.original.createdAt).format("MM-DD HH:mm:ss"),
      },
    ],
    [],
  );
  const totalText = hasMore
    ? `${page * GENERATION_LOG_PAGE_SIZE}+`
    : String((page - 1) * GENERATION_LOG_PAGE_SIZE + data.length);

  return (
    <div className="generationLogPanel">
      <div className="generationLogToolbar">
        <label className="generationLogField">
          <span className="generationLogFieldLabel">AI 모델</span>
          <select
            className="generationLogSelect"
            value={aiModel ?? ""}
            onChange={(event) => onAiModelChange(event.target.value || null)}
          >
            <option value="">모든 모델</option>
            <option value="openai">OpenAI</option>
          </select>
        </label>
        {loading ? (
          <p className="generationLogMutedText">불러오는 중…</p>
        ) : null}
      </div>

      <AdminDataTable
        data={data}
        columns={columns}
        getRowId={(row) => row.workflowId}
        emptyText="생성 로그가 없습니다."
        minWidth={980}
      />
      <nav
        className="generationLogPagination"
        aria-label="생성 로그 페이지네이션"
      >
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          이전
        </ActionButton>
        <span>
          {page} · {totalText}건
        </span>
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={!hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          다음
        </ActionButton>
      </nav>
    </div>
  );
}
