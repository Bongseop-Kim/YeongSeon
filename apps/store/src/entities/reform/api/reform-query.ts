import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase";

export function useReformPricing() {
  return useQuery({
    queryKey: ["reform", "pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_constants")
        .select("key, amount")
        .in("key", ["REFORM_BASE_COST", "REFORM_SHIPPING_COST"]);

      if (error) throw error;

      const map = Object.fromEntries(data.map((r) => [r.key, r.amount]));

      const baseCostRaw = map["REFORM_BASE_COST"];
      const shippingCostRaw = map["REFORM_SHIPPING_COST"];

      if (!Number.isFinite(baseCostRaw)) {
        throw new Error(
          "pricing_constants에서 REFORM_BASE_COST를 찾을 수 없습니다.",
        );
      }
      if (!Number.isFinite(shippingCostRaw)) {
        throw new Error(
          "pricing_constants에서 REFORM_SHIPPING_COST를 찾을 수 없습니다.",
        );
      }

      return {
        baseCost: baseCostRaw as number,
        shippingCost: shippingCostRaw as number,
      };
    },
  });
}
