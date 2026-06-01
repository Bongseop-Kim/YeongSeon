import { Text } from "seed-design/ui/text";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import {
  CONTACT_METHOD_LABELS,
  QUOTE_REQUEST_STATUS_OPTIONS,
} from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "seed-design/ui/segmented-control";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  QUOTE_REQUEST_PAGE_SIZE,
  useAdminQuoteRequestTable,
} from "@/features/quote-requests/api/quote-requests-query";
import type { AdminQuoteRequestListItem } from "@/features/quote-requests/types/admin-quote-request";
import { formatMoney } from "@/utils/format-number";
import "./quote-requests.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");
const QUOTE_REQUEST_SEARCH_DEBOUNCE_MS = 300;

function parsePageParam(value: string | null): number {
  const page = Number(value ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeStatusParam(value: string | null): string {
  if (!value || value === "all") return "";
  return QUOTE_REQUEST_STATUS_OPTIONS.some((option) => option.value === value)
    ? value
    : "";
}

function quoteRequestStatusTone(status: string) {
  if (status === "확정") return "positive";
  if (status === "종료") return "critical";
  if (status === "협의중") return "warning";
  if (status === "견적발송") return "brand";
  return "neutral";
}

interface QuoteRequestListTableProps {
  rows: AdminQuoteRequestListItem[];
  onRowClick: (row: AdminQuoteRequestListItem) => void;
  emptyText?: string;
  isLoading?: boolean;
}

export function QuoteRequestListTable({
  rows,
  onRowClick,
  emptyText = "견적 요청이 없습니다.",
  isLoading = false,
}: QuoteRequestListTableProps) {
  const columns = useMemo<ColumnDef<AdminQuoteRequestListItem>[]>(
    () => [
      { accessorKey: "quoteNumber", header: "견적번호" },
      { accessorKey: "date", header: "요청일" },
      { accessorKey: "customerName", header: "고객명" },
      { accessorKey: "contactName", header: "담당자" },
      {
        accessorKey: "contactMethod",
        header: "연락방법",
        cell: ({ row }) => CONTACT_METHOD_LABELS[row.original.contactMethod],
      },
      {
        accessorKey: "quantity",
        header: "수량",
        cell: ({ row }) => `${row.original.quantity.toLocaleString("ko-KR")}개`,
      },
      {
        accessorKey: "quotedAmount",
        header: "견적금액",
        cell: ({ row }) => formatMoney(row.original.quotedAmount),
      },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => (
          <StatusBadge tone={quoteRequestStatusTone(row.original.status)}>
            {row.original.status}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  return (
    <AdminDataTable
      data={rows}
      columns={columns}
      getRowId={(row) => row.id}
      emptyText={emptyText}
      onRowClick={onRowClick}
      getRowActionLabel={(row) => `${row.quoteNumber} 견적 상세 보기`}
      isLoading={isLoading}
    />
  );
}

export function QuoteRequestListPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const quoteNumber = searchParams.get("quoteNumber") ?? "";
  const status = normalizeStatusParam(searchParams.get("status"));
  const [draftQuoteNumberState, setDraftQuoteNumberState] = useState({
    source: quoteNumber,
    value: quoteNumber,
  });
  const query = useAdminQuoteRequestTable({
    page,
    quoteNumber,
    status: status || null,
  });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / QUOTE_REQUEST_PAGE_SIZE));

  if (draftQuoteNumberState.source !== quoteNumber) {
    setDraftQuoteNumberState({ source: quoteNumber, value: quoteNumber });
  }

  const draftQuoteNumber =
    draftQuoteNumberState.source === quoteNumber
      ? draftQuoteNumberState.value
      : quoteNumber;

  const setDraftQuoteNumber = (value: string): void => {
    setDraftQuoteNumberState({ source: quoteNumber, value });
  };

  useEffect(() => {
    const nextQuoteNumber = draftQuoteNumber.trim();
    if (nextQuoteNumber === quoteNumber) return;

    const timeoutId = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        if (nextQuoteNumber) next.set("quoteNumber", nextQuoteNumber);
        else next.delete("quoteNumber");
        return next;
      });
    }, QUOTE_REQUEST_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draftQuoteNumber, quoteNumber, setSearchParams]);

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
    <section className="quoteRequestPanel" aria-labelledby="quote-list-title">
      <div className="quoteRequestPanelHeader">
        <div>
          <Text
            as="h2"
            textStyle="t6Bold"
            id="quote-list-title"
            className="quoteRequestPanelTitle"
          >
            견적 요청 목록
            <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
              {KR_NUMBER_FORMAT.format(total)}건
            </Text>
          </Text>
        </div>
      </div>

      <form
        className="quoteRequestToolbar"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="quoteRequestToolbarLabel" htmlFor="quote-number">
          견적번호 검색
        </label>
        <div className="quoteRequestSearchFieldSlot">
          <TextField
            className="quoteRequestSearchField"
            prefixIcon={<IconMagnifyingglassLine />}
            value={draftQuoteNumber}
            onValueChange={({ value }) => setDraftQuoteNumber(value)}
          >
            <TextFieldInput
              id="quote-number"
              name="quote-number"
              autoComplete="off"
              placeholder="견적번호를 입력하세요"
            />
          </TextField>
        </div>
      </form>

      <SegmentedControl
        className="quoteRequestStatusFilter"
        aria-label="견적 상태 필터"
        name="quote-request-status"
        value={status || "all"}
        onValueChange={(value) => setStatus(value === "all" ? "" : value)}
      >
        <SegmentedControlItem value="all">전체</SegmentedControlItem>
        {QUOTE_REQUEST_STATUS_OPTIONS.map((option) => (
          <SegmentedControlItem key={option.value} value={option.value}>
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}

      <QuoteRequestListTable
        rows={rows}
        onRowClick={(row) => navigate(`/quote-requests/show/${row.id}`)}
        isLoading={query.isFetching}
      />

      <nav
        className="quoteRequestPagination"
        aria-label="견적 요청 페이지네이션"
      >
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

export function QuoteRequestDashboardTable() {
  const navigate = useNavigate();
  const query = useAdminQuoteRequestTable({ page: 1 });

  return (
    <>
      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}
      <QuoteRequestListTable
        rows={query.data?.rows ?? []}
        onRowClick={(row) => navigate(`/quote-requests/show/${row.id}`)}
        isLoading={query.isFetching}
      />
    </>
  );
}
