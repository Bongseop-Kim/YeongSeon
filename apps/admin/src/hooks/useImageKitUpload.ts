import { useState, useCallback, useRef } from "react";
import { upload } from "@imagekit/react";
import { message } from "antd";
import type { UploadFile, RcFile } from "antd/es/upload";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";

interface ImageItem {
  url: string;
  fileId?: string;
}

type UploadFileWithImageItem = UploadFile & { fileId?: string };

export const useImageKitUpload = () => {
  const fileUidRef = useRef(0);
  const activeUploadsRef = useRef(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const uploading = activeUploads > 0;

  const customRequest = useCallback(
    async (options: {
      file: string | RcFile | Blob;
      onSuccess?: (body: unknown) => void;
      onError?: (err: Error) => void;
    }) => {
      const { file, onSuccess, onError } = options;
      const rcFile = file as RcFile;

      if (!IMAGEKIT_PUBLIC_KEY) {
        const err = new Error("Missing IMAGEKIT_PUBLIC_KEY");
        message.error(err.message);
        onError?.(err);
        return;
      }

      activeUploadsRef.current += 1;
      setActiveUploads((n) => n + 1);
      try {
        const { data, error } =
          await supabase.functions.invoke("imagekit-auth");
        if (error || !data) {
          throw new Error("ImageKit 인증에 실패했습니다.");
        }
        const { signature, token, expire } = data as {
          signature: string;
          token: string;
          expire: number;
        };

        const response = await upload({
          file: rcFile,
          fileName: rcFile.name,
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
          prev.map((f) =>
            f.uid === rcFile.uid
              ? {
                  ...f,
                  status: "done",
                  url: uploadedUrl,
                  fileId: response.fileId ?? undefined,
                }
              : f,
          ),
        );
        onSuccess?.(response);
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.";
        message.error(errMsg);
        setFileList((prev) => prev.filter((f) => f.uid !== rcFile.uid));
        onError?.(err instanceof Error ? err : new Error(errMsg));
      } finally {
        activeUploadsRef.current = Math.max(0, activeUploadsRef.current - 1);
        setActiveUploads((n) => Math.max(0, n - 1));
      }
    },
    [],
  );

  const handleChange = useCallback(
    ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList((prev) =>
        newFileList.map((n) => {
          const existing = prev.find((p) => p.uid === n.uid) as
            | UploadFileWithImageItem
            | undefined;
          const nextFile = n as UploadFileWithImageItem;

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

  const handleRemove = useCallback((file: UploadFile) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
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
        (f): f is typeof f & { url: string } =>
          f.status === "done" && f.url != null,
      )
      .map((f) => f.url);
  }, [fileList]);

  /**
   * 초기화 함수와 읽기 함수는 반드시 쌍으로 사용해야 합니다.
   *
   * - `initFromUrls`   → `getUrls`      : URL 문자열만 필요한 경우 (e.g. 상품 이미지 URL 배열)
   * - `initFromImageRefs` → (별도 상태로 관리): ImageItem(fileId 포함)이 필요한 경우
   *
   * `initFromUrls`로 초기화한 뒤 fileId가 필요한 로직을 수행하면 fileId가 없어
   * 이미지 생명주기 추적이 불가능해집니다. 두 흐름을 혼용하지 마세요.
   */
  return {
    fileList,
    uploading,
    customRequest,
    handleChange,
    handleRemove,
    initFromUrls,
    initFromImageRefs,
    moveFile,
    getUrls,
  };
};
