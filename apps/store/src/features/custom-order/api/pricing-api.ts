import { supabase } from "@/lib/supabase";

export interface PricingConstantRow {
  key: string;
  amount: number;
}

export interface FabricPriceRow {
  design_type: string;
  fabric_type: string;
  unit_price: number;
}

export const fetchPricingConstants = async (): Promise<PricingConstantRow[]> => {
  const { data, error } = await supabase
    .from("custom_order_pricing_constants")
    .select("key, amount");

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const fetchFabricPrices = async (): Promise<FabricPriceRow[]> => {
  const { data, error } = await supabase
    .from("custom_order_fabric_prices")
    .select("design_type, fabric_type, unit_price");

  if (error) {
    throw error;
  }

  return data ?? [];
};
