import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import {
  buildAllowedInpaintBaseImageHosts,
  validateRemoteInpaintBaseImageUrl,
} from "@/functions/_shared/generate-fal-api-utils.ts";

export interface GeneratedTile {
  url: string;
  workId: string;
}

const REFERENCE_IMAGE_TIMEOUT_MS = 5000;
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const REFERENCE_IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const getOptionalEnv = (name: string): string | undefined => {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) {
      return undefined;
    }
    throw error;
  }
};

const ALLOWED_REFERENCE_IMAGE_HOSTS: readonly string[] =
  buildAllowedInpaintBaseImageHosts({
    supabaseUrl: getOptionalEnv("SUPABASE_URL"),
    imagekitUrlEndpoint:
      getOptionalEnv("IMAGEKIT_URL_ENDPOINT") ??
      getOptionalEnv("VITE_IMAGEKIT_URL_ENDPOINT"),
  });

export const validateReferenceImageUrl = (
  value: string,
  allowedHosts?: readonly string[],
): string | null =>
  validateRemoteInpaintBaseImageUrl(
    value,
    allowedHosts ?? ALLOWED_REFERENCE_IMAGE_HOSTS,
  );

const OPENAI_IMAGE_PARAMS = {
  model: "gpt-image-2",
  quality: "low",
  size: "1024x1024",
  output_format: "webp",
  output_compression: 70,
  n: 1,
} as const;

async function parseB64FromOpenAiResponse(
  response: Response,
  endpoint: string,
): Promise<string> {
  const data = await response.json();
  const b64 = (data as { data?: Array<{ b64_json?: string }> }).data?.[0]
    ?.b64_json;
  if (!b64) throw new Error(`OpenAI ${endpoint} response missing b64_json`);
  return b64;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

export async function fetchReferenceImage(url: string): Promise<Blob> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    REFERENCE_IMAGE_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Reference image fetch failed: ${url}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_REFERENCE_IMAGE_BYTES) {
      throw new Error("Reference image exceeds maximum size");
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const blob = await response.blob();
      if (blob.size > MAX_REFERENCE_IMAGE_BYTES) {
        throw new Error("Reference image exceeds maximum size");
      }
      return blob;
    }

    const chunks: BlobPart[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REFERENCE_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error("Reference image exceeds maximum size");
      }
      chunks.push(value);
    }

    return new Blob(chunks, {
      type: response.headers.get("content-type") ?? "application/octet-stream",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Reference image fetch timed out after ${REFERENCE_IMAGE_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function referenceFileName(blob: Blob): string {
  const mimeType = blob.type.split(";")[0]?.trim().toLowerCase();
  const extension = mimeType ? REFERENCE_IMAGE_EXTENSIONS[mimeType] : null;
  if (!extension) {
    throw new Error(`Unsupported reference image MIME type: ${blob.type}`);
  }
  return `reference.${extension}`;
}

export async function generateTileImage(
  prompt: string,
  referenceImageUrl: string | null,
  workId = crypto.randomUUID(),
): Promise<GeneratedTile> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  let b64: string;

  if (referenceImageUrl) {
    const trustedReferenceImageUrl =
      validateReferenceImageUrl(referenceImageUrl);
    if (!trustedReferenceImageUrl) {
      throw new Error("Invalid reference image URL");
    }

    const imageBlob = await fetchReferenceImage(trustedReferenceImageUrl);

    const form = new FormData();
    for (const [key, val] of Object.entries(OPENAI_IMAGE_PARAMS)) {
      form.append(key, String(val));
    }
    form.append("prompt", prompt);
    form.append("image", imageBlob, referenceFileName(imageBlob));

    const editsResponse = await fetch(
      "https://api.openai.com/v1/images/edits",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: form,
      },
    );
    if (!editsResponse.ok) {
      throw new Error(`OpenAI edits error: ${await editsResponse.text()}`);
    }
    b64 = await parseB64FromOpenAiResponse(editsResponse, "edits");
  } else {
    const generationsResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...OPENAI_IMAGE_PARAMS, prompt }),
      },
    );
    if (!generationsResponse.ok) {
      throw new Error(
        `OpenAI generations error: ${await generationsResponse.text()}`,
      );
    }
    b64 = await parseB64FromOpenAiResponse(generationsResponse, "generations");
  }

  const fileName = `tile-${workId}.webp`;
  const uploaded = await uploadImageToImageKit(b64, fileName, "tiles").catch(
    (error: unknown) => {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `ImageKit upload failed for workId=${workId} fileName=${fileName}: ${reason}`,
      );
    },
  );
  if (!uploaded) {
    throw new Error(
      `ImageKit upload returned null for workId=${workId} fileName=${fileName}`,
    );
  }

  return { url: uploaded.url, workId };
}
