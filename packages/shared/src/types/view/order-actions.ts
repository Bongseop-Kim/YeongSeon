export type AdminAction = "advance" | "rollback" | "cancel";
export type CustomerAction =
  | "claim_cancel"
  | "claim_return"
  | "claim_exchange"
  | "confirm_purchase";
