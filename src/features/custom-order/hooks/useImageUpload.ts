import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface UploadedImage {
  name: string;
  url: string;
}

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const authenticator = async () => {
    const { data, error } = await supabase.functions.invoke("imagekit-auth");
    if (error || !data) {
      throw new Error("ImageKit 인증에 실패했습니다.");
    }
    return data as { signature: string; token: string; expire: number };
  };

  const handleUploadSuccess = useCallback(
    (response: { name: string; url: string }) => {
      setUploadedImages((prev) => [
        ...prev,
        { name: response.name, url: response.url },
      ]);
      setIsUploading(false);
    },
    []
  );

  const handleUploadStart = useCallback(() => {
    setIsUploading(true);
  }, []);

  const handleUploadError = useCallback(() => {
    setIsUploading(false);
  }, []);

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getImageUrls = useCallback(() => {
    return uploadedImages.map((img) => img.url);
  }, [uploadedImages]);

  return {
    uploadedImages,
    isUploading,
    authenticator,
    handleUploadSuccess,
    handleUploadStart,
    handleUploadError,
    removeImage,
    getImageUrls,
  };
};
