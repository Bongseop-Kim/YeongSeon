import type { AdminCouponUser, AdminIssuedCouponRow } from "../types/admin-coupon";

// ── 로컬 DTO ───────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  name: string | null;
  phone: string | null;
  birth: string | null;
  created_at: string | null;
}

interface IssuedCouponViewRow {
  id: string | null;
  userId: string | null;
  couponId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: string | null;
  issuedAt: string | null;
}

// ── 매퍼 ───────────────────────────────────────────────────────

export function toAdminCouponUser(row: ProfileRow): AdminCouponUser {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    birth: row.birth,
    createdAt: row.created_at,
  };
}

export function toAdminIssuedCouponRow(row: IssuedCouponViewRow): AdminIssuedCouponRow {
  return {
    id: row.id ?? "",
    userId: row.userId ?? null,
    couponId: row.couponId ?? null,
    userName: row.userName ?? null,
    userEmail: row.userEmail ?? null,
    status: row.status ?? null,
    issuedAt: row.issuedAt ?? null,
  };
}
