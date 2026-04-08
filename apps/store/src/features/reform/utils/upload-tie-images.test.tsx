import { describe, expect, it, vi } from "vitest";

const { upload, getImageKitAuth } = vi.hoisted(() => ({
  upload: vi.fn(),
  getImageKitAuth: vi.fn(),
}));
const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@imagekit/react", () => ({
  upload,
}));

vi.mock("@/shared/lib/imagekit", () => ({
  IMAGEKIT_PUBLIC_KEY: "public-key",
  getImageKitAuth,
}));

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    rpc,
  },
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
    rpc.mockResolvedValueOnce({ error: null });

    await expect(
      uploadTieImages([{ id: "tie-1", image: file }]),
    ).resolves.toEqual([
      {
        id: "tie-1",
        image: "https://cdn.example.com/tie.jpg",
        fileId: "file-1",
      },
    ]);
    expect(rpc).toHaveBeenCalledWith("register_reform_upload", {
      p_url: "https://cdn.example.com/tie.jpg",
      p_file_id: "file-1",
    });
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

  it("임시 업로드 레코드 등록에 실패하면 에러를 던진다", async () => {
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
    rpc.mockResolvedValueOnce({
      error: { message: "register failed" },
    });

    await expect(
      uploadTieImages([{ id: "tie-1", image: file }]),
    ).rejects.toThrow("수선 이미지 등록에 실패했습니다: register failed");
  });
});
