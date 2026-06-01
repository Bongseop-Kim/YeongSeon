import type {
  AdminClaimListRowDTO,
  ClaimStatusLogDTO,
} from "@yeongseon/shared";
import { supabase } from "@/lib/supabase";
import {
  toAdminClaimDetail,
  toAdminClaimListItem,
  toAdminClaimStatusLogEntry,
} from "@/features/claims/api/claims-mapper";
import type {
  AdminClaimDetail,
  AdminClaimListItem,
  AdminClaimStatusLogEntry,
} from "@/features/claims/types/admin-claim";

export interface AdminClaimListResult {
  rows: AdminClaimListItem[];
  total: number;
}

export async function getAdminClaims(params: {
  page: number;
  pageSize: number;
  status?: string | null;
  type?: string | null;
}): Promise<AdminClaimListResult> {
  const normalizedPage = Math.max(1, Math.floor(params.page || 1));
  const from = (normalizedPage - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  let query = supabase
    .from("admin_claim_list_view")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  if (params.type) {
    query = query.eq("type", params.type);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    rows: ((data ?? []) as AdminClaimListRowDTO[]).map(toAdminClaimListItem),
    total: count ?? 0,
  };
}

export async function getAdminClaimDetail(
  claimId: string,
): Promise<AdminClaimDetail> {
  const { data, error } = await supabase
    .from("admin_claim_list_view")
    .select("*")
    .eq("id", claimId)
    .single();

  if (error) throw new Error(error.message);
  return toAdminClaimDetail(data as AdminClaimListRowDTO);
}

export async function getAdminClaimStatusLogs(
  claimId: string,
): Promise<AdminClaimStatusLogEntry[]> {
  const { data, error } = await supabase
    .from("admin_claim_status_log_view")
    .select("*")
    .eq("claimId", claimId)
    .order("createdAt", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ClaimStatusLogDTO[]).map(toAdminClaimStatusLogEntry);
}

interface UpdateClaimStatusParams {
  claimId: string;
  newStatus: string;
  memo: string | null;
  isRollback?: boolean;
}

export async function updateClaimStatus(
  params: UpdateClaimStatusParams,
): Promise<void> {
  const { claimId, newStatus, memo, isRollback } = params;
  const { error } = await supabase.rpc("admin_update_claim_status", {
    p_claim_id: claimId,
    p_new_status: newStatus,
    p_memo: memo,
    p_is_rollback: isRollback ?? false,
  });

  if (error) {
    throw new Error(error.message);
  }
}

interface UpdateClaimTrackingParams {
  claimId: string;
  trackingType: "return" | "resend";
  courierCompany: string;
  trackingNumber: string;
}

/**
 * claims 테이블 직접 UPDATE
 *
 * 직접 쓰기 근거:
 * - 기존 admin 클레임 송장 저장은 claims 컬럼 업데이트 계약이다.
 * - RLS USING/WITH CHECK: public.is_admin() → 관리자만 수정 가능하다.
 * - GRANT UPDATE 컬럼 제한: return/resend courier/tracking 컬럼만 authenticated에 허용된다.
 * - 상태 변경과 금액 계산은 계속 admin_update_claim_status RPC에서만 수행한다.
 */
export async function updateClaimTracking({
  claimId,
  trackingType,
  courierCompany,
  trackingNumber,
}: UpdateClaimTrackingParams): Promise<void> {
  const hasBoth = courierCompany.trim() !== "" && trackingNumber.trim() !== "";
  const values =
    trackingType === "return"
      ? {
          return_courier_company: hasBoth ? courierCompany : null,
          return_tracking_number: hasBoth ? trackingNumber : null,
        }
      : {
          resend_courier_company: hasBoth ? courierCompany : null,
          resend_tracking_number: hasBoth ? trackingNumber : null,
        };

  const { error } = await supabase
    .from("claims")
    .update(values)
    .eq("id", claimId);

  if (error) throw new Error(error.message);
}

export async function notifyClaim(claimId: string): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return;

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-claim`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ claimId }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `notify-claim failed: ${response.status} ${response.statusText} ${responseText}`,
    );
  }
}
