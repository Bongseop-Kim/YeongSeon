import type {
  ClaimItemRowDTO,
  ClaimListRowDTO,
  ClaimStatusDTO,
  ClaimTypeDTO,
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
import { isRecord } from "@/lib/type-guard";

// ── parse helpers (런타임 검증) ──────────────────────

const parseClaimItemField = (
  v: unknown,
  i: number
): ClaimListRowDTO["item"] => {
  if (!isRecord(v)) {
    throw new Error(
      `클레임 목록 행(${i})이 올바르지 않습니다: item 객체가 아닙니다.`
    );
  }
  if (
    typeof v.id !== "string" ||
    (v.type !== "product" && v.type !== "reform") ||
    typeof v.quantity !== "number"
  ) {
    throw new Error(
      `클레임 목록 행(${i})의 item이 올바르지 않습니다: 필수 필드(id, type, quantity) 누락 또는 type 값 오류.`
    );
  }
  if (v.product != null) {
    if (
      !isRecord(v.product) ||
      typeof v.product.id !== "number" ||
      typeof v.product.name !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.product가 올바르지 않습니다: 필수 필드(id, name) 누락.`
      );
    }
  }
  if (v.selectedOption != null) {
    if (
      !isRecord(v.selectedOption) ||
      typeof v.selectedOption.id !== "string" ||
      typeof v.selectedOption.name !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.selectedOption이 올바르지 않습니다: 필수 필드(id, name) 누락.`
      );
    }
  }
  if (v.reformData != null) {
    if (
      !isRecord(v.reformData) ||
      typeof v.reformData.cost !== "number" ||
      !isRecord(v.reformData.tie) ||
      typeof v.reformData.tie.id !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.reformData가 올바르지 않습니다: 필수 필드 누락.`
      );
    }
  }
  if (v.appliedCoupon != null) {
    if (
      !isRecord(v.appliedCoupon) ||
      typeof v.appliedCoupon.id !== "string" ||
      !isRecord(v.appliedCoupon.coupon) ||
      typeof v.appliedCoupon.coupon.id !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})의 item.appliedCoupon이 올바르지 않습니다: 필수 필드(id, coupon.id) 누락.`
      );
    }
  }
  return v as unknown as ClaimListRowDTO["item"];
};

const CLAIM_STATUSES: ReadonlySet<string> = new Set([
  "접수", "처리중", "수거요청", "수거완료", "재발송", "완료", "거부",
]);
const isClaimStatus = (v: string): v is ClaimStatusDTO =>
  CLAIM_STATUSES.has(v);

const CLAIM_TYPES: ReadonlySet<string> = new Set(["cancel", "return", "exchange"]);
const isClaimType = (v: string): v is ClaimTypeDTO =>
  CLAIM_TYPES.has(v);

export const parseClaimListRows = (data: unknown): ClaimListRowDTO[] => {
  if (data == null) return [];
  if (!Array.isArray(data)) {
    throw new Error("클레임 목록 응답이 올바르지 않습니다: 배열이 아닙니다.");
  }
  return data.map((row: unknown, i: number): ClaimListRowDTO => {
    if (!isRecord(row)) {
      throw new Error(`클레임 목록 행(${i})이 올바르지 않습니다: 객체가 아닙니다.`);
    }
    if (
      typeof row.id !== "string" ||
      typeof row.claimNumber !== "string" ||
      typeof row.date !== "string" ||
      typeof row.status !== "string" ||
      typeof row.type !== "string" ||
      typeof row.reason !== "string" ||
      typeof row.claimQuantity !== "number" ||
      typeof row.orderId !== "string" ||
      typeof row.orderNumber !== "string" ||
      typeof row.orderDate !== "string"
    ) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: 필수 필드(id, claimNumber, date, status, type, reason, claimQuantity, orderId, orderNumber, orderDate) 누락.`
      );
    }
    if (!isClaimStatus(row.status)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: status 값(${row.status})이 허용된 상태가 아닙니다.`
      );
    }
    if (!isClaimType(row.type)) {
      throw new Error(
        `클레임 목록 행(${i})이 올바르지 않습니다: type 값(${row.type})이 허용된 유형이 아닙니다.`
      );
    }
    return {
      id: row.id,
      claimNumber: row.claimNumber,
      date: row.date,
      status: row.status,
      type: row.type,
      reason: row.reason,
      description: typeof row.description === "string" ? row.description : null,
      claimQuantity: row.claimQuantity,
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      orderDate: row.orderDate,
      item: parseClaimItemField(row.item, i),
    };
  });
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
