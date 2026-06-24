import type { AdminOrderListRowDTO, DesignTokenRow } from "@yeongseon/shared";
import type {
  AdminCustomerListItem,
  AdminCustomerDetail,
  AdminCustomerOrderRow,
  AdminCustomerCouponRow,
  AdminCustomerTokenRow,
} from "@/features/customers/types/admin-customer";

export type { DesignTokenRow };

// ── 로컬 DTO ───────────────────────────────────────────────────

export interface ProfileRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
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

export function toAdminCustomerListItem(
  row: ProfileRow,
): AdminCustomerListItem {
  return {
    id: row.id,
    name: row.name ?? "",
    phone: row.phone,
    email: row.email,
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

export function toAdminCustomerOrderRow(
  dto: AdminOrderListRowDTO,
): AdminCustomerOrderRow {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    date: dto.date,
    status: dto.status,
    totalPrice: dto.totalPrice,
  };
}

export function toAdminCustomerCouponRow(
  row: UserCouponRow,
): AdminCustomerCouponRow {
  return {
    id: row.id,
    couponId: row.coupon_id ?? "",
    status: row.status ?? "",
    issuedAt: row.issued_at ?? "",
    expiresAt: row.expires_at,
  };
}

export function toAdminCustomerTokenRow(
  row: DesignTokenRow,
): AdminCustomerTokenRow {
  return {
    id: row.id,
    amount: row.amount,
    type: row.type,
    aiModel: row.ai_model,
    requestType: row.request_type,
    description: row.description,
    createdAt: row.created_at,
    workId: row.work_id,
  };
}
