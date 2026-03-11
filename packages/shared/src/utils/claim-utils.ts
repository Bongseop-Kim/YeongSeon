import type { ClaimType } from "../types/view/claim-item";

export const getClaimTypeLabel = (type: ClaimType) => {
  switch (type) {
    case "cancel":
      return "취소";
    case "return":
      return "반품";
    case "exchange":
      return "교환";
    case "token_refund":
      return "토큰환불";
  }
};
