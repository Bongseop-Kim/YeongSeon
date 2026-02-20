import { supabase } from "@/lib/supabase";
import type {
  CreateClaimRequest,
  CreateClaimResponse,
} from "@/features/order/types/view/claim-input";
import type { CreateClaimResultDTO } from "@/features/order/types/dto/claim-output";
import type { ClaimListRowDTO } from "@/features/order/types/dto/claim-view";
import type { ClaimItem } from "@/features/order/types/claim-item";
import {
  toClaimItemView,
  toCreateClaimInputDTO,
} from "@/features/order/api/claims-mapper";

const CLAIM_LIST_VIEW = "claim_list_view";

/**
 * 클레임 목록 조회
 */
export const getClaims = async (): Promise<ClaimItem[]> => {
  const { data, error } = await supabase
    .from(CLAIM_LIST_VIEW)
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`클레임 목록 조회 실패: ${error.message}`);
  }

  const rows = (data as ClaimListRowDTO[] | null) ?? [];
  return rows.map(toClaimItemView);
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
