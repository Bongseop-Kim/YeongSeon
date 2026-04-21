import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadDesignAsset } from "@/entities/design/api/upload-design-asset";

const uploadMock = vi.fn();
const createSignedUrlMock = vi.fn();
const getUserMock = vi.fn();

vi.mock("@/shared/lib/supabase", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => getUserMock(...args) },
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => uploadMock(...args),
        createSignedUrl: (...args: unknown[]) => createSignedUrlMock(...args),
      }),
    },
  },
}));

describe("uploadDesignAsset", () => {
  beforeEach(() => {
    uploadMock.mockReset();
    createSignedUrlMock.mockReset();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("업로드 성공 시 signedUrl, storagePath, hash를 반환한다", async () => {
    uploadMock.mockResolvedValueOnce({
      data: { path: "user-1/20260421/ci-abc.png" },
      error: null,
    });
    createSignedUrlMock.mockResolvedValueOnce({
      data: { signedUrl: "https://sb.example/sign/x" },
      error: null,
    });

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const result = await uploadDesignAsset(blob, { kind: "ci" });

    expect(result.storagePath).toMatch(/^user-1\/\d{8}\//);
    expect(result.signedUrl).toBe("https://sb.example/sign/x");
    expect(result.hash).toMatch(/^[0-9a-f]+$/);
  });

  it("업로드 실패 시 에러를 throw한다", async () => {
    uploadMock.mockResolvedValueOnce({
      data: null,
      error: new Error("storage-fail"),
    });

    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "image/png" }), { kind: "ci" }),
    ).rejects.toThrow("storage-fail");
  });

  it("인증 사용자가 없으면 에러를 throw한다", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "image/png" }), { kind: "ci" }),
    ).rejects.toThrow(/unauthenticated/);
  });
});
