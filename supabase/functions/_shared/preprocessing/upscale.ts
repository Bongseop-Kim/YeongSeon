import { callFalClarityUpscaler } from "@/functions/_shared/fal-client.ts";

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

const bytesToBase64 = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));

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

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    let offset = 2;

    while (offset < binary.length) {
      if (binary[offset] !== 0xff) {
        break;
      }

      const marker = binary[offset + 1];
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8
      ) {
        return {
          height: (binary[offset + 5] << 8) | binary[offset + 6],
          width: (binary[offset + 7] << 8) | binary[offset + 8],
        };
      }

      const segmentLength = (binary[offset + 2] << 8) | binary[offset + 3];
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
  const response = await fetch(result.imageUrl);
  const buffer = await response.arrayBuffer();

  return {
    base64: bytesToBase64(new Uint8Array(buffer)),
    mimeType: response.headers.get("content-type") ?? "image/png",
    upscaled: true,
  };
}
