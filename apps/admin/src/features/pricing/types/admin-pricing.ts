export interface PricingConstantRow {
  key: string;
  amount: number;
}

export type TokenPricingKey =
  | "token_plan_starter_price"
  | "token_plan_starter_amount"
  | "token_plan_popular_price"
  | "token_plan_popular_amount"
  | "token_plan_pro_price"
  | "token_plan_pro_amount";

export interface TokenTierUI {
  label: string;
  priceKey: TokenPricingKey;
  amountKey: TokenPricingKey;
  price: number;
  amount: number;
}

export type SampleDiscountKey =
  | "sample_discount_sewing"
  | "sample_discount_fabric_printing"
  | "sample_discount_fabric_yarn_dyed"
  | "sample_discount_fabric_and_sewing_printing"
  | "sample_discount_fabric_and_sewing_yarn_dyed";
