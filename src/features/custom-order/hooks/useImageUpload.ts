import { useState, useCallback } from "react";
import { upload } from "@imagekit/react";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";
import { toast } from "@/lib/toast";

interface UploadedImage {
  name: string;
  url: string;
}

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const { data, error } = await supabase.functions.invoke("imagekit-auth");
      if (error || !data) {
        throw new Error("ImageKit 인증에 실패했습니다.");
      }
      const { signature, token, expire } = data as {
        signature: string;
        token: string;
        expire: number;
      };

      const response = await upload({
        file,
        fileName: file.name,
        signature,
        token,
        expire,
        publicKey: IMAGEKIT_PUBLIC_KEY,
        folder: "/custom-orders",
      });

      if (!response.url) {
        throw new Error("이미지 URL을 받지 못했습니다.");
      }

      setUploadedImages((prev) => [
        ...prev,
        { name: response.name ?? file.name, url: response.url! },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다."
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getImageUrls = useCallback(() => {
    return uploadedImages.map((img) => img.url).filter(Boolean);
  }, [uploadedImages]);

  return {
    uploadedImages,
    isUploading,
    uploadFile,
    removeImage,
    getImageUrls,
  };
};
