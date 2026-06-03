import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import type { ClaimType } from "@yeongseon/shared";
import { CLAIM_STATUS_OPTIONS, CLAIM_TYPE_LABELS } from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminDataTable } from "@/components/AdminDataTable";
import {
  AdminFilterField,
  AdminFilterSelect,
} from "@/components/AdminFilterControls";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CLAIM_PAGE_SIZE,
  useAdminClaimTable,
} from "@/features/claims/api/claims-query";
import { getClaimStatusTone } from "@/features/claims/components/claim-status-tone";
import type { AdminClaimListItem } from "@/features/claims/types/admin-claim";
import { formatDateTime } from "@/utils/format-date-time";
import "./claims.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");
const CLAIM_TYPE_OPTIONS = Object.entries(CLAIM_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const EMPTY_CLAIM_ROWS: AdminClaimListItem[] = [];

interface ClaimListFiltersProps {
  status: string;
  type: ClaimType | "";
  onFilterChange: (key: "status" | "type", value: string) => void;
}

interface ClaimPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function parsePageParam(value: string | null): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeStatusParam(value: string | null): string {
  if (!value || value === "all") return "";
  return CLAIM_STATUS_OPTIONS.some((option) => option.value === value)
    ? value
    : "";
}

function normalizeTypeParam(value: string | null): ClaimType | "" {
  if (!value || value === "all") return "";
  return CLAIM_TYPE_OPTIONS.some((option) => option.value === value)
    ? (value as ClaimType)
    : "";
}

function ClaimListFilters({
  status,
  type,
  onFilterChange,
}: ClaimListFiltersProps) {
  return (
    <form className="claimToolbar" onSubmit={(event) => event.preventDefault()}>
      <AdminFilterField>
        <AdminFilterSelect
          label="상태"
          name="claim-status"
          value={status}
          onChange={(event) => onFilterChange("status", event.target.value)}
        >
          <option value="">전체</option>
          {CLAIM_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminFilterField>
      <AdminFilterField>
        <AdminFilterSelect
          label="유형"
          name="claim-type"
          value={type}
          onChange={(event) => onFilterChange("type", event.target.value)}
        >
          <option value="">전체</option>
          {CLAIM_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </AdminFilterSelect>
      </AdminFilterField>
    </form>
  );
}

function ClaimPagination({
  page,
  totalPages,
  onPageChange,
}: ClaimPaginationProps) {
  return (
    <nav className="claimPagination" aria-label="클레임 페이지네이션">
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
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </ActionButton>
    </nav>
  );
}

export function ClaimListTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const status = normalizeStatusParam(searchParams.get("status"));
  const type = normalizeTypeParam(searchParams.get("type"));
  const query = useAdminClaimTable({
    page,
    status: status || null,
    type: type || null,
  });
  const rows = query.data?.rows ?? EMPTY_CLAIM_ROWS;
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CLAIM_PAGE_SIZE));

  const columns = useMemo<ColumnDef<AdminClaimListItem>[]>(
    () => [
      { accessorKey: "claimNumber", header: "클레임번호" },
      {
        accessorKey: "claimType",
        header: "유형",
        cell: ({ row }) => CLAIM_TYPE_LABELS[row.original.claimType],
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={getClaimStatusTone(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
      },
      { accessorKey: "orderNumber", header: "주문번호" },
      { accessorKey: "customerName", header: "고객명" },
      {
        accessorKey: "productName",
        header: "상품명",
        cell: ({ row }) => row.original.productName ?? "-",
      },
      {
        accessorKey: "createdAt",
        header: "접수일",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  const setFilter = (key: "status" | "type", value: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const updatePage = (nextPage: number): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  return (
    <section className="claimPanel" aria-labelledby="claim-list-title">
      <AdminPanelHeader
        title="클레임 목록"
        id="claim-list-title"
        className="claimPanelHeader"
        titleClassName="claimPanelTitle"
        count={`${KR_NUMBER_FORMAT.format(total)}건`}
      />

      <ClaimListFilters
        status={status}
        type={type}
        onFilterChange={setFilter}
      />

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}

      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="클레임이 없습니다."
        onRowClick={(row) => navigate(`/claims/show/${row.id}`)}
        getRowActionLabel={(row) => `${row.claimNumber} 클레임 상세 보기`}
        isLoading={query.isFetching}
      />

      <ClaimPagination
        page={page}
        totalPages={totalPages}
        onPageChange={updatePage}
      />
    </section>
  );
}
