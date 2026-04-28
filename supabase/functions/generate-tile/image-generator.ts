import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import {
  buildAllowedReferenceImageHosts,
  validateRemoteReferenceImageUrl,
} from "@/functions/_shared/reference-image-validation.ts";

export interface GeneratedTile {
  url: string;
  workId: string;
}

const REFERENCE_IMAGE_TIMEOUT_MS = 5000;
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REFERENCE_IMAGE_COUNT = 8;
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
  buildAllowedReferenceImageHosts({
    supabaseUrl: getOptionalEnv("SUPABASE_URL"),
    imagekitUrlEndpoint:
      getOptionalEnv("IMAGEKIT_URL_ENDPOINT") ??
      getOptionalEnv("VITE_IMAGEKIT_URL_ENDPOINT"),
  });

export const validateReferenceImageUrl = (
  value: string,
  allowedHosts?: readonly string[],
): string | null =>
  validateRemoteReferenceImageUrl(
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

export async function fetchReferenceImage(
  url: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
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
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onAbort);
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

const isAbortError = (reason: unknown): boolean =>
  reason instanceof DOMException
    ? reason.name === "AbortError"
    : reason instanceof Error && reason.name === "AbortError";

export function selectReferenceImageFailure<T>(
  imageResults: PromiseSettledResult<T>[],
): PromiseRejectedResult | null {
  const failedImage = imageResults.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (!failedImage) return null;

  return (
    imageResults.find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected" && !isAbortError(result.reason),
    ) ?? failedImage
  );
}

export async function generateTileImage(
  prompt: string,
  referenceImageUrls: string[],
  workId = crypto.randomUUID(),
): Promise<GeneratedTile> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");

  let b64: string;

  if (referenceImageUrls.length > 0) {
    if (referenceImageUrls.length > MAX_REFERENCE_IMAGE_COUNT) {
      throw new Error(
        `Too many reference images: maximum ${MAX_REFERENCE_IMAGE_COUNT}`,
      );
    }

    const trustedUrls = referenceImageUrls.map((url) => {
      const trusted = validateReferenceImageUrl(url);
      if (!trusted) throw new Error("Invalid reference image URL");
      return trusted;
    });

    const controllers = trustedUrls.map(() => new AbortController());
    const imageResults = await Promise.allSettled(
      trustedUrls.map((url, index) =>
        fetchReferenceImage(url, controllers[index].signal).catch((error) => {
          controllers.forEach((controller, controllerIndex) => {
            if (controllerIndex !== index) {
              controller.abort();
            }
          });
          throw error;
        }),
      ),
    );
    const failedImage = selectReferenceImageFailure(imageResults);
    if (failedImage) {
      controllers.forEach((controller) => controller.abort());
      throw failedImage.reason;
    }
    const imageBlobs = imageResults.map(
      (result) => (result as PromiseFulfilledResult<Blob>).value,
    );

    const form = new FormData();
    for (const [key, val] of Object.entries(OPENAI_IMAGE_PARAMS)) {
      form.append(key, String(val));
    }
    form.append("prompt", prompt);
    for (const blob of imageBlobs) {
      form.append("image[]", blob, referenceFileName(blob));
    }

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
