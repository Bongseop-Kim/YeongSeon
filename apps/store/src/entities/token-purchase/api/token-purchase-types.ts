export type TokenPlanKey = "starter" | "popular" | "pro";

export interface TokenPlan {
  planKey: TokenPlanKey;
  label: string;
  price: number | null;
  tokenAmount: number | null;
  description: string;
  features: string[];
  popular?: boolean;
}

export interface CreateTokenPurchaseResult {
  paymentGroupId: string;
  price: number;
  tokenAmount: number;
}
