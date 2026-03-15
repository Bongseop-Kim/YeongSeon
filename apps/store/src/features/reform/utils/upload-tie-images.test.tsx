import { describe, expect, it, vi } from "vitest";

const { upload, getImageKitAuth } = vi.hoisted(() => ({
  upload: vi.fn(),
  getImageKitAuth: vi.fn(),
}));

vi.mock("@imagekit/react", () => ({
  upload,
}));

vi.mock("@/lib/imagekit", () => ({
  IMAGEKIT_PUBLIC_KEY: "public-key",
}));

vi.mock("@/features/reform/api/reform-api", () => ({
  getImageKitAuth,
}));

import { uploadTieImages } from "@/features/reform/utils/upload-tie-images";

describe("uploadTieImages", () => {
  it("파일 이미지가 없으면 그대로 반환한다", async () => {
    const ties = [{ id: "tie-1", image: "https://example.com/tie.jpg" }];

    await expect(uploadTieImages(ties)).resolves.toBe(ties);
    expect(getImageKitAuth).not.toHaveBeenCalled();
  });

  it("파일 이미지를 업로드하고 url/fileId로 치환한다", async () => {
    const file = new File(["a"], "tie.jpg", { type: "image/jpeg" });
    getImageKitAuth.mockResolvedValueOnce({
      signature: "sig",
      token: "token",
      expire: 123,
    });
    upload.mockResolvedValueOnce({
      url: "https://cdn.example.com/tie.jpg",
      fileId: "file-1",
      name: "uploaded.jpg",
    });

    await expect(
      uploadTieImages([{ id: "tie-1", image: file }]),
    ).resolves.toEqual([
      {
        id: "tie-1",
        image: "https://cdn.example.com/tie.jpg",
        fileId: "file-1",
      },
    ]);
  });

  it("응답에 url 또는 fileId가 없으면 에러를 던진다", async () => {
    const file = new File(["a"], "tie.jpg", { type: "image/jpeg" });
    getImageKitAuth.mockResolvedValue({
      signature: "sig",
      token: "token",
      expire: 123,
    });
    upload.mockResolvedValueOnce({ fileId: "file-1" });
    await expect(
      uploadTieImages([{ id: "tie-1", image: file }]),
    ).rejects.toThrow("이미지 URL을 받지 못했습니다.");

    upload.mockResolvedValueOnce({ url: "https://cdn.example.com/tie.jpg" });
    await expect(
      uploadTieImages([{ id: "tie-1", image: file }]),
    ).rejects.toThrow("파일 ID를 받지 못했습니다.");
  });
});
