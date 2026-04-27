import { beforeEach, describe, expect, it, vi } from "vitest";
import { upload } from "@imagekit/react";
import type { UploadResponse } from "@imagekit/react";
import { uploadDesignAsset } from "@/entities/design/api/upload-design-asset";
import { getImageKitAuth, IMAGEKIT_PUBLIC_KEY } from "@/shared/lib/imagekit";
import { IMAGE_FOLDERS } from "@yeongseon/shared";

vi.mock("@imagekit/react", () => ({
  upload: vi.fn(),
}));

vi.mock("@/shared/lib/imagekit", () => ({
  IMAGEKIT_PUBLIC_KEY: "public-key",
  getImageKitAuth: vi.fn(),
}));

const uploadMock = vi.mocked(upload);
const getImageKitAuthMock = vi.mocked(getImageKitAuth);

function uploadResponse(
  overrides: Omit<Partial<UploadResponse>, "$ResponseMetadata">,
): UploadResponse {
  return {
    $ResponseMetadata: {
      statusCode: 200,
      requestId: "request-1",
      headers: {},
    },
    ...overrides,
  };
}

describe("uploadDesignAsset", () => {
  beforeEach(() => {
    uploadMock.mockReset();
    getImageKitAuthMock.mockReset();
    getImageKitAuthMock.mockResolvedValue({
      signature: "signature",
      token: "token",
      expire: 1234567890,
    });
  });

  it("업로드 성공 시 ImageKit url, fileId, hash를 반환한다", async () => {
    uploadMock.mockResolvedValueOnce(
      uploadResponse({
        url: "https://ik.imagekit.io/essesion/design-sessions/reference.png",
        fileId: "imagekit-file-1",
        name: "reference.png",
      }),
    );

    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const result = await uploadDesignAsset(blob, { kind: "reference" });

    expect(uploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        file: blob,
        fileName: expect.stringMatching(/^reference-[0-9a-f-]+\.png$/),
        signature: "signature",
        token: "token",
        expire: 1234567890,
        publicKey: IMAGEKIT_PUBLIC_KEY,
        folder: IMAGE_FOLDERS.DESIGN_SESSIONS,
      }),
    );
    expect(result.url).toBe(
      "https://ik.imagekit.io/essesion/design-sessions/reference.png",
    );
    expect(result.fileId).toBe("imagekit-file-1");
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("해시 계산이 실패하면 업로드를 시작하지 않고 에러를 throw한다", async () => {
    const blob = new Blob(["x"], { type: "image/png" });
    vi.spyOn(blob, "arrayBuffer").mockRejectedValueOnce(new Error("hash-fail"));

    await expect(uploadDesignAsset(blob, { kind: "ci" })).rejects.toThrow(
      "hash-fail",
    );

    expect(getImageKitAuthMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("지원하지 않는 MIME type은 415 에러로 거절한다", async () => {
    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "application/pdf" }), {
        kind: "ci",
      }),
    ).rejects.toMatchObject({
      message: "Unsupported MIME type: application/pdf",
      status: 415,
    });
    expect(getImageKitAuthMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it("ImageKit 응답에 url이 없으면 에러를 throw한다", async () => {
    uploadMock.mockResolvedValueOnce(
      uploadResponse({
        fileId: "imagekit-file-1",
      }),
    );

    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "image/png" }), { kind: "ci" }),
    ).rejects.toThrow("이미지 URL을 받지 못했습니다.");
  });

  it("ImageKit 응답에 fileId가 없으면 에러를 throw한다", async () => {
    uploadMock.mockResolvedValueOnce(
      uploadResponse({
        url: "https://ik.imagekit.io/essesion/design-sessions/ci.png",
      }),
    );

    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "image/png" }), { kind: "ci" }),
    ).rejects.toThrow("파일 ID를 받지 못했습니다.");
  });

  it("ImageKit 업로드 실패 시 에러를 throw한다", async () => {
    uploadMock.mockRejectedValueOnce(new Error("imagekit-fail"));

    await expect(
      uploadDesignAsset(new Blob(["x"], { type: "image/png" }), { kind: "ci" }),
    ).rejects.toThrow("imagekit-fail");
  });
});
