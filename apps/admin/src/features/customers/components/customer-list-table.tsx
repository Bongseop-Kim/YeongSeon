import { Text } from "seed-design/ui/text";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { IconMagnifyingglassLine } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  CUSTOMER_PAGE_SIZE,
  useAdminCustomerTable,
  useCustomerTokenBalancesQuery,
} from "@/features/customers/api/customers-query";
import type { AdminCustomerListItem } from "@/features/customers/types/admin-customer";
import "./customers.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");
const CUSTOMER_SEARCH_DEBOUNCE_MS = 300;

function parsePageParam(value: string | null): number {
  return Math.max(1, Number(value ?? "1") || 1);
}

export function CustomerListTable() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const name = searchParams.get("name") ?? "";
  const [draftName, setDraftName] = useState(name);
  const query = useAdminCustomerTable({ page, name });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CUSTOMER_PAGE_SIZE));
  const userIds = rows.map((customer) => customer.id);
  const { data: balances, isLoading: isBalancesLoading } =
    useCustomerTokenBalancesQuery(userIds);
  const tokenBalanceMap = useMemo(
    () => new Map((balances ?? []).map((row) => [row.userId, row.balance])),
    [balances],
  );
  const formatTokenBalance = useCallback(
    (customerId: string): string => {
      if (isBalancesLoading) return "-";
      return KR_NUMBER_FORMAT.format(tokenBalanceMap.get(customerId) ?? 0);
    },
    [isBalancesLoading, tokenBalanceMap],
  );

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  useEffect(() => {
    const nextName = draftName.trim();
    if (nextName === name) return;

    const timeoutId = window.setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", "1");
        if (nextName) next.set("name", nextName);
        else next.delete("name");
        return next;
      });
    }, CUSTOMER_SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [draftName, name, setSearchParams]);

  const columns = useMemo<ColumnDef<AdminCustomerListItem>[]>(
    () => [
      { accessorKey: "name", header: "이름" },
      {
        accessorKey: "phone",
        header: "전화번호",
        cell: ({ row }) => row.original.phone ?? "-",
      },
      {
        id: "tokenBalance",
        header: "토큰 잔액",
        cell: ({ row }) => formatTokenBalance(row.original.id),
      },
      {
        accessorKey: "role",
        header: "역할",
        cell: ({ row }) => <StatusBadge>{row.original.role}</StatusBadge>,
      },
      {
        accessorKey: "isActive",
        header: "활성",
        cell: ({ row }) => (
          <StatusBadge tone={row.original.isActive ? "positive" : "neutral"}>
            {row.original.isActive ? "활성" : "비활성"}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "가입일",
        cell: ({ row }) => row.original.createdAt.slice(0, 10),
      },
    ],
    [formatTokenBalance],
  );

  const updatePage = (nextPage: number): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  return (
    <section className="customerPanel" aria-labelledby="customer-list-title">
      <div className="customerPanelHeader">
        <div>
          <Text
            as="h2"
            textStyle="t6Bold"
            id="customer-list-title"
            className="customerPanelTitle"
          >
            고객 목록
            <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
              {KR_NUMBER_FORMAT.format(total)}건
            </Text>
          </Text>
          {query.isFetching ? (
            <Text as="p" textStyle="t4Regular" className="customerMutedText">
              불러오는 중…
            </Text>
          ) : null}
        </div>
      </div>

      <form
        className="customerToolbar"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <Text as="span" textStyle="t3Bold" className="customerSearchLabel">
          검색
        </Text>
        <div className="customerSearchControls">
          <div className="customerSearchFieldSlot">
            <TextField
              className="customerSearchField"
              prefixIcon={<IconMagnifyingglassLine />}
              value={draftName}
              onValueChange={({ value }) => setDraftName(value)}
            >
              <TextFieldInput
                name="customer-name"
                aria-label="고객 이름 검색"
                autoComplete="off"
                placeholder="고객 이름을 입력하세요"
              />
            </TextField>
          </div>
        </div>
      </form>

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        emptyText="고객이 없습니다."
        onRowClick={(row) => navigate(`/customers/show/${row.id}`)}
        getRowActionLabel={(row) => `${row.name} 고객 상세 보기`}
      />
      <nav className="customerPagination" aria-label="고객 페이지네이션">
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
