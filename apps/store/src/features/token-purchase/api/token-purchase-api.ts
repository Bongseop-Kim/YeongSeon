import { supabase } from "@/lib/supabase";
import type { CreateTokenPurchaseResultDTO } from "@yeongseon/shared";

export type TokenPlanKey = "starter" | "popular" | "pro";

export interface CreateTokenPurchaseResult {
  paymentGroupId: string;
  price: number;
  tokenAmount: number;
}

export interface TokenPlan {
  planKey: TokenPlanKey;
  label: string;
  price: number;
  tokenAmount: number;
  description: string;
  features: string[];
  popular?: boolean;
}

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

export async function getTokenPlans(): Promise<TokenPlan[]> {
  const { data, error } = await supabase.rpc("get_token_plans");

  if (error) throw new Error(`토큰 플랜 조회 실패: ${error.message}`);

  const rows = (data ?? []) as Array<{ key: string; value: string }>;
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return PLAN_KEYS.map(({ planKey, priceKey, amountKey }) => ({
    planKey,
    ...PLAN_META[planKey],
    price:       Number(map[priceKey]  ?? 0),
    tokenAmount: Number(map[amountKey] ?? 0),
  }));
}

export async function createTokenPurchase(
  planKey: TokenPlanKey
): Promise<CreateTokenPurchaseResult> {
  const { data, error } = await supabase.rpc("create_token_purchase", {
    p_plan_key: planKey,
  });

  if (error) {
    throw new Error(`토큰 구매 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("토큰 구매 생성 결과를 받을 수 없습니다.");
  }

  const dto = data as CreateTokenPurchaseResultDTO;
  return {
    paymentGroupId: dto.payment_group_id,
    price: dto.price,
    tokenAmount: dto.token_amount,
  };
}
