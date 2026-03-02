import { useCallback, useEffect, useMemo, useState } from "react";
import { useList, useInvalidate } from "@refinedev/core";
import { message } from "antd";
import dayjs from "dayjs";
import {
  fetchCustomers,
  fetchIssuedUserIds,
  fetchPurchasedUserIds,
  fetchCompletedOrderDates,
  bulkIssueCoupons,
  revokeCouponsByIds,
  revokeCouponsByUserIds,
} from "./coupons-api";
import { toAdminIssuedCouponRow } from "./coupons-mapper";
import type { AdminCouponUser, AdminIssuedCouponRow, PresetKey } from "../types/admin-coupon";

// ── 헬퍼 ───────────────────────────────────────────────────────

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

// ── 발급 내역 조회 ──────────────────────────────────────────────

export function useIssuedCoupons(couponId: string | undefined) {
  const { result } = useList<AdminIssuedCouponRow>({
    resource: "admin_user_coupon_view",
    filters: [{ field: "couponId", operator: "eq", value: couponId }],
    queryOptions: { enabled: !!couponId },
  });

  const rows: AdminIssuedCouponRow[] = (result.data ?? []).map(toAdminIssuedCouponRow);

  return { rows };
}

// ── 프리셋별 고객 필터링 ────────────────────────────────────────

export function usePresetCustomers(
  couponId: string | undefined,
  isOpen: boolean,
  preset: PresetKey,
  excludeIssued: boolean
) {
  const [users, setUsers] = useState<AdminCouponUser[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!couponId) return;

    setLoading(true);
    setUsers([]);

    try {
      const [allCustomers, alreadyIssued] = await Promise.all([
        fetchCustomers(),
        excludeIssued ? fetchIssuedUserIds(couponId) : Promise.resolve(new Set<string>()),
      ]);

      const now = dayjs();
      const start30d = now.subtract(30, "day");
      const start90d = now.subtract(90, "day");

      let presetUsers = allCustomers;

      switch (preset) {
        case "new30":
          presetUsers = allCustomers.filter(
            (user) => user.createdAt && dayjs(user.createdAt).isAfter(start30d)
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
          const purchasedUserIds = await fetchPurchasedUserIds();
          presetUsers = allCustomers.filter((user) => purchasedUserIds.has(user.id));
          break;
        }

        case "notPurchased": {
          const purchasedUserIds = await fetchPurchasedUserIds();
          presetUsers = allCustomers.filter((user) => !purchasedUserIds.has(user.id));
          break;
        }

        case "dormant": {
          const completedOrders = await fetchCompletedOrderDates();
          const latestOrderByUser = new Map<string, dayjs.Dayjs>();

          for (const row of completedOrders) {
            const orderDate = dayjs(row.created_at);
            const prev = latestOrderByUser.get(row.user_id);
            if (!prev || orderDate.isAfter(prev)) {
              latestOrderByUser.set(row.user_id, orderDate);
            }
          }

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

      if (excludeIssued) {
        presetUsers = presetUsers.filter((user) => !alreadyIssued.has(user.id));
      }

      setUsers(presetUsers);
    } catch (err) {
      console.error(err);
      message.error("대상 고객 조회에 실패했습니다.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [couponId, preset, excludeIssued]);

  useEffect(() => {
    if (!isOpen || !couponId) return;
    load();
  }, [isOpen, load, couponId]);

  return { users, loading };
}

// ── 키워드 필터 ────────────────────────────────────────────────

export function useFilteredUsers(users: AdminCouponUser[], keyword: string) {
  return useMemo(() => {
    if (!keyword.trim()) return users;
    const q = keyword.trim().toLowerCase();
    return users.filter((user) => (user.name ?? "").toLowerCase().includes(q));
  }, [users, keyword]);
}

// ── 일괄 발급 ──────────────────────────────────────────────────

export function useCouponIssue(couponId: string | undefined) {
  const invalidate = useInvalidate();
  const [issuing, setIssuing] = useState(false);

  const issue = async (userIds: string[]): Promise<boolean> => {
    if (!couponId || !userIds.length) return false;

    setIssuing(true);
    try {
      await bulkIssueCoupons(couponId, userIds);
      message.success(`${userIds.length}명 발급 완료`);
      await invalidate({ resource: "admin_user_coupon_view", invalidates: ["list"] });
      return true;
    } catch (err) {
      console.error(err);
      message.error("일괄 발급에 실패했습니다.");
      return false;
    } finally {
      setIssuing(false);
    }
  };

  return { issue, issuing };
}

// ── 회수 ───────────────────────────────────────────────────────

export function useCouponRevoke(couponId: string | undefined) {
  const invalidate = useInvalidate();
  const [revoking, setRevoking] = useState(false);

  const revoke = async (rows: AdminIssuedCouponRow[]): Promise<boolean> => {
    const targetRows = rows.filter((row) => row && isActiveIssuedStatus(row.status));

    if (!targetRows.length) {
      message.warning("회수할 항목을 선택해주세요.");
      return false;
    }

    const userCouponIds = Array.from(
      new Set(targetRows.map((row) => row.id).filter((v): v is string => !!v))
    );
    const userIds = Array.from(
      new Set(targetRows.map((row) => row.userId).filter((v): v is string => !!v))
    );

    setRevoking(true);
    try {
      if (userCouponIds.length > 0) {
        await revokeCouponsByIds(userCouponIds);
      } else if (couponId && userIds.length > 0) {
        await revokeCouponsByUserIds(couponId, userIds);
      } else {
        throw new Error("회수 대상 식별자(id/userId)가 없습니다.");
      }

      message.success(`${targetRows.length}건 회수 완료`);
      await invalidate({ resource: "admin_user_coupon_view", invalidates: ["list"] });
      return true;
    } catch (err) {
      console.error(err);
      const detail =
        err instanceof Error ? err.message : "";
      message.error(`일괄 회수에 실패했습니다.${detail ? ` (${detail})` : ""}`);
      return false;
    } finally {
      setRevoking(false);
    }
  };

  return { revoke, revoking };
}