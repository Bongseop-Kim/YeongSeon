import { uploadBase64ToFalStorage } from "@/functions/_shared/fal-storage.ts";

export interface CallFalFluxImg2ImgInput {
  imageBase64: string;
  imageMimeType: string;
  imageUrl?: string;
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
  imageUrl?: string;
  apiKey: string;
  scale?: 2 | 4;
  timeoutMs?: number;
}

export interface CallFalFluxIpAdapterInput {
  referenceBase64: string;
  referenceMimeType: string;
  imageUrl?: string;
  prompt: string;
  weight?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalFluxControlNetInput {
  controlImageBase64: string;
  controlImageMimeType: string;
  imageUrl?: string;
  prompt: string;
  controlType: "lineart" | "edge" | "depth";
  conditioningScale?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalFluxFillInput {
  imageBase64: string;
  imageMimeType: string;
  imageUrl?: string;
  maskBase64: string;
  maskMimeType: string;
  maskUrl?: string;
  prompt: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalWorkflowInput {
  slug: string;
  input: Record<string, unknown>;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalReferenceToIpAdapterWorkflowInput {
  referenceBase64: string;
  referenceMimeType: string;
  imageUrl?: string;
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
const FAL_CONTROLNET_LINEART_PATH = "XLabs-AI/flux-controlnet-lineart";
const FAL_CONTROLNET_CANNY_PATH = "XLabs-AI/flux-controlnet-canny";
const FAL_CONTROLNET_DEPTH_PATH = "jasperai/Flux.1-dev-Controlnet-Depth";
const FAL_FLUX_DEFAULT_PARAMS = {
  num_inference_steps: 28,
  guidance_scale: 3.5,
  num_images: 1,
} as const;
const FAL_IP_ADAPTER_PATH = "h94/IP-Adapter";
const FAL_IP_ADAPTER_IMAGE_ENCODER_PATH = "openai/clip-vit-large-patch14";
const DATA_URI_MAX_BYTES = 500 * 1024;
const buildDataUri = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60000;
const TRUSTED_FAL_HOSTS = new Set([
  "queue.fal.run",
  "fal.media",
  "v3.fal.media",
  "storage.fal.run",
]);

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
    !TRUSTED_FAL_HOSTS.has(parsedUrl.hostname)
  ) {
    throw new Error(`Unexpected Fal queue URL for ${fieldName}`);
  }

  return parsedUrl.toString();
};

const estimateBase64Bytes = (base64: string): number => {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

const isReusableImageUrl = (value: string | undefined): value is string => {
  if (!value) {
    return false;
  }

  return value.startsWith("https://") || value.startsWith("data:");
};

const resolveFalInputUrl = async (input: {
  base64: string;
  mimeType: string;
  apiKey: string;
  fileName: string;
  imageUrl?: string;
}): Promise<string> => {
  if (isReusableImageUrl(input.imageUrl)) {
    return input.imageUrl;
  }

  if (estimateBase64Bytes(input.base64) < DATA_URI_MAX_BYTES) {
    return buildDataUri(input.mimeType, input.base64);
  }

  const uploaded = await uploadBase64ToFalStorage(
    input.base64,
    input.mimeType,
    input.apiKey,
    input.fileName,
  );

  return assertTrustedFalQueueUrl(uploaded.url, input.fileName);
};

const getControlnetPath = (
  controlType: CallFalFluxControlNetInput["controlType"],
) => {
  if (controlType === "edge") {
    return FAL_CONTROLNET_CANNY_PATH;
  }

  if (controlType === "depth") {
    return FAL_CONTROLNET_DEPTH_PATH;
  }

  return FAL_CONTROLNET_LINEART_PATH;
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
  const imageUrl = await resolveFalInputUrl({
    base64: input.imageBase64,
    mimeType: input.imageMimeType,
    apiKey: input.apiKey,
    fileName: "flux-img2img-input",
    imageUrl: input.imageUrl,
  });

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUrl,
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
  const imageUrl = await resolveFalInputUrl({
    base64: input.imageBase64,
    mimeType: input.imageMimeType,
    apiKey: input.apiKey,
    fileName: "clarity-upscaler-input",
    imageUrl: input.imageUrl,
  });

  return callFalImageEndpoint({
    endpoint: FAL_CLARITY_UPSCALER_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUrl,
      scale: input.scale ?? 2,
    },
  });
}

export async function callFalFluxIpAdapter(
  input: CallFalFluxIpAdapterInput,
): Promise<FalImageJobResult> {
  const imageUrl = await resolveFalInputUrl({
    base64: input.referenceBase64,
    mimeType: input.referenceMimeType,
    apiKey: input.apiKey,
    fileName: "flux-ip-adapter-reference",
    imageUrl: input.imageUrl,
  });

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_GENERAL_IMAGE_TO_IMAGE_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUrl,
      prompt: input.prompt,
      ip_adapters: [
        {
          path: FAL_IP_ADAPTER_PATH,
          image_encoder_path: FAL_IP_ADAPTER_IMAGE_ENCODER_PATH,
          image_url: imageUrl,
          scale: input.weight ?? 0.55,
        },
      ],
      ...FAL_FLUX_DEFAULT_PARAMS,
      image_size: { width: 1024, height: 1024 },
    },
  });
}

export async function callFalFluxControlNet(
  input: CallFalFluxControlNetInput,
): Promise<FalImageJobResult> {
  const imageUrl = await resolveFalInputUrl({
    base64: input.controlImageBase64,
    mimeType: input.controlImageMimeType,
    apiKey: input.apiKey,
    fileName: "flux-controlnet-image",
    imageUrl: input.imageUrl,
  });

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_GENERAL_IMAGE_TO_IMAGE_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUrl,
      prompt: input.prompt,
      controlnets: [
        {
          path: getControlnetPath(input.controlType),
          control_image_url: imageUrl,
          conditioning_scale: input.conditioningScale ?? 0.65,
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
  const [imageUrl, maskUrl] = await Promise.all([
    resolveFalInputUrl({
      base64: input.imageBase64,
      mimeType: input.imageMimeType,
      apiKey: input.apiKey,
      fileName: "flux-fill-image",
      imageUrl: input.imageUrl,
    }),
    resolveFalInputUrl({
      base64: input.maskBase64,
      mimeType: input.maskMimeType,
      apiKey: input.apiKey,
      fileName: "flux-fill-mask",
      imageUrl: input.maskUrl,
    }),
  ]);

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_FILL_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: imageUrl,
      mask_url: maskUrl,
      prompt: input.prompt,
      ...FAL_FLUX_DEFAULT_PARAMS,
    },
  });
}

export async function callFalWorkflow(
  input: CallFalWorkflowInput,
): Promise<FalImageJobResult> {
  return callFalImageEndpoint({
    endpoint: `https://queue.fal.run/workflows/${input.slug}`,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: input.input,
  });
}

export async function callFalReferenceToIpAdapterWorkflow(
  input: CallFalReferenceToIpAdapterWorkflowInput,
): Promise<FalImageJobResult> {
  const referenceImageUrl = await resolveFalInputUrl({
    base64: input.referenceBase64,
    mimeType: input.referenceMimeType,
    apiKey: input.apiKey,
    fileName: "reference-to-ipadapter-workflow-reference",
    imageUrl: input.imageUrl,
  });

  return callFalWorkflow({
    slug: "duegosystem/reference-to-ipadapter-v1",
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    input: {
      prompt: input.prompt,
      reference_image_url: referenceImageUrl,
    },
  });
}
