import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import type { ColumnDef } from "@tanstack/react-table";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { ORDER_STATUS_OPTIONS } from "@yeongseon/shared";
import type { OrderType } from "@yeongseon/shared";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminDataTable } from "@/components/AdminDataTable";
import {
  AdminFilterField,
  AdminFilterSelect,
  AdminFilterTextField,
} from "@/components/AdminFilterControls";
import {
  ORDER_PAGE_SIZE,
  useAdminOrderTable,
} from "@/features/orders/api/orders-query";
import type { AdminOrderListItem } from "@/features/orders/types/admin-order";
import { formatDateTime } from "@/utils/format-date-time";
import { OrderStatusBadge } from "./order-status-badge";

interface DomainOrderTableProps {
  orderType: OrderType;
}

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function parsePageParam(value: string | null): number {
  return Math.max(1, Number(value ?? "1") || 1);
}

function formatPrice(value: number): string {
  return `${KR_NUMBER_FORMAT.format(value)}원`;
}

function nullableValue(value: string | number | null): string {
  return value == null || value === "" ? "-" : String(value);
}

type NullableColumnKey =
  | "fabricType"
  | "designType"
  | "itemQuantity"
  | "sampleType"
  | "reformSummary";

function nullableColumn(
  accessorKey: NullableColumnKey,
  header: string,
): ColumnDef<AdminOrderListItem> {
  return {
    accessorKey,
    header,
    cell: ({ row }) => nullableValue(row.original[accessorKey]),
  };
}

function getDefaultDateFrom(): string {
  return dayjs().subtract(6, "day").format("YYYY-MM-DD");
}

function getDefaultDateTo(): string {
  return dayjs().format("YYYY-MM-DD");
}

function getColumnsForType(
  orderType: OrderType,
): ColumnDef<AdminOrderListItem>[] {
  const common: ColumnDef<AdminOrderListItem>[] = [
    { accessorKey: "orderNumber", header: "주문번호" },
    {
      accessorKey: "createdAt",
      header: "주문일",
      cell: ({ row }) => formatDateTime(row.original.createdAt),
    },
    { accessorKey: "customerName", header: "고객명" },
  ];

  const tail: ColumnDef<AdminOrderListItem>[] = [
    {
      accessorKey: "totalPrice",
      header: "결제금액",
      cell: ({ row }) => formatPrice(row.original.totalPrice),
    },
    {
      accessorKey: "status",
      header: "상태",
      cell: ({ row }) => (
        <OrderStatusBadge>{row.original.status}</OrderStatusBadge>
      ),
    },
  ];

  if (orderType === "sale" || orderType === "token") {
    return [
      ...common,
      {
        accessorKey: "customerEmail",
        header: "이메일",
        cell: ({ row }) => row.original.customerEmail ?? "-",
      },
      ...tail,
    ];
  }

  if (orderType === "custom") {
    return [
      ...common,
      nullableColumn("fabricType", "원단유형"),
      nullableColumn("designType", "디자인유형"),
      nullableColumn("itemQuantity", "수량"),
      ...tail,
    ];
  }

  if (orderType === "sample") {
    return [
      ...common,
      nullableColumn("sampleType", "샘플유형"),
      nullableColumn("itemQuantity", "수량"),
      ...tail,
    ];
  }

  return [...common, nullableColumn("reformSummary", "수선요약"), ...tail];
}

export function DomainOrderTable({ orderType }: DomainOrderTableProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const dateFrom = searchParams.get("dateFrom") ?? getDefaultDateFrom();
  const dateTo = searchParams.get("dateTo") ?? getDefaultDateTo();
  const orderNumber = searchParams.get("orderNumber") ?? "";
  const status = searchParams.get("status") ?? "";
  const query = useAdminOrderTable({
    orderType,
    page,
    dateFrom,
    dateTo,
    orderNumber: orderNumber || null,
    status: status || null,
  });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  const columns = useMemo(() => getColumnsForType(orderType), [orderType]);

  const updateParams = (patch: Record<string, string>): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value);
        else next.delete(key);
      });
      next.set("page", "1");
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
    <section className="orderPanel" aria-labelledby="order-list-title">
      <div className="orderPanelHeader">
        <div className="orderPanelTitleGroup">
          <Text
            as="h2"
            textStyle="t6Bold"
            id="order-list-title"
            className="orderPanelTitle"
          >
            주문 목록
            <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
              {KR_NUMBER_FORMAT.format(total)}건
            </Text>
          </Text>
        </div>
      </div>

      <form
        className="orderToolbar"
        onSubmit={(event) => event.preventDefault()}
      >
        <AdminFilterField className="adminFilterFieldWide">
          <AdminFilterTextField
            label="주문번호"
            prefixIcon={<IconMagnifyingglassLine />}
            value={orderNumber}
            onValueChange={({ value }) =>
              updateParams({ orderNumber: value.trim() })
            }
            inputProps={{
              name: "order-number",
              autoComplete: "off",
              placeholder: "주문번호 검색",
            }}
          />
        </AdminFilterField>
        <AdminFilterField>
          <AdminFilterSelect
            label="상태"
            name="order-status"
            value={status}
            onChange={(event) => updateParams({ status: event.target.value })}
          >
            {ORDER_STATUS_OPTIONS[orderType].map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminFilterSelect>
        </AdminFilterField>
        <AdminFilterField>
          <AdminFilterTextField
            label="시작일"
            value={dateFrom}
            onValueChange={({ value }) => updateParams({ dateFrom: value })}
            inputProps={{
              name: "date-from",
              type: "date",
            }}
          />
        </AdminFilterField>
        <AdminFilterField>
          <AdminFilterTextField
            label="종료일"
            value={dateTo}
            onValueChange={({ value }) => updateParams({ dateTo: value })}
            inputProps={{
              name: "date-to",
              type: "date",
            }}
          />
        </AdminFilterField>
      </form>

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="주문이 없습니다."
        onRowClick={(row) => navigate(`/orders/show/${row.id}`)}
        getRowActionLabel={(row) => `${row.orderNumber} 주문 상세 보기`}
        minWidth={980}
        isLoading={query.isFetching}
      />
      <nav className="orderPagination" aria-label="주문 페이지네이션">
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
