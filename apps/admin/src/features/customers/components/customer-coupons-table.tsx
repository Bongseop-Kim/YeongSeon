import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/components/AdminDataTable";
import { StatusBadge } from "@/components/StatusBadge";
import type { AdminCustomerCouponRow } from "@/features/customers/types/admin-customer";

interface Props {
  coupons: AdminCustomerCouponRow[];
}

export function CustomerCouponsTable({ coupons }: Props) {
  const navigate = useNavigate();
  const columns = useMemo<ColumnDef<AdminCustomerCouponRow>[]>(
    () => [
      { accessorKey: "couponId", header: "쿠폰 ID" },
      {
        accessorKey: "status",
        header: "상태",
        cell: ({ row }) => <StatusBadge>{row.original.status}</StatusBadge>,
      },
      {
        accessorKey: "issuedAt",
        header: "발급일",
        cell: ({ row }) => row.original.issuedAt.slice(0, 10),
      },
      {
        accessorKey: "expiresAt",
        header: "만료일",
        cell: ({ row }) => row.original.expiresAt?.slice(0, 10) ?? "-",
      },
    ],
    [],
  );

  const openCouponEditor = (coupon: AdminCustomerCouponRow): void => {
    if (coupon.couponId) navigate(`/coupons/edit/${coupon.couponId}`);
  };

  return (
    <AdminDataTable
      data={coupons}
      columns={columns}
      getRowId={(row) => row.id}
      emptyText="보유 쿠폰이 없습니다."
      onRowClick={openCouponEditor}
      getRowActionLabel={(row) => `${row.couponId} 쿠폰 수정`}
    />
  );
}
