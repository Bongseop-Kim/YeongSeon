import { useMutation } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { uploadTieImages } from "./upload-tie-images";

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
