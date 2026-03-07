import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { supabase } from "@/lib/supabase";
import type { PricingConstantRow, FabricPriceRow } from "@/features/pricing/types/admin-pricing";

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
