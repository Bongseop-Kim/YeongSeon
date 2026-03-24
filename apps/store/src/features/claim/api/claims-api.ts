import { supabase } from "@/lib/supabase";
import type {
  CreateClaimRequest,
  CreateClaimResponse,
} from "@yeongseon/shared/types/view/claim-input";
import type { ClaimItem } from "@yeongseon/shared/types/view/claim-item";
import {
  parseClaimListRows,
  parseCreateClaimResult,
  toClaimItemView,
  toCreateClaimInputDTO,
} from "@/features/claim/api/claims-mapper";
import { normalizeKeyword, type ListFilters } from "@/lib/list-filters";

const CLAIM_LIST_VIEW = "claim_list_view";

/**
 * 클레임 목록 조회
 */
export const getClaims = async (
  filters?: ListFilters,
): Promise<ClaimItem[]> => {
  let query = supabase
    .from(CLAIM_LIST_VIEW)
    .select("*")
    .order("date", { ascending: false });

  if (filters?.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("클레임 목록을 불러오는 데 실패했습니다.");
  }

  const rows = parseClaimListRows(data);
  const views = rows.map(toClaimItemView);
  const keyword = normalizeKeyword(filters?.keyword);
  if (!keyword) {
    return views;
  }

  return views.filter((claim) => {
    const itemText =
      claim.item.type === "product"
        ? `${claim.item.product.name} ${claim.item.selectedOption?.name ?? ""}`
        : "수선";
    const searchText =
      `${claim.claimNumber} ${claim.orderNumber} ${claim.reason} ${claim.status} ${claim.type} ${itemText}`.toLowerCase();
    return searchText.includes(keyword);
  });
};

/**
 * 클레임 생성
 */
export const createClaim = async (
  request: CreateClaimRequest,
): Promise<CreateClaimResponse> => {
  const input = toCreateClaimInputDTO(request);

  const { data, error } = await supabase.rpc("create_claim", input);

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("클레임 생성 결과를 받을 수 없습니다.");
  }

  const result = parseCreateClaimResult(data);

  return {
    claimId: result.claim_id,
    claimNumber: result.claim_number,
  };
};

/**
 * 클레임 단건 조회
 * claim_list_view는 auth.uid() 스코프이므로 본인 클레임만 반환된다.
 * 결과가 없으면 null 반환 (예외 아님).
 */
export const getClaim = async (claimId: string): Promise<ClaimItem | null> => {
  const { data, error } = await supabase
    .from(CLAIM_LIST_VIEW)
    .select("*")
    .eq("id", claimId)
    .limit(1);

  if (error) {
    throw new Error("클레임 정보를 불러오는 데 실패했습니다.");
  }

  const rows = parseClaimListRows(data);
  if (rows.length === 0) return null;
  return toClaimItemView(rows[0]);
};

/**
 * 클레임 신청 취소 (접수 상태에서만 가능)
 */
export const cancelClaim = async (claimId: string): Promise<void> => {
  const { error } = await supabase.rpc("cancel_claim", {
    p_claim_id: claimId,
  });

  if (error) {
    throw new Error(error.message);
  }
};
