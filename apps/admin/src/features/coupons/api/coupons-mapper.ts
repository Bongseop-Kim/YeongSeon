import type {
  AdminCouponUser,
  AdminIssuedCouponRow,
} from "@/features/coupons/types/admin-coupon";

// ── 로컬 DTO ───────────────────────────────────────────────────

interface ProfileRow {
  id: string;
  name: string | null;
  phone: string | null;
  birth: string | null;
  created_at: string | null;
}

interface IssuedCouponViewRow {
  id: string | null | undefined;
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

export function toAdminIssuedCouponRow(
  row: IssuedCouponViewRow,
): AdminIssuedCouponRow {
  return {
    id:
      row.id ??
      (row.userId != null && row.couponId != null
        ? `${row.userId}:${row.couponId}`
        : undefined),
    userId: row.userId ?? null,
    couponId: row.couponId ?? null,
    userName: row.userName ?? null,
    userEmail: row.userEmail ?? null,
    status: row.status ?? null,
    issuedAt: row.issuedAt ?? null,
  };
}
