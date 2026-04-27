import { encodeBase64 } from "jsr:@std/encoding/base64";

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_UPLOAD_TIMEOUT_MS = 5000;

export interface ImageKitUploadResult {
  url: string;
  fileId: string;
}

const stripDataUriPrefix = (value: string): string => {
  const trimmedValue = value.trim();
  const commaIndex = trimmedValue.indexOf(",");
  if (commaIndex >= 0) {
    return trimmedValue.slice(commaIndex + 1);
  }
  if (trimmedValue.startsWith("data:")) {
    throw new Error("malformed data URI: missing comma");
  }
  return trimmedValue;
};

async function attemptUpload(
  base64: string,
  fileName: string,
  folder: string,
  privateKey: string,
): Promise<ImageKitUploadResult | null> {
  try {
    const formData = new FormData();
    formData.append("file", base64);
    formData.append("fileName", fileName);
    formData.append("folder", folder);

    const credentials = btoa(`${privateKey}:`);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      IMAGEKIT_UPLOAD_TIMEOUT_MS,
    );
    let response: Response;
    try {
      response = await fetch(IMAGEKIT_UPLOAD_URL, {
        method: "POST",
        headers: { Authorization: `Basic ${credentials}` },
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ImageKit upload failed (${response.status}):`, errText);
      return null;
    }

    const result = (await response.json()) as { url?: string; fileId?: string };
    if (!result.url || !result.fileId) {
      console.error("ImageKit response missing url or fileId:", result);
      return null;
    }

    return { url: result.url, fileId: result.fileId };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error(
        `ImageKit upload timed out after ${IMAGEKIT_UPLOAD_TIMEOUT_MS}ms: ${IMAGEKIT_UPLOAD_URL}`,
      );
      return null;
    }
    console.error("ImageKit upload error:", err);
    return null;
  }
}

/**
 * Uint8Array 이미지를 ImageKit에 업로드한다.
 * 실패 시 null 반환 (예외를 던지지 않음).
 */
export async function uploadBytesToImageKit(
  bytes: Uint8Array,
  fileName: string,
  folder: string,
): Promise<ImageKitUploadResult | null> {
  const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
  if (!privateKey) {
    console.error("IMAGEKIT_PRIVATE_KEY 환경 변수가 설정되지 않음");
    return null;
  }

  const base64 = encodeBase64(bytes);

  return await attemptUpload(base64, fileName, folder, privateKey);
}

/**
 * base64 DataURI 이미지를 ImageKit에 업로드한다.
 * 실패 시 null 반환 (예외를 던지지 않음).
 *
 * @param base64DataUri - "data:image/png;base64,..." 형식 또는 순수 base64
 * @param fileName - 업로드할 파일명 (예: "design-abc.png")
 * @param folder - ImageKit 폴더 경로 (예: "/design-sessions")
 */
export async function uploadImageToImageKit(
  base64DataUri: string,
  fileName: string,
  folder: string,
): Promise<ImageKitUploadResult | null> {
  try {
    const dataUri = base64DataUri.trim();
    const base64 = stripDataUriPrefix(dataUri);

    const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY 환경 변수가 설정되지 않음");
      return null;
    }

    return await attemptUpload(base64, fileName, folder, privateKey);
  } catch (err) {
    console.error("ImageKit base64 decode error:", err);
    return null;
  }
}
