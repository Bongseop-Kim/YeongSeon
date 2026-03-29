import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageUpload } from "@/features/custom-order/hooks/useImageUpload";

const { upload, getImageKitAuth, error } = vi.hoisted(() => ({
  upload: vi.fn(),
  getImageKitAuth: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@imagekit/react", () => ({
  upload,
}));

vi.mock("@/shared/lib/imagekit", () => ({
  IMAGEKIT_PUBLIC_KEY: "public-key",
  getImageKitAuth,
}));

vi.mock("@/shared/lib/toast", () => ({
  toast: {
    error,
  },
}));

describe("useImageUpload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    upload.mockReset();
    getImageKitAuth.mockReset();
    error.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("이미지를 업로드하고 refs를 반환한다", async () => {
    const file = new File(["a"], "image.jpg", { type: "image/jpeg" });
    getImageKitAuth.mockResolvedValue({
      signature: "sig",
      token: "token",
      expire: Math.floor(Date.now() / 1000) + 60,
    });
    upload.mockResolvedValueOnce({
      url: " https://cdn.example.com/image.jpg ",
      fileId: " file-1 ",
      name: "uploaded.jpg",
    });

    const { result } = renderHook(() => useImageUpload());

    await act(async () => {
      await result.current.uploadFile(file);
    });

    expect(result.current.uploadedImages).toEqual([
      {
        name: "uploaded.jpg",
        url: " https://cdn.example.com/image.jpg ",
        fileId: " file-1 ",
      },
    ]);
    expect(result.current.getImageRefs()).toEqual([
      { url: "https://cdn.example.com/image.jpg", fileId: "file-1" },
    ]);

    act(() => {
      result.current.removeImage(0);
    });
    expect(result.current.uploadedImages).toEqual([]);
  });

  it("auth 캐시를 재사용하고 업로드 실패를 처리한다", async () => {
    const file = new File(["a"], "image.jpg", { type: "image/jpeg" });
    getImageKitAuth.mockResolvedValue({
      signature: "sig",
      token: "token",
      expire: Math.floor(Date.now() / 1000) + 60,
    });
    upload
      .mockResolvedValueOnce({
        url: "https://cdn.example.com/image-1.jpg",
        fileId: "file-1",
      })
      .mockResolvedValueOnce({
        url: null,
        fileId: "file-2",
      });

    const { result } = renderHook(() => useImageUpload());

    await act(async () => {
      await result.current.uploadFile(file);
      await result.current.uploadFile(file);
    });

    expect(getImageKitAuth).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith("이미지 URL을 받지 못했습니다.");
    expect(result.current.isUploading).toBe(false);
  });
});
