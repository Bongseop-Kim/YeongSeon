// ── List UI model ──────────────────────────────────────────────

export interface AdminCustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// ── Detail UI model ────────────────────────────────────────────

export interface AdminCustomerDetail extends AdminCustomerListItem {
  birth: string | null;
}

// ── Show page sub-models ───────────────────────────────────────

export interface AdminCustomerOrderRow {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  totalPrice: number;
}

export interface AdminCustomerCouponRow {
  id: string;
  couponId: string;
  status: string;
  issuedAt: string;
  expiresAt: string | null;
}

// ── Constants ──────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  manager: "orange",
};
