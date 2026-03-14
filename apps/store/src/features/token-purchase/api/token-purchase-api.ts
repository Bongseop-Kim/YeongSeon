import { supabase } from "@/lib/supabase";
import type { CreateTokenPurchaseResultDTO } from "@yeongseon/shared";
import {
  mapTokenPlans,
  mapCreateTokenPurchase,
} from "@/features/token-purchase/api/token-purchase-mapper";

export type TokenPlanKey = "starter" | "popular" | "pro";

export interface CreateTokenPurchaseResult {
  paymentGroupId: string;
  price: number;
  tokenAmount: number;
}

export interface TokenPlan {
  planKey: TokenPlanKey;
  label: string;
  price: number | null;
  tokenAmount: number | null;
  description: string;
  features: string[];
  popular?: boolean;
}

export async function getTokenPlans(): Promise<TokenPlan[]> {
  const { data, error } = await supabase.rpc("get_token_plans");

  if (error) throw new Error(`토큰 플랜 조회 실패: ${error.message}`);

  const rows = (data ?? []) as Array<{ key: string; value: string }>;
  return mapTokenPlans(rows);
}

export async function createTokenPurchase(
  planKey: TokenPlanKey,
): Promise<CreateTokenPurchaseResult> {
  const { data, error } = await supabase.rpc("create_token_order", {
    p_plan_key: planKey,
  });

  if (error) {
    throw new Error(`토큰 구매 생성 실패: ${error.message}`);
  }

  if (!data) {
    throw new Error("토큰 구매 생성 결과를 받을 수 없습니다.");
  }

  return mapCreateTokenPurchase(data as CreateTokenPurchaseResultDTO);
}
