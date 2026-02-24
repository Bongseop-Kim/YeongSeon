import { useState, useCallback } from "react";
import { upload } from "@imagekit/react";
import { message } from "antd";
import type { UploadFile, RcFile } from "antd/es/upload";
import { supabase } from "@/lib/supabase";
import { IMAGEKIT_PUBLIC_KEY } from "@/lib/imagekit";

let fileUid = 0;

export const useImageKitUpload = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeUploads, setActiveUploads] = useState(0);
  const uploading = activeUploads > 0;

  const customRequest = useCallback(async (options: {
    file: string | RcFile | Blob;
    onSuccess?: (body: unknown) => void;
    onError?: (err: Error) => void;
  }) => {
    const { file, onSuccess, onError } = options;
    const rcFile = file as RcFile;

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

      setFileList((prev) =>
        prev.map((f) =>
          f.uid === rcFile.uid
            ? { ...f, status: "done", url: response.url! }
            : f
        )
      );
      onSuccess?.(response);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "이미지 업로드에 실패했습니다.";
      message.error(errMsg);
      setFileList((prev) => prev.filter((f) => f.uid !== rcFile.uid));
      onError?.(err instanceof Error ? err : new Error(errMsg));
    } finally {
      setActiveUploads((n) => Math.max(0, n - 1));
    }
  }, []);

  const handleChange = useCallback(
    ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
      setFileList(newFileList);
    },
    []
  );

  const handleRemove = useCallback((file: UploadFile) => {
    setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
  }, []);

  const initFromUrls = useCallback((urls: string[]) => {
    setFileList(
      urls.map((url) => ({
        uid: `existing-${++fileUid}`,
        name: url.split("/").pop() || "image",
        status: "done" as const,
        url,
        thumbUrl: url,
      }))
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
      .filter((f) => f.status === "done" && f.url)
      .map((f) => f.url!);
  }, [fileList]);

  return {
    fileList,
    uploading,
    customRequest,
    handleChange,
    handleRemove,
    initFromUrls,
    moveFile,
    getUrls,
  };
};
