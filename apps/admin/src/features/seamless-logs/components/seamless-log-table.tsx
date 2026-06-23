import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  inputTypeLabel,
  statusLabel,
  statusTone,
} from "@/features/seamless-logs/utils";
import type { AdminSeamlessLogItem } from "@/features/seamless-logs/types/admin-seamless-log";
import "./seamless-logs.css";

interface SeamlessLogTableProps {
  data: AdminSeamlessLogItem[];
  loading: boolean;
  page: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

function CandidateThumbnailGrid({ log }: { log: AdminSeamlessLogItem }) {
  const candidates = log.candidates.slice(0, 4);
  const cells = Array.from(
    { length: 4 },
    (_, index) => candidates[index] ?? null,
  );

  return (
    <div className="generationLogThumbGrid">
      {cells.map((candidate, index) => (
        <div
          key={candidate?.id ?? `empty-${index}`}
          className="generationLogThumbCell"
        >
          {candidate?.pngUrl ? (
            <img
              className="generationLogThumbImage"
              src={candidate.pngUrl}
              alt={`candidate ${index + 1}`}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <Text as="span" textStyle="t4Regular">
              미리보기 없음
            </Text>
          )}
        </div>
      ))}
    </div>
  );
}

export function SeamlessLogTable({
  data,
  loading,
  page,
  hasMore,
  onPageChange,
}: SeamlessLogTableProps) {
  const location = useLocation();
  const detailSearch = location.search;
  const totalPages = hasMore ? page + 1 : page;
  const columns = useMemo<ColumnDef<AdminSeamlessLogItem>[]>(
    () => [
      {
        id: "candidates",
        header: "후보 미리보기",
        cell: ({ row }) => <CandidateThumbnailGrid log={row.original} />,
      },
      {
        accessorKey: "prompt",
        header: "요청",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="generationLogRequestCell">
              <Text
                as="span"
                textStyle="t4Regular"
                className="generationLogRequestText"
              >
                {record.prompt ?? "(프롬프트 없음)"}
              </Text>
              <div className="generationLogChipRow">
                <StatusBadge tone="brand">
                  {inputTypeLabel(record.inputType)}
                </StatusBadge>
                {record.colorway ? (
                  <StatusBadge>{record.colorway}</StatusBadge>
                ) : null}
                {record.hasReferenceImage ? (
                  <StatusBadge>참조 이미지</StatusBadge>
                ) : null}
              </div>
              <Link
                className="generationLogCodeText"
                to={{
                  pathname: `/seamless-logs/${record.id}`,
                  search: detailSearch,
                }}
                aria-label={`${record.requestId ?? record.id} seamless 로그 상세 보기`}
              >
                {record.requestId ?? record.id}
              </Link>
            </div>
          );
        },
      },
      {
        id: "candidateCount",
        header: "후보",
        cell: ({ row }) => {
          const { candidateCountReturned, candidateCountRequested } =
            row.original;
          return (
            <Text as="span" textStyle="t4Regular">
              {candidateCountReturned ?? "-"}
              {candidateCountRequested != null ? (
                <Text
                  as="span"
                  textStyle="t4Regular"
                  className="generationLogMutedText"
                >
                  {" "}
                  / {candidateCountRequested}
                </Text>
              ) : null}
            </Text>
          );
        },
      },
      {
        id: "timings",
        header: "생성/렌더(ms)",
        cell: ({ row }) => {
          const { generateMs, renderMs } = row.original;
          return (
            <Text as="span" textStyle="t4Regular">
              {generateMs != null ? Math.round(generateMs) : "-"}
              {" / "}
              {renderMs != null ? Math.round(renderMs) : "-"}
            </Text>
          );
        },
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={statusTone(row.original.status)}>
            {statusLabel(row.original.status)}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "시각",
        cell: ({ row }) =>
          dayjs(row.original.createdAt).format("MM-DD HH:mm:ss"),
      },
    ],
    [detailSearch],
  );
  return (
    <>
      <AdminDataTable
        data={data}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="Seamless 생성 로그가 없습니다."
        minWidth={980}
        isLoading={loading}
      />
      <nav
        className="generationLogPagination"
        aria-label="Seamless 생성 로그 페이지네이션"
      >
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          이전
        </ActionButton>
        <Text as="span" textStyle="t4Regular">
          {page} / {totalPages}
        </Text>
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={!hasMore}
          onClick={() => onPageChange(page + 1)}
        >
          다음
        </ActionButton>
      </nav>
    </>
  );
}
