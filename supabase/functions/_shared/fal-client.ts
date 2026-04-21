export interface CallFalFluxImg2ImgInput {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
  strength?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface FalImageJobResult {
  imageUrl: string;
  requestId: string;
}

export interface CallFalNanoBananaEditInput {
  imageUrls: string[];
  prompt: string;
  seed?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalClarityUpscalerInput {
  imageBase64: string;
  imageMimeType: string;
  apiKey: string;
  scale?: 2 | 4;
  timeoutMs?: number;
}

export interface CallFalFluxIpAdapterInput {
  referenceBase64: string;
  referenceMimeType: string;
  prompt: string;
  weight?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalFluxFillInput {
  imageBase64: string;
  imageMimeType: string;
  maskBase64: string;
  maskMimeType: string;
  prompt: string;
  apiKey: string;
  timeoutMs?: number;
}

interface FalQueueSubmitResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  cancel_url?: string;
  queue_position?: number;
}

interface FalQueueStatusResponse {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  error?: string;
  message?: string;
}

interface FalResultResponse {
  images?: Array<{ url?: string }>;
}

const FAL_FLUX_ENDPOINT =
  "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
const FAL_FLUX_GENERAL_IMAGE_TO_IMAGE_ENDPOINT =
  "https://queue.fal.run/fal-ai/flux-general/image-to-image";
const FAL_NANO_BANANA_EDIT_ENDPOINT =
  "https://queue.fal.run/fal-ai/nano-banana-2/edit";
const FAL_CLARITY_UPSCALER_ENDPOINT =
  "https://queue.fal.run/fal-ai/clarity-upscaler";
const FAL_FLUX_FILL_ENDPOINT = "https://queue.fal.run/fal-ai/flux-pro/v1/fill";
const FAL_FLUX_DEFAULT_PARAMS = {
  num_inference_steps: 28,
  guidance_scale: 3.5,
  num_images: 1,
} as const;
const FAL_IP_ADAPTER_PATH = "h94/IP-Adapter";
const FAL_IP_ADAPTER_IMAGE_ENCODER_PATH = "openai/clip-vit-large-patch14";
const buildDataUri = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60000;
const TRUSTED_FAL_QUEUE_HOST = "queue.fal.run";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const abortSignal = signal;

    if (abortSignal?.aborted) {
      reject(abortSignal.reason);
      return;
    }

    const timeoutId = setTimeout(() => {
      abortSignal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      abortSignal?.removeEventListener("abort", onAbort);
      reject(abortSignal?.reason);
    };

    abortSignal?.addEventListener("abort", onAbort, { once: true });
  });

const assertTrustedFalQueueUrl = (value: string, fieldName: string): string => {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`Unexpected Fal queue URL for ${fieldName}`);
  }

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== TRUSTED_FAL_QUEUE_HOST
  ) {
    throw new Error(`Unexpected Fal queue URL for ${fieldName}`);
  }

  return parsedUrl.toString();
};

async function callFalImageEndpoint(input: {
  endpoint: string;
  apiKey: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<{ imageUrl: string; requestId: string }> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);

  const submitResponse = await fetch(input.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${input.apiKey}`,
    },
    body: JSON.stringify(input.body),
    signal: timeoutSignal,
  });

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text();
    throw new Error(
      `Fal.ai submit failed: ${submitResponse.status} ${errorText}`,
    );
  }

  const submitData = (await submitResponse.json()) as FalQueueSubmitResponse;
  const requestId = submitData.request_id;

  if (!requestId) {
    throw new Error("Fal.ai submit did not return request_id");
  }

  const statusUrl = submitData.status_url;
  const resultUrl = submitData.response_url;

  if (!statusUrl) {
    throw new Error("Fal.ai submit did not return status_url");
  }

  if (!resultUrl) {
    throw new Error("Fal.ai submit did not return response_url");
  }

  const trustedStatusUrl = assertTrustedFalQueueUrl(statusUrl, "status_url");
  const trustedResultUrl = assertTrustedFalQueueUrl(resultUrl, "response_url");

  while (true) {
    const statusResponse = await fetch(trustedStatusUrl, {
      headers: { Authorization: `Key ${input.apiKey}` },
      signal: timeoutSignal,
    });

    if (!statusResponse.ok) {
      throw new Error(`Fal.ai status failed: ${statusResponse.status}`);
    }

    const status = (await statusResponse.json()) as FalQueueStatusResponse;

    if (status.status === "COMPLETED") {
      const resultResponse = await fetch(trustedResultUrl, {
        headers: { Authorization: `Key ${input.apiKey}` },
        signal: timeoutSignal,
      });

      if (!resultResponse.ok) {
        throw new Error(`Fal.ai result failed: ${resultResponse.status}`);
      }

      const result = (await resultResponse.json()) as FalResultResponse;
      const imageUrl = result.images?.[0]?.url;

      if (!imageUrl) {
        throw new Error("Fal.ai result did not include image URL");
      }

      return { imageUrl, requestId };
    }

    if (status.status === "FAILED") {
      const failureDetails =
        status.error ?? status.message ?? JSON.stringify(status);
      throw new Error(`Fal.ai generation failed: ${failureDetails}`);
    }

    await sleep(POLL_INTERVAL_MS, timeoutSignal);
  }
}

export async function callFalFluxImg2Img(
  input: CallFalFluxImg2ImgInput,
): Promise<FalImageJobResult> {
  const strength = input.strength ?? 0.3;
  const dataUri = buildDataUri(input.imageMimeType, input.imageBase64);

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: dataUri,
      prompt: input.prompt,
      strength,
      ...FAL_FLUX_DEFAULT_PARAMS,
      image_size: { width: 1024, height: 1024 },
    },
  });
}

export async function callFalNanoBananaEdit(
  input: CallFalNanoBananaEditInput,
): Promise<FalImageJobResult> {
  return callFalImageEndpoint({
    endpoint: FAL_NANO_BANANA_EDIT_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      prompt: input.prompt,
      image_urls: input.imageUrls,
      seed: input.seed,
      output_format: "png",
      resolution: "1K",
      aspect_ratio: "auto",
      limit_generations: true,
      num_images: 1,
    },
  });
}

export async function callFalClarityUpscaler(
  input: CallFalClarityUpscalerInput,
): Promise<FalImageJobResult> {
  const dataUri = buildDataUri(input.imageMimeType, input.imageBase64);

  return callFalImageEndpoint({
    endpoint: FAL_CLARITY_UPSCALER_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: dataUri,
      scale: input.scale ?? 2,
    },
  });
}

export async function callFalFluxIpAdapter(
  input: CallFalFluxIpAdapterInput,
): Promise<FalImageJobResult> {
  const dataUri = buildDataUri(input.referenceMimeType, input.referenceBase64);

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_GENERAL_IMAGE_TO_IMAGE_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: dataUri,
      prompt: input.prompt,
      ip_adapters: [
        {
          path: FAL_IP_ADAPTER_PATH,
          image_encoder_path: FAL_IP_ADAPTER_IMAGE_ENCODER_PATH,
          image_url: dataUri,
          scale: input.weight ?? 0.55,
        },
      ],
      ...FAL_FLUX_DEFAULT_PARAMS,
      image_size: { width: 1024, height: 1024 },
    },
  });
}

export async function callFalFluxFill(
  input: CallFalFluxFillInput,
): Promise<FalImageJobResult> {
  const imageUri = buildDataUri(input.imageMimeType, input.imageBase64);
  const maskUri = buildDataUri(input.maskMimeType, input.maskBase64);

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_FILL_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUri,
      mask_url: maskUri,
      prompt: input.prompt,
      ...FAL_FLUX_DEFAULT_PARAMS,
    },
  });
}
