// ── List UI model ──────────────────────────────────────────────

export interface AdminCustomerListItem {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  tokenBalance?: number;
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

export interface AdminCustomerTokenBalanceRow {
  userId: string;
  balance: number;
}

export interface AdminCustomerTokenRow {
  id: string;
  amount: number;
  type: string;
  aiModel: string | null;
  requestType: string | null;
  description: string | null;
  createdAt: string;
  workId: string | null;
}

export interface AdminTokenManageForm {
  mode: "grant" | "deduct";
  amount: number;
  description: string;
}

// ── Constants ──────────────────────────────────────────────────

export const ROLE_COLORS: Record<string, string> = {
  admin: "red",
  manager: "orange",
};
