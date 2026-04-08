const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

interface ImageKitUploadResult {
  url: string;
  fileId: string;
}

async function attemptUpload(
  base64DataUri: string,
  fileName: string,
  folder: string,
  privateKey: string,
): Promise<ImageKitUploadResult | null> {
  try {
    // base64 data URI에서 순수 base64 추출 (data:image/png;base64,... 형식 처리)
    const base64 = base64DataUri.includes(",")
      ? base64DataUri.split(",")[1]
      : base64DataUri;

    const formData = new FormData();
    formData.append("file", base64);
    formData.append("fileName", fileName);
    formData.append("folder", folder);

    const credentials = btoa(`${privateKey}:`);
    const response = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}` },
      body: formData,
    });

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
    console.error("ImageKit upload error:", err);
    return null;
  }
}

/**
 * base64 DataURI 이미지를 ImageKit에 업로드한다.
 * 실패 시 1회 재시도 후 null 반환 (예외를 던지지 않음).
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
  const privateKey = Deno.env.get("IMAGEKIT_PRIVATE_KEY");
  if (!privateKey) {
    console.error("IMAGEKIT_PRIVATE_KEY 환경 변수가 설정되지 않음");
    return null;
  }

  const result = await attemptUpload(
    base64DataUri,
    fileName,
    folder,
    privateKey,
  );
  if (result !== null) return result;

  // 1회 재시도
  console.warn("ImageKit 업로드 재시도 중...");
  return attemptUpload(base64DataUri, fileName, folder, privateKey);
}
