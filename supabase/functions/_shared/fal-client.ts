export interface CallFalFluxImg2ImgInput {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
  strength?: number;
  apiKey: string;
  timeoutMs?: number;
}

export interface CallFalFluxImg2ImgResult {
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

export interface CallFalNanoBananaEditResult {
  imageUrl: string;
  requestId: string;
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
const FAL_NANO_BANANA_EDIT_ENDPOINT =
  "https://queue.fal.run/fal-ai/nano-banana-2/edit";
const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60000;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      reject(signal.reason);
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });

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

  while (true) {
    const statusResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${input.apiKey}` },
      signal: timeoutSignal,
    });

    if (!statusResponse.ok) {
      throw new Error(`Fal.ai status failed: ${statusResponse.status}`);
    }

    const status = (await statusResponse.json()) as FalQueueStatusResponse;

    if (status.status === "COMPLETED") {
      const resultResponse = await fetch(resultUrl, {
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
): Promise<CallFalFluxImg2ImgResult> {
  const strength = input.strength ?? 0.3;
  const dataUri = `data:${input.imageMimeType};base64,${input.imageBase64}`;

  return callFalImageEndpoint({
    endpoint: FAL_FLUX_ENDPOINT,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    body: {
      image_url: dataUri,
      prompt: input.prompt,
      strength,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      image_size: { width: 1024, height: 1024 },
    },
  });
}

export async function callFalNanoBananaEdit(
  input: CallFalNanoBananaEditInput,
): Promise<CallFalNanoBananaEditResult> {
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
