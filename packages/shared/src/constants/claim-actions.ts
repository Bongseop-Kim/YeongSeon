export type ClaimActionType = "return" | "exchange" | "cancel";

export const CLAIM_ACTION_LABEL: Record<ClaimActionType, string> = {
  return: "반품 요청",
  exchange: "교환 요청",
  cancel: "취소 요청",
};
