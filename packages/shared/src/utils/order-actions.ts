import {
  CLAIM_ACTION_LABEL,
  type ClaimActionType,
} from "../constants/claim-actions";

const CLAIM_ACTION_TYPES = new Set<string>(Object.keys(CLAIM_ACTION_LABEL));
const isClaimActionType = (v: string): v is ClaimActionType =>
  CLAIM_ACTION_TYPES.has(v);

export const getClaimActionsFromCustomerActions = (
  customerActions: readonly string[],
): ClaimActionType[] =>
  customerActions
    .filter((a) => a.startsWith("claim_"))
    .map((a) => a.slice("claim_".length))
    .filter(isClaimActionType);
