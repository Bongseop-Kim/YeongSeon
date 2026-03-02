import type { AdminOrderListRowDTO } from "@yeongseon/shared";
import type {
  AdminCustomerListItem,
  AdminCustomerDetail,
  AdminCustomerOrderRow,
  AdminCustomerCouponRow,
} from "../types/admin-customer";

// ── 로컬 DTO ───────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  name: string | null;
  phone: string | null;
  role: string | null;
  is_active: boolean | null;
  created_at: string | null;
  birth: string | null;
}

export interface UserCouponRow {
  id: string;
  coupon_id: string | null;
  status: string | null;
  issued_at: string | null;
  expires_at: string | null;
}

// ── 매퍼 ───────────────────────────────────────────────────────

export function toAdminCustomerListItem(row: ProfileRow): AdminCustomerListItem {
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone,
    role: row.role ?? "",
    isActive: row.is_active ?? false,
    createdAt: row.created_at ?? "",
  };
}

export function toAdminCustomerDetail(row: ProfileRow): AdminCustomerDetail {
  return {
    ...toAdminCustomerListItem(row),
    birth: row.birth,
  };
}

export function toAdminCustomerOrderRow(dto: AdminOrderListRowDTO): AdminCustomerOrderRow {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.date,
    status: dto.status,
    totalPrice: dto.totalPrice,
  };
}

export function toAdminCustomerCouponRow(row: UserCouponRow): AdminCustomerCouponRow {
  return {
    id: row.id,
    couponId: row.coupon_id ?? "",
    status: row.status ?? "",
    issuedAt: row.issued_at ?? "",
    expiresAt: row.expires_at,
  };
}
