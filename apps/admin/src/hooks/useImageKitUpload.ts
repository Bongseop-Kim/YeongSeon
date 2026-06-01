import { useCallback, useRef, useState } from "react";
import { upload } from "@imagekit/react";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";

interface ImageItem {
  url: string;
  fileId?: string;
}

export interface ImageKitUploadFile {
  uid: string;
  name: string;
  status?: "error" | "done" | "uploading" | "removed";
  url?: string;
  thumbUrl?: string;
  fileId?: string;
}

type UploadRequestFile = (File | Blob | string) & {
  uid?: string;
  name?: string;
};

interface ImageKitCustomRequestOptions {
  file: UploadRequestFile;
  onSuccess?: (body: unknown) => void;
  onError?: (err: Error) => void;
}

function getUploadFileName(file: UploadRequestFile): string {
  if (typeof file === "string") return file.split("/").pop() || "image";
  return file.name || "image";
}

function getUploadFileUid(file: UploadRequestFile): string | undefined {
  return typeof file === "string" ? undefined : file.uid;
}

export const useImageKitUpload = () => {
  const fileUidRef = useRef(0);
  const activeUploadsRef = useRef(0);
  const [fileList, setFileList] = useState<ImageKitUploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const uploading = activeUploads > 0;

  const customRequest = useCallback(
    async ({ file, onSuccess, onError }: ImageKitCustomRequestOptions) => {
      const fileUid = getUploadFileUid(file);

      if (!IMAGEKIT_PUBLIC_KEY) {
        const uploadError = new Error("Missing IMAGEKIT_PUBLIC_KEY");
        setError(uploadError.message);
        onError?.(uploadError);
        return;
      }

      setError(null);
      activeUploadsRef.current += 1;
      setActiveUploads((n) => n + 1);
      try {
        const { data, error: authError } =
          await supabase.functions.invoke("imagekit-auth");
        if (authError || !data) {
          throw new Error("ImageKit 인증에 실패했습니다.");
        }
        const { signature, token, expire } = data as {
          signature: string;
          token: string;
          expire: number;
        };

        const response = await upload({
          file,
          fileName: getUploadFileName(file),
          signature,
          token,
          expire,
          publicKey: IMAGEKIT_PUBLIC_KEY,
          folder: "/products",
        });

        if (!response.url) {
          throw new Error("이미지 URL을 받지 못했습니다.");
        }

        const uploadedUrl = response.url;

        setFileList((prev) =>
          prev.map((item) =>
            item.uid === fileUid
              ? {
                  ...item,
                  status: "done",
                  url: uploadedUrl,
                  fileId: response.fileId ?? undefined,
                }
              : item,
          ),
        );
        onSuccess?.(response);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.";
        setError(errorMessage);
        if (fileUid) {
          setFileList((prev) => prev.filter((item) => item.uid !== fileUid));
        }
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
        setActiveUploads((n) => Math.max(0, n - 1));
      }
    },
    [],
  );

  const handleChange = useCallback(
    ({ fileList: nextFileList }: { fileList: ImageKitUploadFile[] }) => {
      setFileList((prev) =>
        nextFileList.map((nextFile) => {
          const existing = prev.find((item) => item.uid === nextFile.uid);

          return {
            ...nextFile,
            url: nextFile.url ?? existing?.url,
            fileId: nextFile.fileId ?? existing?.fileId,
          };
        }),
      );
    },
    [],
  );

  const handleRemove = useCallback((file: ImageKitUploadFile) => {
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  }, []);

  const initFromUrls = useCallback((urls: string[]) => {
    if (activeUploadsRef.current > 0) return;
    setFileList(
      urls.map((url) => ({
        uid: `existing-${++fileUidRef.current}`,
        name: url.split("/").pop() || "image",
        status: "done" as const,
        url,
        thumbUrl: url,
      })),
    );
  }, []);

  const initFromImageRefs = useCallback((refs: ImageItem[]) => {
    if (activeUploadsRef.current > 0) return;
    setFileList(
      refs.map(({ url, fileId }) => ({
        uid: `existing-${++fileUidRef.current}`,
        name: url.split("/").pop() || "image",
        status: "done" as const,
        url,
        thumbUrl: url,
        fileId,
      })),
    );
  }, []);

  const moveFile = useCallback((fromIndex: number, toIndex: number) => {
    setFileList((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const getUrls = useCallback((): string[] => {
    return fileList
      .filter(
        (file): file is ImageKitUploadFile & { url: string } =>
          file.status === "done" && file.url != null,
      )
      .map((file) => file.url);
  }, [fileList]);

  return {
    fileList,
    uploading,
    error,
    customRequest,
    handleChange,
    handleRemove,
    initFromUrls,
    initFromImageRefs,
    moveFile,
    getUrls,
  };
};
