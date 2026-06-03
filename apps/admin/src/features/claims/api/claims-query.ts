import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminClaimDetail,
  getAdminClaims,
  getAdminClaimStatusLogs,
  notifyClaim,
  updateClaimStatus,
  updateClaimTracking,
} from "@/features/claims/api/claims-api";
import type { AdminClaimTrackingInfo } from "@/features/claims/types/admin-claim";

export const CLAIM_PAGE_SIZE = 20;

const CLAIM_LIST_KEY = ["claims", "list"] as const;
const CLAIM_DETAIL_KEY = ["claims", "detail"] as const;
const CLAIM_STATUS_LOGS_KEY = ["claims", "status-logs"] as const;

export function useAdminClaimTable(params: {
  page: number;
  status?: string | null;
  type?: string | null;
}) {
  return useQuery({
    queryKey: [
      ...CLAIM_LIST_KEY,
      params.page,
      params.status ?? null,
      params.type ?? null,
    ],
    queryFn: () =>
      getAdminClaims({
        page: params.page,
        pageSize: CLAIM_PAGE_SIZE,
        status: params.status ?? null,
        type: params.type ?? null,
      }),
  });
}

export function useAdminClaimDetail(claimId: string | undefined) {
  const query = useQuery({
    queryKey: [...CLAIM_DETAIL_KEY, claimId],
    queryFn: () => getAdminClaimDetail(claimId ?? ""),
    enabled: Boolean(claimId),
  });

  return { claim: query.data, ...query };
}

export function useAdminClaimStatusLogs(claimId: string | undefined) {
  return useQuery({
    queryKey: [...CLAIM_STATUS_LOGS_KEY, claimId],
    queryFn: () => getAdminClaimStatusLogs(claimId ?? ""),
    enabled: Boolean(claimId),
  });
}

export function useClaimStatusUpdate(claimId: string | undefined) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notificationWarning, setNotificationWarning] = useState<string | null>(
    null,
  );
  const mutation = useMutation({
    mutationFn: (params: {
      newStatus: string;
      memo: string;
      isRollback?: boolean;
    }) => {
      if (!claimId) throw new Error("클레임 정보를 찾을 수 없습니다.");
      return updateClaimStatus({
        claimId,
        newStatus: params.newStatus,
        memo: params.memo || null,
        isRollback: params.isRollback,
      });
    },
    onMutate: () => {
      setSuccessMessage(null);
      setNotificationWarning(null);
    },
    onSuccess: async (_, variables) => {
      setSuccessMessage(
        variables.isRollback
          ? `"${variables.newStatus}"(으)로 롤백되었습니다.`
          : `상태가 "${variables.newStatus}"(으)로 변경되었습니다.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAIM_LIST_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...CLAIM_DETAIL_KEY, claimId],
        }),
        queryClient.invalidateQueries({
          queryKey: [...CLAIM_STATUS_LOGS_KEY, claimId],
        }),
      ]);

      if (!variables.isRollback && claimId) {
        void notifyClaim(claimId).catch((err) => {
          console.warn(
            "[notify-claim] 발송 실패 (클레임 처리에 영향 없음)",
            err,
          );
          setNotificationWarning(
            "상태는 변경됐지만 고객 알림 발송 확인에 실패했습니다.",
          );
        });
      }
    },
  });

  const changeStatus = async (
    newStatus: string,
    memo: string,
  ): Promise<boolean> => {
    try {
      await mutation.mutateAsync({ newStatus, memo });
      return true;
    } catch {
      return false;
    }
  };

  const rollback = async (
    targetStatus: string,
    memo: string,
  ): Promise<boolean> => {
    try {
      await mutation.mutateAsync({
        newStatus: targetStatus,
        memo,
        isRollback: true,
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    isUpdating: mutation.isPending,
    error: mutation.error,
    successMessage,
    notificationWarning,
    changeStatus,
    rollback,
  };
}

export function useClaimTrackingSave(claimId: string | undefined) {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (params: {
      trackingType: "return" | "resend";
      courierCompany: string;
      trackingNumber: string;
    }) => {
      if (!claimId) throw new Error("클레임 정보를 찾을 수 없습니다.");
      return updateClaimTracking({ claimId, ...params });
    },
    onMutate: () => {
      setSuccessMessage(null);
    },
    onSuccess: async (_, variables) => {
      setSuccessMessage(
        variables.trackingType === "return"
          ? "수거 배송 정보가 저장되었습니다."
          : "재발송 배송 정보가 저장되었습니다.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CLAIM_LIST_KEY }),
        queryClient.invalidateQueries({
          queryKey: [...CLAIM_DETAIL_KEY, claimId],
        }),
      ]);
    },
  });

  const saveTracking = async (
    trackingType: "return" | "resend",
    courierCompany: string,
    trackingNumber: string,
  ): Promise<boolean> => {
    try {
      await mutation.mutateAsync({
        trackingType,
        courierCompany,
        trackingNumber,
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    saveTracking,
    isPending: mutation.isPending,
    error: mutation.error,
    successMessage,
  };
}

export function useClaimTrackingState(
  tracking: AdminClaimTrackingInfo | null | undefined,
  claimId: string | undefined,
) {
  const [courierCompany, setCourierCompany] = useState<string>("");
  const [trackingNumber, setTrackingNumber] = useState<string>("");
  const prevClaimIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!claimId) return;
    if (claimId === prevClaimIdRef.current) return;
    prevClaimIdRef.current = claimId;
    setCourierCompany("");
    setTrackingNumber("");
  }, [claimId]);

  useEffect(() => {
    if (!tracking) return;
    setCourierCompany(tracking.courierCompany);
    setTrackingNumber(tracking.trackingNumber);
  }, [tracking]);

  return {
    courierCompany,
    setCourierCompany,
    trackingNumber,
    setTrackingNumber,
  };
}
