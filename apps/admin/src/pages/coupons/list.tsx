import { Text } from "seed-design/ui/text";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AdminPanelHeader } from "@/components/AdminPanelHeader";
import { AdminDataTable } from "@/components/AdminDataTable";
import {
  COUPON_PAGE_SIZE,
  CouponStatusBadge,
  CouponTextBadge,
  useCouponsQuery,
  type AdminCoupon,
} from "@/features/coupons";
import "@/features/coupons/components/coupon-admin.css";

const KR_NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

function formatDiscount(coupon: AdminCoupon): string {
  if (coupon.discountType === "percentage") return `${coupon.discountValue}%`;
  return `${KR_NUMBER_FORMAT.format(coupon.discountValue)}원`;
}

const COUPON_COLUMNS: ColumnDef<AdminCoupon>[] = [
  { accessorKey: "name", header: "쿠폰명" },
  {
    accessorKey: "discountType",
    header: "할인유형",
    cell: ({ row }) => (
      <CouponTextBadge>
        {row.original.discountType === "percentage" ? "%" : "원"}
      </CouponTextBadge>
    ),
  },
  {
    id: "discountValue",
    header: "할인값",
    cell: ({ row }) => (
      <Text as="span" textStyle="t4Regular">
        {formatDiscount(row.original)}
      </Text>
    ),
  },
  { accessorKey: "expiryDate", header: "만료일" },
  {
    accessorKey: "isActive",
    header: "활성",
    cell: ({ row }) => <CouponStatusBadge active={row.original.isActive} />,
  },
];

export default function CouponList() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const query = useCouponsQuery(page);
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / COUPON_PAGE_SIZE));

  const updatePage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  return (
    <main className="couponPage">
      <AdminPageHeader
        title="쿠폰"
        description="생성된 쿠폰을 최신순으로 확인합니다."
        className="couponPageHeader"
        titleGroupClassName="couponPageTitleGroup"
        titleClassName="couponPageTitle"
        descriptionClassName="couponPageDescription"
        actions={
          <ActionButton
            type="button"
            onClick={() =>
              navigate({ pathname: "/coupons/create", search: location.search })
            }
          >
            쿠폰 생성
          </ActionButton>
        }
      />

      {query.error ? (
        <Callout tone="critical" description={query.error.message} />
      ) : null}

      <section
        className="couponPanel couponListPanel"
        aria-labelledby="coupon-list-title"
      >
        <AdminPanelHeader
          title="쿠폰 목록"
          id="coupon-list-title"
          className="couponPanelHeader"
          titleClassName="couponPanelTitle"
          count={`${KR_NUMBER_FORMAT.format(total)}건`}
        />

        <AdminDataTable
          data={rows}
          columns={COUPON_COLUMNS}
          getRowId={(row) => row.id}
          emptyText="등록된 쿠폰이 없습니다."
          onRowClick={(row) =>
            navigate({
              pathname: `/coupons/edit/${row.id}`,
              search: location.search,
            })
          }
          getRowActionLabel={(row) => `${row.name} 쿠폰 수정`}
          isLoading={query.isFetching}
        />

        <nav className="couponPagination" aria-label="쿠폰 페이지네이션">
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
    </main>
  );
}
