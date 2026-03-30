import { useMutation } from "@tanstack/react-query";
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
