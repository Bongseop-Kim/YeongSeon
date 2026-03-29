import { supabase } from "@/shared/lib/supabase";

export interface PricingConstantRow {
  key: string;
  amount: number;
}

export const fetchPricingConstants = async (): Promise<
  PricingConstantRow[]
> => {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount");

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const fetchFabricPrices = async (): Promise<PricingConstantRow[]> => {
  const { data, error } = await supabase
    .from("pricing_constants")
    .select("key, amount")
    .eq("category", "fabric");

  if (error) {
    throw error;
  }

  return data ?? [];
};
