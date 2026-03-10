import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { supabase } from "@/lib/supabase";
import type { PricingConstantRow, FabricPriceRow } from "@/features/pricing/types/admin-pricing";

// ── 토큰 구매 가격 ────────────────────────────────────────────

const TOKEN_PRICING_KEY = ["pricing", "token"] as const;

const TOKEN_PRICING_SETTINGS = [
  { key: "token_plan_starter_price",   label: "30 토큰",  field: "price"  },
  { key: "token_plan_starter_amount",  label: "30 토큰",  field: "amount" },
  { key: "token_plan_popular_price",   label: "120 토큰", field: "price"  },
  { key: "token_plan_popular_amount",  label: "120 토큰", field: "amount" },
  { key: "token_plan_pro_price",       label: "300 토큰", field: "price"  },
  { key: "token_plan_pro_amount",      label: "300 토큰", field: "amount" },
] as const;

export type TokenPricingKey = typeof TOKEN_PRICING_SETTINGS[number]["key"];

interface TokenPricingRow {
  key: TokenPricingKey;
  value: string | null;
}

export interface TokenTierUI {
  label: string;
  priceKey: TokenPricingKey;
  amountKey: TokenPricingKey;
  price: string;
  amount: string;
}

export const TOKEN_PRICING_TIERS: Array<{
  label: string;
  priceKey: TokenPricingKey;
  amountKey: TokenPricingKey;
}> = [
  { label: "Starter", priceKey: "token_plan_starter_price", amountKey: "token_plan_starter_amount" },
  { label: "Popular", priceKey: "token_plan_popular_price",  amountKey: "token_plan_popular_amount" },
  { label: "Pro",     priceKey: "token_plan_pro_price",      amountKey: "token_plan_pro_amount"     },
];

export function useTokenPricing() {
  return useQuery({
    queryKey: TOKEN_PRICING_KEY,
    queryFn: async (): Promise<TokenTierUI[]> => {
      const keys = TOKEN_PRICING_SETTINGS.map((s) => s.key);
      const { data, error } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", keys);
      if (error) throw error;
      const rows = (data ?? []) as TokenPricingRow[];
      const rowMap = new Map(rows.map((row) => [row.key, row.value]));

      return TOKEN_PRICING_TIERS.map(({ label, priceKey, amountKey }) => ({
        label,
        priceKey,
        amountKey,
        price: rowMap.get(priceKey) ?? "0",
        amount: rowMap.get(amountKey) ?? "0",
      }));
    },
  });
}

export function useUpdateTokenPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tiers: TokenTierUI[]) => {
      const rows: TokenPricingRow[] = tiers.flatMap(({ priceKey, amountKey, price, amount }) => [
        { key: priceKey, value: price },
        { key: amountKey, value: amount },
      ]);
      const { error } = await supabase
        .from("admin_settings")
        .upsert(rows, { onConflict: "key" });
      if (error) throw error;
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
        .from("custom_order_pricing_constants")
        .select("key, amount")
        .order("key");
      if (error) throw error;
      return data;
    },
  });
}

export function useFabricPrices() {
  return useQuery({
    queryKey: FABRIC_PRICES_KEY,
    queryFn: async (): Promise<FabricPriceRow[]> => {
      const { data, error } = await supabase
        .from("custom_order_fabric_prices")
        .select("design_type, fabric_type, unit_price")
        .order("design_type")
        .order("fabric_type");
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
        .from("custom_order_pricing_constants")
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
    mutationFn: async ({ design_type, fabric_type, unit_price }: FabricPriceRow) => {
      const { error } = await supabase
        .from("custom_order_fabric_prices")
        .update({ unit_price })
        .eq("design_type", design_type)
        .eq("fabric_type", fabric_type);
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
