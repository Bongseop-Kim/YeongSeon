import { useQuery } from "@tanstack/react-query";
import {
  fetchFabricPrices,
  fetchPricingConstants,
} from "@/features/custom-order/api/pricing-api";
import { toPricingConfig } from "@/features/custom-order/api/pricing-mapper";
import type { PricingConfig } from "@/features/custom-order/types/pricing";

export const usePricingConfig = (): {
  data: PricingConfig | undefined;
  isLoading: boolean;
  isError: boolean;
} => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["pricingConfig"],
    queryFn: async () => {
      const [constants, fabricPrices] = await Promise.all([
        fetchPricingConstants(),
        fetchFabricPrices(),
      ]);

      return toPricingConfig(constants, fabricPrices);
    },
    staleTime: Infinity,
  });

  return {
    data,
    isLoading,
    isError,
  };
};
