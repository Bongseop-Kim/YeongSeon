import { useState, useCallback, useRef } from "react";
import { upload } from "@imagekit/react";
import { IMAGEKIT_PUBLIC_KEY, getImageKitAuth } from "@/lib/imagekit";
import { toast } from "@/lib/toast";
import type { ImageRef, ImageKitAuth } from "@yeongseon/shared";
import { IMAGE_FOLDERS } from "@yeongseon/shared";

interface UploadedImage {
  name: string;
  url: string;
  fileId: string;
}

export const useImageUpload = () => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const authCacheRef = useRef<{ auth: ImageKitAuth; expireMs: number } | null>(
    null,
  );

  const getOrFetchAuth = useCallback(async (): Promise<ImageKitAuth> => {
    const cached = authCacheRef.current;
    if (cached && Date.now() < cached.expireMs) return cached.auth;
    const auth = await getImageKitAuth();
    authCacheRef.current = { auth, expireMs: auth.expire * 1000 - 30_000 };
    return auth;
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setActiveUploads((n) => n + 1);
      try {
        const { signature, token, expire } = await getOrFetchAuth();

        const response = await upload({
          file,
          fileName: file.name,
          signature,
          token,
          expire,
          publicKey: IMAGEKIT_PUBLIC_KEY,
          folder: IMAGE_FOLDERS.CUSTOM_ORDERS,
        });

        if (!response.url) {
          throw new Error("이미지 URL을 받지 못했습니다.");
        }
        if (!response.fileId) {
          throw new Error("파일 ID를 받지 못했습니다.");
        }
        const uploadedUrl = response.url;
        const uploadedFileId = response.fileId;

        setUploadedImages((prev) => [
          ...prev,
          {
            name: response.name ?? file.name,
            url: uploadedUrl,
            fileId: uploadedFileId,
          },
        ]);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "이미지 업로드에 실패했습니다.",
        );
      } finally {
        setActiveUploads((n) => n - 1);
      }
    },
    [getOrFetchAuth],
  );

  const removeImage = useCallback((index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const getImageRefs = useCallback((): ImageRef[] => {
    return uploadedImages
      .map((img) => ({
        url: img.url.trim(),
        fileId: img.fileId.trim(),
      }))
      .filter((img) => img.url && img.fileId);
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
