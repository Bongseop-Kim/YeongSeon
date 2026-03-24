import { upload } from "@imagekit/react";
import { IMAGEKIT_PUBLIC_KEY, getImageKitAuth } from "@/lib/imagekit";
import { IMAGE_FOLDERS } from "@yeongseon/shared";

interface UploadedImageRef {
  url: string;
  fileId: string;
}

function base64ToFile(base64DataUri: string, filename: string): File {
  const [header, data] = base64DataUri.split(",");
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], filename, { type: mime });
}

export async function uploadGeneratedImage(
  base64DataUri: string,
): Promise<UploadedImageRef | null> {
  try {
    const auth = await getImageKitAuth();
    const file = base64ToFile(
      base64DataUri,
      `design-${crypto.randomUUID()}.png`,
    );
    const response = await upload({
      file,
      fileName: file.name,
      signature: auth.signature,
      token: auth.token,
      expire: auth.expire,
      publicKey: IMAGEKIT_PUBLIC_KEY,
      folder: IMAGE_FOLDERS.DESIGN_SESSIONS,
    });

    if (!response.url || !response.fileId) return null;

    return { url: response.url, fileId: response.fileId };
  } catch {
    return null;
  }
}
