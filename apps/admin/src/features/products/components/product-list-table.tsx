import { Text } from "seed-design/ui/text";
import { useMemo } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminDataTable } from "@/components/AdminDataTable";
import {
  AdminFilterField,
  AdminFilterSelect,
} from "@/components/AdminFilterControls";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PRODUCT_PAGE_SIZE,
  useAdminProductTable,
} from "@/features/products/api/products-query";
import { CATEGORY_FILTER_OPTIONS } from "@/features/products/types/admin-product";
import type { AdminProductListItem } from "@/features/products/types/admin-product";
import "./products.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function parsePageParam(value: string | null): number {
  return Math.max(1, Number(value ?? "1") || 1);
}

function formatPrice(value: number): string {
  return `${KR_NUMBER_FORMAT.format(value)}원`;
}

function renderStockBadge(record: AdminProductListItem) {
  if (record.optionCount > 0) {
    const label = `${record.optionCount}개 옵션`;
    if (record.optionStockTotal === null) {
      return <StatusBadge tone="neutral">무제한 · {label}</StatusBadge>;
    }
    if (record.optionStockTotal === 0) {
      return <StatusBadge tone="critical">품절 · {label}</StatusBadge>;
    }
    return (
      <StatusBadge tone="positive">
        {KR_NUMBER_FORMAT.format(record.optionStockTotal)}개 · {label}
      </StatusBadge>
    );
  }

  if (record.stock === null)
    return <StatusBadge tone="neutral">무제한</StatusBadge>;
  if (record.stock === 0)
    return <StatusBadge tone="critical">품절</StatusBadge>;
  return (
    <StatusBadge tone="positive">
      {KR_NUMBER_FORMAT.format(record.stock)}개
    </StatusBadge>
  );
}

export function ProductListTable() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get("page"));
  const category = searchParams.get("category") ?? "";
  const query = useAdminProductTable({ page, category: category || null });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));

  const columns = useMemo<ColumnDef<AdminProductListItem>[]>(
    () => [
      {
        accessorKey: "image",
        header: "이미지",
        cell: ({ row }) =>
          row.original.image ? (
            <img
              className="productThumb"
              src={row.original.image}
              alt=""
              loading="lazy"
            />
          ) : (
            <Text
              as="span"
              textStyle="t4Regular"
              className="productImageFallback"
            >
              이미지 없음
            </Text>
          ),
      },
      {
        accessorKey: "code",
        header: "코드",
        cell: ({ row }) => row.original.code ?? "-",
      },
      { accessorKey: "name", header: "상품명" },
      { accessorKey: "category", header: "카테고리" },
      { accessorKey: "color", header: "색상" },
      { accessorKey: "material", header: "소재" },
      {
        accessorKey: "price",
        header: "가격",
        cell: ({ row }) => formatPrice(row.original.price),
      },
      {
        id: "stock",
        header: "재고",
        cell: ({ row }) => renderStockBadge(row.original),
      },
    ],
    [],
  );

  const updatePage = (nextPage: number): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  const updateCategory = (nextCategory: string): void => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", "1");
      if (nextCategory) next.set("category", nextCategory);
      else next.delete("category");
      return next;
    });
  };

  return (
    <section className="productPanel" aria-labelledby="product-list-title">
      <div className="productPanelHeader">
        <div>
          <Text
            as="h2"
            textStyle="t6Bold"
            id="product-list-title"
            className="productPanelTitle"
          >
            상품 목록
            <Text as="span" textStyle="t2Bold" className="adminPanelCountBadge">
              {KR_NUMBER_FORMAT.format(total)}건
            </Text>
          </Text>
        </div>
      </div>

      <form
        className="productToolbar"
        onSubmit={(event) => event.preventDefault()}
      >
        <AdminFilterField label="카테고리">
          <AdminFilterSelect
            name="product-category"
            value={category}
            onChange={(event) => updateCategory(event.target.value)}
          >
            {CATEGORY_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </AdminFilterSelect>
        </AdminFilterField>
      </form>

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}
      <AdminDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => String(row.id)}
        emptyText="상품이 없습니다."
        onRowClick={(row) =>
          navigate({
            pathname: `/products/edit/${row.id}`,
            search: location.search,
          })
        }
        getRowActionLabel={(row) => `${row.name} 상품 수정`}
        minWidth={920}
        isLoading={query.isFetching}
      />
      <nav className="productPagination" aria-label="상품 페이지네이션">
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
