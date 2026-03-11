import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "@/lib/toast";
import { uploadTieImages } from "../utils/upload-tie-images";

export const reformKeys = {
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

      return {
        baseCost: map["REFORM_BASE_COST"] as number,
        shippingCost: map["REFORM_SHIPPING_COST"] as number,
      };
    },
  });
}
