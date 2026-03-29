import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/shared/lib/supabase";
import { toast } from "@/shared/lib/toast";
import { uploadTieImages } from "@/features/reform/utils/upload-tie-images";

const reformKeys = {
  all: ["reform"] as const,
  uploadTieImages: () => [...reformKeys.all, "uploadTieImages"] as const,
};

export const useUploadTieImages = () => {
  return useMutation({
    mutationKey: reformKeys.uploadTieImages(),
    mutationFn: uploadTieImages,
    onError: (error) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다.";
      toast.error(errorMessage);
    },
  });
};

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
