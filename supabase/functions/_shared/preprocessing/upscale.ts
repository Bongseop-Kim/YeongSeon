import { callFalClarityUpscaler } from "@/functions/_shared/fal-client.ts";
import { bytesToBase64 } from "@/functions/_shared/color.ts";

const MIN_ACCEPTABLE_DIMENSION = 512;

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface MaybeUpscaleReferenceInput {
  base64: string;
  mimeType: string;
  apiKey: string;
}

export interface MaybeUpscaleReferenceResult {
  base64: string;
  mimeType: string;
  upscaled: boolean;
}

export function needsUpscale(dimensions: ImageDimensions): boolean {
  return (
    Math.min(dimensions.width, dimensions.height) < MIN_ACCEPTABLE_DIMENSION
  );
}

export function readImageDimensions(
  base64: string,
  mimeType: string,
): ImageDimensions {
  const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const view = new DataView(
    binary.buffer,
    binary.byteOffset,
    binary.byteLength,
  );

  if (mimeType === "image/png") {
    return {
      width: view.getUint32(16, false),
      height: view.getUint32(20, false),
    };
  }

  if (mimeType === "image/jpeg") {
    let offset = 2;

    while (offset < binary.length) {
      if (offset + 1 >= binary.length) {
        break;
      }

      if (binary[offset] !== 0xff) {
        break;
      }

      const marker = binary[offset + 1];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        if (offset + 8 >= binary.length) {
          break;
        }

        return {
          height: (binary[offset + 5] << 8) | binary[offset + 6],
          width: (binary[offset + 7] << 8) | binary[offset + 8],
        };
      }

      if (offset + 3 >= binary.length) {
        break;
      }

      const segmentLength = (binary[offset + 2] << 8) | binary[offset + 3];
      if (segmentLength <= 0 || offset + 2 + segmentLength > binary.length) {
        break;
      }

      offset += 2 + segmentLength;
    }

    throw new Error("JPEG dimensions not found");
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}

export async function maybeUpscaleReference(
  input: MaybeUpscaleReferenceInput,
): Promise<MaybeUpscaleReferenceResult> {
  const dimensions = readImageDimensions(input.base64, input.mimeType);
  if (!needsUpscale(dimensions)) {
    return {
      base64: input.base64,
      mimeType: input.mimeType,
      upscaled: false,
    };
  }

  const result = await callFalClarityUpscaler({
    imageBase64: input.base64,
    imageMimeType: input.mimeType,
    apiKey: input.apiKey,
  });
  const response = await fetch(result.imageUrl, {
    signal: AbortSignal.timeout(30_000),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!response.ok) {
    throw new Error(
      `Upscaled image download failed: ${response.status} ${contentType} ${result.imageUrl}`,
    );
  }

  if (!contentType.startsWith("image/")) {
    throw new Error(
      `Upscaled image download returned non-image content: ${response.status} ${contentType} ${result.imageUrl}`,
    );
  }

  const buffer = await response.arrayBuffer();

  return {
    base64: bytesToBase64(new Uint8Array(buffer)),
    mimeType: contentType,
    upscaled: true,
  };
}
