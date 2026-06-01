import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "seed-design/ui/segmented-control";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  INQUIRY_STATUS_OPTIONS,
  type AdminInquiryListItem,
  type InquiryStatus,
} from "@/features/inquiries/types/admin-inquiry";
import {
  INQUIRY_PAGE_SIZE,
  useAdminInquiryTable,
} from "@/features/inquiries/api/inquiries-query";
import "./inquiries.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function parsePageParam(value: string | null): number {
  return Math.max(1, Number(value ?? "1") || 1);
}

function statusTone(status: InquiryStatus) {
  return status === "답변완료" ? "positive" : "warning";
}

export function InquiryListTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const status = (searchParams.get("status") || null) as InquiryStatus | null;
  const query = useAdminInquiryTable({ page, status });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / INQUIRY_PAGE_SIZE));

  const columns = useMemo<ColumnDef<AdminInquiryListItem>[]>(
    () => [
      { accessorKey: "title", header: "제목" },
      { accessorKey: "category", header: "유형" },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={statusTone(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
      },
      { accessorKey: "date", header: "작성일" },
    ],
    [],
  );

  const setStatus = (nextStatus: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (nextStatus) next.set("status", nextStatus);
      else next.delete("status");
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
    <section className="inquiryPanel" aria-labelledby="inquiry-list-title">
      <div className="inquiryPanelHeader">
        <div>
          <Text
            as="h2"
            textStyle="t6Bold"
            id="inquiry-list-title"
            className="inquiryPanelTitle"
          >
            문의 목록 ({KR_NUMBER_FORMAT.format(total)}건)
          </Text>
          {query.isFetching ? (
            <Text as="p" textStyle="t4Regular" className="inquiryMutedText">
              불러오는 중…
            </Text>
          ) : null}
        </div>
        <SegmentedControl
          className="inquiryStatusFilter"
          aria-label="문의 상태 필터"
          name="inquiry-status"
          value={status ?? "all"}
          onValueChange={(value) => setStatus(value === "all" ? "" : value)}
        >
          <SegmentedControlItem value="all">전체</SegmentedControlItem>
          {INQUIRY_STATUS_OPTIONS.map((option) => (
            <SegmentedControlItem key={option.value} value={option.value}>
              {option.label}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
      </div>

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="문의가 없습니다."
        onRowClick={(row) => navigate(`/inquiries/show/${row.id}`)}
        getRowActionLabel={(row) => `${row.title} 문의 상세 보기`}
      />
      <nav className="inquiryPagination" aria-label="문의 페이지네이션">
        <ActionButton
          type="button"
          variant="neutralWeak"
          disabled={page <= 1}
          onClick={() => updatePage(page - 1)}
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
          onClick={() => updatePage(page + 1)}
        >
          다음
        </ActionButton>
      </nav>
    </section>
  );
}
