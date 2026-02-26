import type {
  ClaimItemRowDTO,
  ClaimListRowDTO,
} from "@yeongseon/shared/types/dto/claim-view";
import type { CreateClaimInputDTO } from "@yeongseon/shared/types/dto/claim-input";
import type { CreateClaimResultDTO } from "@yeongseon/shared/types/dto/claim-output";
import type { OrderItemDTO } from "@yeongseon/shared/types/dto/order-view";
import type { ClaimItem } from "@yeongseon/shared/types/view/claim-item";
import type { CreateClaimRequest } from "@yeongseon/shared/types/view/claim-input";
import {
  normalizeItemRow,
  toOrderItemView,
} from "@yeongseon/shared/mappers/shared-mapper";

// ── parse helpers (런타임 검증) ──────────────────────

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const parseClaimListRows = (data: unknown): ClaimListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("클레임 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  for (let i = 0; i < data.length; i++) {
    const row: unknown = data[i];
    if (
      !isRecord(row) ||
      typeof row.id !== "string" ||
      typeof row.claimNumber !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, claimNumber) 누락.`
      );
    }
    if (!isRecord(row.item)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: item 객체 누락.`
      );
    }
  }
  return data as ClaimListRowDTO[];
};

export const parseCreateClaimResult = (
  data: unknown
): CreateClaimResultDTO => {
  if (!isRecord(data)) {
    throw new Error("클레임 생성 응답이 올바르지 않습니다: 객체가 아닙니다.");
  }
  if (
    typeof data.claim_id !== "string" ||
    typeof data.claim_number !== "string"
  ) {
    throw new Error(
      "클레임 생성 응답이 올바르지 않습니다: claim_id 또는 claim_number 누락."
    );
  }
  return { claim_id: data.claim_id, claim_number: data.claim_number };
};

// ── row → DTO 변환 ──────────────────────────────────

/**
 * claim_list_view의 item jsonb → 정규화된 OrderItemDTO
 */
export const fromClaimItemRowDTO = (item: ClaimItemRowDTO): OrderItemDTO =>
  normalizeItemRow(item);

/**
 * ClaimListRowDTO → ClaimItem (View)
 */
export const toClaimItemView = (row: ClaimListRowDTO): ClaimItem => {
  const itemDTO = normalizeItemRow(row.item);

  return {
    id: row.id,
    claimNumber: row.claimNumber,
    date: row.date,
    status: row.status,
    type: row.type,
    orderId: row.orderId,
    orderNumber: row.orderNumber,
    item: toOrderItemView(itemDTO),
    reason: row.reason,
  };
};

/**
 * CreateClaimRequest (View) → CreateClaimInputDTO (RPC params)
 */
export const toCreateClaimInputDTO = (
  request: CreateClaimRequest
): CreateClaimInputDTO => ({
  p_type: request.type,
  p_order_id: request.orderId,
  p_item_id: request.itemId,
  p_reason: request.reason,
  p_description: request.description ?? null,
  p_quantity: request.quantity ?? null,
});
