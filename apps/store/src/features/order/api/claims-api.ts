import { supabase } from "@/lib/supabase";
import type {
  CreateClaimRequest,
  CreateClaimResponse,
} from "@yeongseon/shared/types/view/claim-input";
import type { CreateClaimResultDTO } from "@yeongseon/shared/types/dto/claim-output";
import type { ClaimListRowDTO } from "@yeongseon/shared/types/dto/claim-view";
import type { ClaimItem } from "@yeongseon/shared/types/view/claim-item";
import {
  toClaimItemView,
  toCreateClaimInputDTO,
} from "@/features/order/api/claims-mapper";
import { normalizeKeyword, type ListFilters } from "@/features/order/api/list-filters";

const CLAIM_LIST_VIEW = "claim_list_view";

/**
 * 클레임 목록 조회
 */
export const getClaims = async (filters?: ListFilters): Promise<ClaimItem[]> => {
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
    throw new Error(`클레임 목록 조회 실패: ${error.message}`);
  }

  const rows = (data as ClaimListRowDTO[] | null) ?? [];
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
    const searchText = `${claim.claimNumber} ${claim.orderNumber} ${claim.reason} ${claim.status} ${claim.type} ${itemText}`.toLowerCase();
    return searchText.includes(keyword);
  });
};

/**
 * 클레임 생성
 */
export const createClaim = async (
  request: CreateClaimRequest
): Promise<CreateClaimResponse> => {
  const input = toCreateClaimInputDTO(request);

  const { data, error } = await supabase.rpc("create_claim", input);

  if (error) {
    throw new Error(`클레임 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("클레임 생성 결과를 받을 수 없습니다.");
  }

  const result = data as CreateClaimResultDTO;

  return {
    claimId: result.claim_id,
    claimNumber: result.claim_number,
  };
};
