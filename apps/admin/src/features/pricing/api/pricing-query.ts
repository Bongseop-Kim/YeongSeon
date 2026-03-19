import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { supabase } from "@/lib/supabase";
import type { PricingConstantRow } from "@/features/pricing/types/admin-pricing";

// ── 토큰 구매 가격 ────────────────────────────────────────────

const TOKEN_PRICING_KEY = ["pricing", "token"] as const;

const TOKEN_PRICING_SETTINGS = [
  { key: "token_plan_starter_price", label: "Starter", field: "price" },
  { key: "token_plan_starter_amount", label: "Starter", field: "amount" },
  { key: "token_plan_popular_price", label: "Popular", field: "price" },
  { key: "token_plan_popular_amount", label: "Popular", field: "amount" },
  { key: "token_plan_pro_price", label: "Pro", field: "price" },
  { key: "token_plan_pro_amount", label: "Pro", field: "amount" },
] as const;

export type TokenPricingKey = (typeof TOKEN_PRICING_SETTINGS)[number]["key"];

export interface TokenTierUI {
  label: string;
  priceKey: TokenPricingKey;
  amountKey: TokenPricingKey;
  price: number;
  amount: number;
}

export const TOKEN_PRICING_TIERS: Array<{
  label: string;
  priceKey: TokenPricingKey;
  amountKey: TokenPricingKey;
}> = [
  {
    label: "Starter",
    priceKey: "token_plan_starter_price",
    amountKey: "token_plan_starter_amount",
  },
  {
    label: "Popular",
    priceKey: "token_plan_popular_price",
    amountKey: "token_plan_popular_amount",
  },
  {
    label: "Pro",
    priceKey: "token_plan_pro_price",
    amountKey: "token_plan_pro_amount",
  },
];

export function useTokenPricing() {
  return useQuery({
    queryKey: TOKEN_PRICING_KEY,
    queryFn: async (): Promise<TokenTierUI[]> => {
      const keys = TOKEN_PRICING_SETTINGS.map((s) => s.key);
      const { data, error } = await supabase
        .from("pricing_constants")
        .select("key, amount")
        .in("key", keys);
      if (error) throw error;
      const rows = (data ?? []) as PricingConstantRow[];
      const rowMap = new Map(rows.map((row) => [row.key, row.amount]));

      return TOKEN_PRICING_TIERS.map(({ label, priceKey, amountKey }) => ({
        label,
        priceKey,
        amountKey,
        price: rowMap.get(priceKey) ?? 0,
        amount: rowMap.get(amountKey) ?? 0,
      }));
    },
  });
}

export function useUpdateTokenPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tiers: TokenTierUI[]) => {
      const rows: PricingConstantRow[] = tiers.flatMap(
        ({ priceKey, amountKey, price, amount }) => [
          { key: priceKey, amount: price },
          { key: amountKey, amount: amount },
        ],
      );
      const results = await Promise.all(
        rows.map(({ key, amount }) =>
          supabase.from("pricing_constants").update({ amount }).eq("key", key),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TOKEN_PRICING_KEY });
    },
    onError: (error: Error) => {
      message.error(`저장 실패: ${error.message}`);
    },
  });
}

const PRICING_CONSTANTS_KEY = ["pricing", "constants"] as const;
const FABRIC_PRICES_KEY = ["pricing", "fabric"] as const;

export function usePricingConstants() {
  return useQuery({
    queryKey: PRICING_CONSTANTS_KEY,
    queryFn: async (): Promise<PricingConstantRow[]> => {
      const { data, error } = await supabase
        .from("pricing_constants")
        .select("key, amount")
        .in("category", ["custom_order", "reform"])
        .order("key");
      if (error) throw error;
      return data;
    },
  });
}

export function useFabricPrices() {
  return useQuery({
    queryKey: FABRIC_PRICES_KEY,
    queryFn: async (): Promise<PricingConstantRow[]> => {
      const { data, error } = await supabase
        .from("pricing_constants")
        .select("key, amount")
        .eq("category", "fabric")
        .order("key");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdatePricingConstant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, amount }: PricingConstantRow) => {
      const { error } = await supabase
        .from("pricing_constants")
        .update({ amount })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRICING_CONSTANTS_KEY });
    },
    onError: (error: Error) => {
      message.error(`저장 실패: ${error.message}`);
    },
  });
}

export function useUpdateFabricPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, amount }: PricingConstantRow) => {
      const { error } = await supabase
        .from("pricing_constants")
        .update({ amount })
        .eq("key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FABRIC_PRICES_KEY });
    },
    onError: (error: Error) => {
      message.error(`저장 실패: ${error.message}`);
    },
  });
}

// ── 샘플 할인 쿠폰 금액 (타입별 5종) ─────────────────────────
// ⚠️ 원본은 pricing_constants(category='sample_discount')이며,
// coupons 테이블의 SAMPLE_DISCOUNT_* row는 RPC가 자동 동기화합니다.
const SAMPLE_DISCOUNT_QUERY_KEY = ["pricing", "sample-discount"] as const;

export const SAMPLE_DISCOUNT_KEYS = [
  "sample_discount_sewing",
  "sample_discount_fabric_printing",
  "sample_discount_fabric_yarn_dyed",
  "sample_discount_fabric_and_sewing_printing",
  "sample_discount_fabric_and_sewing_yarn_dyed",
] as const;

export type SampleDiscountKey = (typeof SAMPLE_DISCOUNT_KEYS)[number];

export function useSampleCouponAmounts() {
  return useQuery({
    queryKey: SAMPLE_DISCOUNT_QUERY_KEY,
    queryFn: async (): Promise<Record<SampleDiscountKey, number>> => {
      const { data, error } = await supabase
        .from("pricing_constants")
        .select("key, amount")
        .eq("category", "sample_discount");
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((row) => [row.key, row.amount]),
      ) as Record<SampleDiscountKey, number>;
    },
  });
}

export function useUpdateSampleCouponAmounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      mutations: { key: SampleDiscountKey; amount: number }[],
    ) => {
      const results = await Promise.all(
        mutations.map(({ key, amount }) =>
          supabase.from("pricing_constants").update({ amount }).eq("key", key),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SAMPLE_DISCOUNT_QUERY_KEY });
    },
    onError: (error: Error) => {
      message.error(`저장 실패: ${error.message}`);
    },
  });
}
