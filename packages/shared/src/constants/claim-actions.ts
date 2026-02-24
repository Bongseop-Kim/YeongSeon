import type { OrderStatus } from "../types/view/order";

export type ClaimActionType = "return" | "exchange" | "cancel";

export const CLAIM_ACTIONS_BY_STATUS: Partial<
  Record<OrderStatus, ClaimActionType[]>
> = {
  완료: ["return", "exchange"],
  배송중: ["return", "exchange"],
  진행중: ["cancel"],
  대기중: ["cancel"],
};

export const CLAIM_ACTION_LABEL: Record<ClaimActionType, string> = {
  return: "반품 요청",
  exchange: "교환 요청",
  cancel: "취소 요청",
};

export const getClaimActions = (status: OrderStatus): ClaimActionType[] =>
  CLAIM_ACTIONS_BY_STATUS[status] ?? [];
