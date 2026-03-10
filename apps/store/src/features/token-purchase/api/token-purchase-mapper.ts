import type { CreateTokenPurchaseResultDTO } from "@yeongseon/shared";
import type { TokenPlan, TokenPlanKey, CreateTokenPurchaseResult } from "./token-purchase-api";

const PLAN_META: Record<TokenPlanKey, Omit<TokenPlan, "planKey" | "price" | "tokenAmount">> = {
  starter: {
    label: "Starter",
    description: "AI 디자인을 가볍게 시작해보세요",
    features: [
      "텍스트 · 이미지 디자인 생성",
      "OpenAI · Gemini 모델 선택",
      "만료 없이 사용 가능",
    ],
  },
  popular: {
    label: "Popular",
    popular: true,
    description: "가장 많이 선택하는 합리적인 옵션",
    features: [
      "텍스트 · 이미지 디자인 생성",
      "OpenAI · Gemini 모델 선택",
      "만료 없이 사용 가능",
    ],
  },
  pro: {
    label: "Pro",
    description: "대량으로 쓸수록 더 저렴하게",
    features: [
      "텍스트 · 이미지 디자인 생성",
      "OpenAI · Gemini 모델 선택",
      "만료 없이 사용 가능",
    ],
  },
};

const PLAN_KEYS: Array<{ planKey: TokenPlanKey; priceKey: string; amountKey: string }> = [
  { planKey: "starter", priceKey: "token_plan_starter_price", amountKey: "token_plan_starter_amount" },
  { planKey: "popular", priceKey: "token_plan_popular_price", amountKey: "token_plan_popular_amount" },
  { planKey: "pro",     priceKey: "token_plan_pro_price",     amountKey: "token_plan_pro_amount"     },
];

export function mapTokenPlans(rows: Array<{ key: string; value: string }>): TokenPlan[] {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return PLAN_KEYS.map(({ planKey, priceKey, amountKey }) => ({
    planKey,
    ...PLAN_META[planKey],
    price:       Number(map[priceKey]  ?? 0),
    tokenAmount: Number(map[amountKey] ?? 0),
  }));
}

export function mapCreateTokenPurchase(dto: CreateTokenPurchaseResultDTO): CreateTokenPurchaseResult {
  return {
    paymentGroupId: dto.payment_group_id,
    price: dto.price,
    tokenAmount: dto.token_amount,
  };
}
