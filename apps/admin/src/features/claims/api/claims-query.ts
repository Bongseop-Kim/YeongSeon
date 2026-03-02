import { useState, useEffect, useRef } from "react";
import { useTable } from "@refinedev/antd";
import { useShow, useList, useUpdate, useInvalidate } from "@refinedev/core";
import { message } from "antd";
import type { TableProps } from "antd";
import type { AdminClaimListRowDTO, ClaimStatusLogDTO } from "@yeongseon/shared";
import {
  toAdminClaimListItem,
  toAdminClaimDetail,
  toAdminClaimStatusLogEntry,
} from "./claims-mapper";
import { updateClaimStatus } from "./claims-api";
import type {
  AdminClaimListItem,
  AdminClaimDetail,
  AdminClaimStatusLogEntry,
  AdminClaimTrackingInfo,
} from "../types/admin-claim";

// ── List ───────────────────────────────────────────────────────

export function useAdminClaimTable() {
  const { tableProps: rawTableProps, setFilters } = useTable<AdminClaimListRowDTO>({
    resource: "admin_claim_list_view",
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    syncWithLocation: true,
  });

  const tableProps = {
    ...rawTableProps,
    dataSource: (
      (rawTableProps.dataSource ?? []) as AdminClaimListRowDTO[]
    ).map(toAdminClaimListItem),
  } as TableProps<AdminClaimListItem>;

  return { tableProps, setFilters };
}

// ── Detail ────────────────────────────────────────────────────

export function useAdminClaimDetail(claimId: string | undefined) {
  const { query, result: rawClaim } = useShow<AdminClaimListRowDTO>({
    resource: "admin_claim_list_view",
    id: claimId,
    queryOptions: { enabled: !!claimId },
  });

  const claim: AdminClaimDetail | undefined = rawClaim
    ? toAdminClaimDetail(rawClaim)
    : undefined;

  return { claim, refetch: query.refetch };
}

// ── Status logs ───────────────────────────────────────────────

export function useAdminClaimStatusLogs(claimId: string | undefined) {
  const { result } = useList<ClaimStatusLogDTO>({
    resource: "admin_claim_status_log_view",
    filters: [{ field: "claimId", operator: "eq", value: claimId }],
    sorters: [{ field: "createdAt", order: "desc" }],
    queryOptions: { enabled: !!claimId },
  });

  const logs: AdminClaimStatusLogEntry[] = result.data.map(
    toAdminClaimStatusLogEntry
  );

  return { logs };
}

// ── Status update ─────────────────────────────────────────────

export function useClaimStatusUpdate(
  claimId: string | undefined,
  refetch: () => void
) {
  const invalidate = useInvalidate();
  const [isUpdating, setIsUpdating] = useState(false);

  const invalidateLogs = () =>
    invalidate({
      resource: "admin_claim_status_log_view",
      invalidates: ["list"],
    });

  const changeStatus = async (newStatus: string, memo: string) => {
    if (!claimId) return;
    setIsUpdating(true);
    try {
      await updateClaimStatus({ claimId, newStatus, memo: memo || null });
      message.success(`상태가 "${newStatus}"(으)로 변경되었습니다.`);
      refetch();
      invalidateLogs();
    } catch (err) {
      message.error(
        `상태 변경 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const rollback = async (targetStatus: string, memo: string) => {
    if (!claimId) return;
    setIsUpdating(true);
    try {
      await updateClaimStatus({
        claimId,
        newStatus: targetStatus,
        memo,
        isRollback: true,
      });
      message.success(`"${targetStatus}"(으)로 롤백되었습니다.`);
      refetch();
      invalidateLogs();
    } catch (err) {
      message.error(
        `롤백 실패: ${err instanceof Error ? err.message : "알 수 없는 오류"}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return { isUpdating, changeStatus, rollback };
}

// ── Tracking save ─────────────────────────────────────────────

export function useClaimTrackingSave() {
  const { mutate: updateClaim, mutation } = useUpdate();

  const saveTracking = (
    claimId: string,
    trackingType: "return" | "resend",
    courierCompany: string,
    trackingNumber: string
  ) => {
    const values =
      trackingType === "return"
        ? {
            return_courier_company: courierCompany || null,
            return_tracking_number: trackingNumber || null,
          }
        : {
            resend_courier_company: courierCompany || null,
            resend_tracking_number: trackingNumber || null,
          };

    const successMsg =
      trackingType === "return"
        ? "수거 배송 정보가 저장되었습니다."
        : "재발송 배송 정보가 저장되었습니다.";

    updateClaim(
      { resource: "claims", id: claimId, values },
      {
        onSuccess: () => message.success(successMsg),
        onError: () =>
          message.error(
            trackingType === "return"
              ? "수거 배송 정보 저장에 실패했습니다."
              : "재발송 배송 정보 저장에 실패했습니다."
          ),
      }
    );
  };

  return { saveTracking, isPending: mutation.isPending };
}

// ── Tracking local state ──────────────────────────────────────

export function useClaimTrackingState(
  tracking: AdminClaimTrackingInfo | null | undefined,
  claimId: string | undefined
) {
  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const prevClaimIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!claimId) return;
    if (claimId === prevClaimIdRef.current) return;
    prevClaimIdRef.current = claimId;
    setCourierCompany(tracking?.courierCompany ?? "");
    setTrackingNumber(tracking?.trackingNumber ?? "");
  }, [tracking, claimId]);

  return {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
  };
}
