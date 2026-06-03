import dayjs from "dayjs";
import { supabase } from "@/lib/supabase";
import {
  toAdminCoupon,
  toCouponMutationDto,
  toCouponUser,
  toIssuedCouponRow,
} from "@/features/coupons/api/coupons-mapper";
import type {
  AdminCoupon,
  AdminCouponFormValues,
  AdminCouponListResult,
  CouponPresetKey,
  CouponUser,
  IssuedCouponRow,
} from "@/features/coupons/types/admin-coupon";

export async function getCoupons(params: {
  page: number;
  pageSize: number;
}): Promise<AdminCouponListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  const { data, error, count } = await supabase
    .from("coupons")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    rows: (data ?? []).map(toAdminCoupon),
    total: count ?? 0,
  };
}

export async function getCoupon(id: string): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return toAdminCoupon(data);
}

export async function createCoupon(
  values: AdminCouponFormValues,
): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .insert(toCouponMutationDto(values))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toAdminCoupon(data);
}

export async function updateCoupon(params: {
  id: string;
  values: AdminCouponFormValues;
}): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .update(toCouponMutationDto(params.values))
    .eq("id", params.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return toAdminCoupon(data);
}

export async function getIssuedCoupons(
  couponId: string,
): Promise<IssuedCouponRow[]> {
  const { data, error } = await supabase
    .from("admin_user_coupon_view")
    .select(
      "id,userId,couponId,status,issuedAt,expiresAt,usedAt,userName,userPhone,userEmail",
    )
    .eq("couponId", couponId);

  if (error) throw new Error(error.message);
  return (data ?? []).map(toIssuedCouponRow);
}

async function getCustomerUsers(): Promise<CouponUser[]> {
  const pageSize = 1000;
  const users: CouponUser[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, phone, birth, created_at")
      .eq("role", "customer")
      .eq("is_active", true)
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);

    const rows = (data ?? []).map(toCouponUser);
    users.push(...rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return users;
}

function toUserIdSet(
  rows: ReadonlyArray<{ user_id: unknown }> | null,
): Set<string> {
  const userIds = (rows ?? [])
    .map((row) => (typeof row.user_id === "string" ? row.user_id : null))
    .filter((value): value is string => value != null);

  return new Set(userIds);
}

async function getPurchasedUserIds(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("orders")
    .select("user_id")
    .eq("status", "완료");

  if (error) throw new Error(error.message);

  return toUserIdSet(data);
}

async function getAlreadyIssuedUserIds(couponId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("user_coupons")
    .select("user_id")
    .eq("coupon_id", couponId);

  if (error) throw new Error(error.message);

  return toUserIdSet(data);
}

async function getLatestCompletedOrderByUser(): Promise<
  Map<string, dayjs.Dayjs>
> {
  const { data, error } = await supabase
    .from("orders")
    .select("user_id, created_at")
    .eq("status", "완료");

  if (error) throw new Error(error.message);

  const latestOrderByUser = new Map<string, dayjs.Dayjs>();

  for (const row of data ?? []) {
    if (typeof row.user_id !== "string" || typeof row.created_at !== "string") {
      continue;
    }

    const orderDate = dayjs(row.created_at);
    const previous = latestOrderByUser.get(row.user_id);

    if (!previous || orderDate.isAfter(previous)) {
      latestOrderByUser.set(row.user_id, orderDate);
    }
  }

  return latestOrderByUser;
}

export async function getPresetCouponUsers(params: {
  couponId: string;
  preset: CouponPresetKey;
  excludeIssuedUsers: boolean;
}): Promise<CouponUser[]> {
  const [allCustomers, alreadyIssued] = await Promise.all([
    getCustomerUsers(),
    params.excludeIssuedUsers
      ? getAlreadyIssuedUserIds(params.couponId)
      : Promise.resolve(new Set<string>()),
  ]);

  const now = dayjs();
  const start30d = now.subtract(30, "day");
  const start90d = now.subtract(90, "day");

  let presetUsers = allCustomers;

  switch (params.preset) {
    case "new30":
      presetUsers = allCustomers.filter(
        (user) => user.createdAt && dayjs(user.createdAt).isAfter(start30d),
      );
      break;
    case "birthdayThisMonth": {
      const targetMonth = now.month();
      presetUsers = allCustomers.filter((user) => {
        if (!user.birth) return false;
        const birthDate = dayjs(user.birth);
        return birthDate.isValid() && birthDate.month() === targetMonth;
      });
      break;
    }
    case "purchased": {
      const purchasedUserIds = await getPurchasedUserIds();
      presetUsers = allCustomers.filter((user) =>
        purchasedUserIds.has(user.id),
      );
      break;
    }
    case "notPurchased": {
      const purchasedUserIds = await getPurchasedUserIds();
      presetUsers = allCustomers.filter(
        (user) => !purchasedUserIds.has(user.id),
      );
      break;
    }
    case "dormant": {
      const latestOrderByUser = await getLatestCompletedOrderByUser();
      presetUsers = allCustomers.filter((user) => {
        const latest = latestOrderByUser.get(user.id);
        return !!latest && latest.isBefore(start90d);
      });
      break;
    }
    case "all":
    default:
      break;
  }

  return presetUsers.filter((user) => !alreadyIssued.has(user.id));
}

export async function issueCoupons(params: {
  couponId: string;
  userIds: string[];
}): Promise<void> {
  const { error } = await supabase.rpc("admin_bulk_issue_coupons", {
    p_coupon_id: params.couponId,
    p_user_ids: params.userIds,
  });

  if (error) throw new Error(error.message);
}

export async function revokeIssuedCoupons(params: {
  couponId: string;
  rows: IssuedCouponRow[];
}): Promise<void> {
  const activeRows = params.rows.filter((row) =>
    isActiveIssuedStatus(row.status),
  );
  const idsToRevoke = Array.from(
    new Set(activeRows.map((row) => row.id).filter((id) => id.length > 0)),
  );
  const userIdsToRevoke = Array.from(
    new Set(
      activeRows
        .filter((row) => !row.id)
        .map((row) => row.userId)
        .filter((value): value is string => value != null),
    ),
  );

  if (idsToRevoke.length === 0 && userIdsToRevoke.length === 0) {
    throw new Error("회수 대상 식별자(id/userId)가 없습니다.");
  }

  if (idsToRevoke.length > 0) {
    const { error } = await supabase.rpc("admin_revoke_coupons_by_ids", {
      p_ids: idsToRevoke,
    });
    if (error) throw new Error(error.message);
  }

  if (userIdsToRevoke.length > 0) {
    const { error } = await supabase.rpc("admin_revoke_coupons_by_user_ids", {
      p_coupon_id: params.couponId,
      p_user_ids: userIdsToRevoke,
    });
    if (error) throw new Error(error.message);
  }
}

export function isActiveIssuedStatus(status?: string | null): boolean {
  const normalized = (status ?? "").trim().toLowerCase();
  return (
    normalized === "active" ||
    normalized === "활성" ||
    normalized === "발급" ||
    normalized === "사용가능" ||
    normalized === "미사용"
  );
}
