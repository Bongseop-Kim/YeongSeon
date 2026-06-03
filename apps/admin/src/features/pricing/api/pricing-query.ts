import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFabricPrices,
  getPricingConstants,
  getPricingRowsByKeys,
  getSampleCouponAmounts,
  updatePricingConstant,
  upsertSampleCouponAmounts,
  upsertTokenPricing,
} from "@/features/pricing/api/pricing-api";
import type {
  TokenPricingKey,
  TokenTierUI,
} from "@/features/pricing/types/admin-pricing";

const TOKEN_PRICING_KEY = ["pricing", "token"] as const;

const TOKEN_PRICING_SETTINGS = [
  { key: "token_plan_starter_price", label: "Starter", field: "price" },
  { key: "token_plan_starter_amount", label: "Starter", field: "amount" },
  { key: "token_plan_popular_price", label: "Popular", field: "price" },
  { key: "token_plan_popular_amount", label: "Popular", field: "amount" },
  { key: "token_plan_pro_price", label: "Pro", field: "price" },
  { key: "token_plan_pro_amount", label: "Pro", field: "amount" },
] as const;

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
      const keys = TOKEN_PRICING_SETTINGS.map((setting) => setting.key);
      const rows = await getPricingRowsByKeys(keys);
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
    mutationFn: upsertTokenPricing,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: TOKEN_PRICING_KEY });
    },
  });
}

const PRICING_CONSTANTS_KEY = ["pricing", "constants"] as const;
const FABRIC_PRICES_KEY = ["pricing", "fabric"] as const;

export function usePricingConstants() {
  return useQuery({
    queryKey: PRICING_CONSTANTS_KEY,
    queryFn: getPricingConstants,
  });
}

export function useFabricPrices() {
  return useQuery({
    queryKey: FABRIC_PRICES_KEY,
    queryFn: getFabricPrices,
  });
}

export function useUpdatePricingConstant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePricingConstant,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PRICING_CONSTANTS_KEY });
    },
  });
}

export function useUpdateFabricPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePricingConstant,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FABRIC_PRICES_KEY });
    },
  });
}

const SAMPLE_DISCOUNT_QUERY_KEY = ["pricing", "sample-discount"] as const;

export const SAMPLE_DISCOUNT_KEYS = [
  "sample_discount_sewing",
  "sample_discount_fabric_printing",
  "sample_discount_fabric_yarn_dyed",
  "sample_discount_fabric_and_sewing_printing",
  "sample_discount_fabric_and_sewing_yarn_dyed",
] as const;

export function useSampleCouponAmounts() {
  return useQuery({
    queryKey: SAMPLE_DISCOUNT_QUERY_KEY,
    queryFn: () => getSampleCouponAmounts(SAMPLE_DISCOUNT_KEYS),
  });
}

export function useUpdateSampleCouponAmounts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertSampleCouponAmounts,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: SAMPLE_DISCOUNT_QUERY_KEY,
      });
    },
  });
}
