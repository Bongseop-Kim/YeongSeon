import { renderHook, act, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadFile } from "antd/es/upload";

type LoadHookOptions = {
  publicKey?: string;
};

async function loadHook(options: LoadHookOptions = {}) {
  const uploadMock = vi.fn();
  const invokeMock = vi.fn();
  const messageErrorMock = vi.fn();

  vi.resetModules();
  vi.doMock("@imagekit/react", () => ({
    upload: uploadMock,
  }));
  vi.doMock("antd", () => ({
    message: {
      error: messageErrorMock,
    },
  }));
  vi.doMock("@/lib/supabase", () => ({
    supabase: {
      functions: {
        invoke: invokeMock,
      },
    },
  }));
  vi.doMock("@/lib/imagekit", () => ({
    IMAGEKIT_PUBLIC_KEY: options.publicKey ?? "public-key",
  }));

  const mod = await import("@/hooks/useImageKitUpload");

  return {
    useImageKitUpload: mod.useImageKitUpload,
    uploadMock,
    invokeMock,
    messageErrorMock,
  };
}

function createUploadFile(
  overrides?: Partial<UploadFile>,
): UploadFile & { uid: string } {
  return {
    uid: "file-1",
    name: "image-1.jpg",
    status: "done",
    ...overrides,
  };
}

function createRcFile(name: string, uid: string) {
  const file = new File(["binary"], name, { type: "image/jpeg" });
  return Object.assign(file, { uid });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.doUnmock("@imagekit/react");
  vi.doUnmock("antd");
  vi.doUnmock("@/lib/supabase");
  vi.doUnmock("@/lib/imagekit");
});

describe("useImageKitUpload", () => {
  it("URL 목록으로 초기화하고 순서를 변경하고 삭제할 수 있다", async () => {
    const { useImageKitUpload } = await loadHook();
    const { result } = renderHook(() => useImageKitUpload());

    act(() => {
      result.current.initFromUrls([
        "https://cdn.example.com/a.jpg",
        "https://cdn.example.com/b.jpg",
      ]);
    });

    expect(result.current.fileList).toHaveLength(2);
    expect(result.current.getUrls()).toEqual([
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
    ]);

    act(() => {
      result.current.moveFile(0, 1);
    });

    expect(result.current.getUrls()).toEqual([
      "https://cdn.example.com/b.jpg",
      "https://cdn.example.com/a.jpg",
    ]);

    act(() => {
      result.current.handleRemove(result.current.fileList[0]);
    });

    expect(result.current.getUrls()).toEqual(["https://cdn.example.com/a.jpg"]);
  });

  it("image refs로 초기화하고 handleChange에서 기존 url/fileId를 유지한다", async () => {
    const { useImageKitUpload } = await loadHook();
    const { result } = renderHook(() => useImageKitUpload());

    act(() => {
      result.current.initFromImageRefs([
        {
          url: "https://cdn.example.com/original.jpg",
          fileId: "imagekit-file-1",
        },
      ]);
    });

    const existing = result.current.fileList[0] as UploadFile & {
      fileId?: string;
    };

    act(() => {
      result.current.handleChange({
        fileList: [
          {
            uid: existing.uid,
            name: existing.name,
            status: "done",
          } as UploadFile,
        ],
      });
    });

    expect(result.current.fileList[0]).toMatchObject({
      uid: existing.uid,
      url: "https://cdn.example.com/original.jpg",
      fileId: "imagekit-file-1",
    });
  });

  it("업로드 성공 시 fileList를 완료 상태로 갱신한다", async () => {
    const { useImageKitUpload, invokeMock, uploadMock } = await loadHook();
    const { result } = renderHook(() => useImageKitUpload());
    const rcFile = createRcFile("uploaded.jpg", "upload-1");
    const onSuccess = vi.fn();

    invokeMock.mockResolvedValue({
      data: {
        signature: "signature",
        token: "token",
        expire: 1234567890,
      },
      error: null,
    });
    uploadMock.mockResolvedValue({
      url: "https://cdn.example.com/uploaded.jpg",
      fileId: "file-123",
    });

    act(() => {
      result.current.handleChange({
        fileList: [
          createUploadFile({
            uid: "upload-1",
            name: "uploaded.jpg",
            status: "uploading",
          }),
        ],
      });
    });

    await act(async () => {
      await result.current.customRequest({
        file: rcFile,
        onSuccess,
      });
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
      expect(result.current.fileList[0]).toMatchObject({
        uid: "upload-1",
        status: "done",
        url: "https://cdn.example.com/uploaded.jpg",
        fileId: "file-123",
      });
    });

    expect(invokeMock).toHaveBeenCalledWith("imagekit-auth");
    expect(uploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        file: rcFile,
        fileName: "uploaded.jpg",
        publicKey: "public-key",
        folder: "/products",
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith({
      url: "https://cdn.example.com/uploaded.jpg",
      fileId: "file-123",
    });
  });

  it("업로드 중에는 초기화 요청을 무시한다", async () => {
    const { useImageKitUpload, invokeMock, uploadMock } = await loadHook();
    const { result } = renderHook(() => useImageKitUpload());
    const rcFile = createRcFile("blocking.jpg", "upload-2");

    let resolveInvoke:
      | ((value: {
          data: {
            signature: string;
            token: string;
            expire: number;
          };
          error: null;
        }) => void)
      | undefined;
    invokeMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInvoke = resolve;
        }),
    );
    uploadMock.mockResolvedValue({
      url: "https://cdn.example.com/blocking.jpg",
      fileId: "file-456",
    });

    act(() => {
      result.current.handleChange({
        fileList: [
          createUploadFile({
            uid: "upload-2",
            name: "blocking.jpg",
            status: "uploading",
          }),
        ],
      });
    });

    let requestPromise: Promise<void> = Promise.resolve();

    await act(async () => {
      requestPromise = result.current.customRequest({ file: rcFile });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(true);
    });

    act(() => {
      result.current.initFromUrls(["https://cdn.example.com/ignored.jpg"]);
      result.current.initFromImageRefs([
        {
          url: "https://cdn.example.com/ignored-ref.jpg",
          fileId: "ignored-file-id",
        },
      ]);
    });

    expect(result.current.fileList).toHaveLength(1);
    expect(result.current.fileList[0]).toMatchObject({
      uid: "upload-2",
      name: "blocking.jpg",
    });

    if (!resolveInvoke) {
      throw new Error("invoke resolver가 생성되지 않았습니다.");
    }
    const finishInvoke = resolveInvoke;

    await act(async () => {
      finishInvoke({
        data: {
          signature: "signature",
          token: "token",
          expire: 1234567890,
        },
        error: null,
      });
      await requestPromise;
    });

    await waitFor(() => {
      expect(result.current.uploading).toBe(false);
    });
  });

  it("public key가 없으면 에러를 알리고 onError를 호출한다", async () => {
    const { useImageKitUpload, messageErrorMock, invokeMock } = await loadHook({
      publicKey: "",
    });
    const { result } = renderHook(() => useImageKitUpload());
    const onError = vi.fn();

    await act(async () => {
      await result.current.customRequest({
        file: createRcFile("missing-key.jpg", "upload-3"),
        onError,
      });
    });

    expect(messageErrorMock).toHaveBeenCalledWith(
      "Missing IMAGEKIT_PUBLIC_KEY",
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("업로드 실패 시 에러를 노출하고 대상 파일을 제거한다", async () => {
    const { useImageKitUpload, invokeMock, messageErrorMock } =
      await loadHook();
    const { result } = renderHook(() => useImageKitUpload());
    const rcFile = createRcFile("failed.jpg", "upload-4");
    const onError = vi.fn();

    invokeMock.mockResolvedValue({
      data: null,
      error: { message: "auth failed" },
    });

    act(() => {
      result.current.handleChange({
        fileList: [
          createUploadFile({
            uid: "upload-4",
            name: "failed.jpg",
            status: "uploading",
          }),
        ],
      });
    });

    await act(async () => {
      await result.current.customRequest({
        file: rcFile,
        onError,
      });
    });

    expect(messageErrorMock).toHaveBeenCalledWith(
      "ImageKit 인증에 실패했습니다.",
    );
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.fileList).toEqual([]);
    expect(result.current.uploading).toBe(false);
  });
});
