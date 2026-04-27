import { upload } from "@imagekit/react";
import { getImageKitAuth, IMAGEKIT_PUBLIC_KEY } from "@/shared/lib/imagekit";
import { IMAGE_FOLDERS } from "@yeongseon/shared";

type AssetKind = "ci" | "reference" | "mask" | "base";

interface UploadResult {
  url: string;
  fileId: string;
  hash: string;
}

class UnsupportedMimeTypeError extends Error {
  readonly status = 415;

  constructor(mime: string) {
    super(`Unsupported MIME type: ${mime}`);
    this.name = "UnsupportedMimeTypeError";
  }
}

function extOf(mime: string): string {
  if (mime === "image/png") {
    return "png";
  }

  if (mime === "image/jpeg") {
    return "jpg";
  }

  if (mime === "image/webp") {
    return "webp";
  }

  throw new UnsupportedMimeTypeError(mime);
}

async function hashBlob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const bytes = new Uint8Array(digest);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function uploadDesignAsset(
  blob: Blob,
  options: { kind: AssetKind },
): Promise<UploadResult> {
  const hash = await hashBlob(blob);
  const extension = extOf(blob.type);
  const { signature, token, expire } = await getImageKitAuth();
  const response = await upload({
    file: blob,
    fileName: `${options.kind}-${crypto.randomUUID()}.${extension}`,
    signature,
    token,
    expire,
    publicKey: IMAGEKIT_PUBLIC_KEY,
    folder: IMAGE_FOLDERS.DESIGN_SESSIONS,
  });

  if (!response.url) {
    throw new Error("이미지 URL을 받지 못했습니다.");
  }
  if (!response.fileId) {
    throw new Error("파일 ID를 받지 못했습니다.");
  }

  return {
    url: response.url,
    fileId: response.fileId,
    hash,
  };
}
