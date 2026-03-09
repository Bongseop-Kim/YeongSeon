import { useState, useCallback } from "react";
import { upload } from "@imagekit/react";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";
import { toast } from "@/lib/toast";

interface UploadedImage {
  name: string;
  url: string;
  fileId: string;
}

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);

  const uploadFile = useCallback(async (file: File) => {
    setActiveUploads((n) => n + 1);
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
      const uploadedUrl = response.url;

      setUploadedImages((prev) => [
        ...prev,
        {
          name: response.name ?? file.name,
          url: uploadedUrl,
          fileId: response.fileId ?? "",
        },
      ]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "이미지 업로드에 실패했습니다."
      );
    } finally {
      setActiveUploads((n) => n - 1);
    }
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getImageRefs = useCallback(() => {
    return uploadedImages
      .map((img) => ({
        url: img.url.trim(),
        fileId: img.fileId.trim(),
      }))
      .filter((img) => img.url);
  }, [uploadedImages]);

  const isUploading = activeUploads > 0;

  return {
    uploadedImages,
    isUploading,
    uploadFile,
    removeImage,
    getImageRefs,
  };
};
