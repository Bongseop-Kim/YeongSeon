// ── UI 모델 ────────────────────────────────────────────────────

export interface AdminCouponUser {
  id: string;
  name: string | null;
  phone: string | null;
  birth: string | null;
  createdAt: string | null;
}

export interface AdminIssuedCouponRow {
  id: string;
  userId: string | null;
  couponId: string | null;
  userName: string | null;
  userEmail: string | null;
  status: string | null;
  issuedAt: string | null;
}

// ── 프리셋 ─────────────────────────────────────────────────────

export type PresetKey =
  | "all"
  | "new30"
  | "birthdayThisMonth"
  | "purchased"
  | "notPurchased"
  | "dormant";

export const PRESET_LABELS: Record<PresetKey, string> = {
  all: "전체 고객",
  new30: "신규 가입 (30일)",
  birthdayThisMonth: "생일 고객 (이번 달)",
  purchased: "구매 고객",
  notPurchased: "미구매 고객",
  dormant: "휴면 고객",
};

export function isActiveIssuedStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return (
    normalized === "active" ||
    normalized === "활성" ||
    normalized === "발급" ||
    normalized === "사용가능" ||
    normalized === "미사용"
  );
}
