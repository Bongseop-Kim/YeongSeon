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
}

interface FalQueueSubmitResponse {
  request_id?: string;
}

interface FalQueueStatusResponse {
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

interface FalResultResponse {
  images?: Array<{ url?: string }>;
}

const FAL_ENDPOINT = "https://queue.fal.run/fal-ai/flux/dev/image-to-image";
const POLL_INTERVAL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function callFalFluxImg2Img(
  input: CallFalFluxImg2ImgInput,
): Promise<CallFalFluxImg2ImgResult> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const strength = input.strength ?? 0.3;
  const dataUri = `data:${input.imageMimeType};base64,${input.imageBase64}`;

  const submitResponse = await fetch(FAL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${input.apiKey}`,
    },
    body: JSON.stringify({
      image_url: dataUri,
      prompt: input.prompt,
      strength,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      image_size: { width: 1024, height: 1024 },
    }),
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

  const statusUrl = `https://queue.fal.run/fal-ai/flux/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/fal-ai/flux/requests/${requestId}`;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    const statusResponse = await fetch(statusUrl, {
      headers: { Authorization: `Key ${input.apiKey}` },
    });

    if (!statusResponse.ok) {
      throw new Error(`Fal.ai status failed: ${statusResponse.status}`);
    }

    const status = (await statusResponse.json()) as FalQueueStatusResponse;

    if (status.status === "COMPLETED") {
      const resultResponse = await fetch(resultUrl, {
        headers: { Authorization: `Key ${input.apiKey}` },
      });

      if (!resultResponse.ok) {
        throw new Error(`Fal.ai result failed: ${resultResponse.status}`);
      }

      const result = (await resultResponse.json()) as FalResultResponse;
      const imageUrl = result.images?.[0]?.url;

      if (!imageUrl) {
        throw new Error("Fal.ai result did not include image URL");
      }

      return { imageUrl };
    }

    if (status.status === "FAILED") {
      throw new Error("Fal.ai generation failed");
    }

    if (Date.now() >= deadline) break;
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`Fal.ai generation timed out after ${timeoutMs}ms`);
}
