import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import {
  buildAllowedInpaintBaseImageHosts,
  validateRemoteInpaintBaseImageUrl,
} from "@/functions/_shared/generate-fal-api-utils.ts";

export interface GeneratedTile {
  url: string;
  workId: string;
}

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

export const validateReferenceImageUrl = (value: string): string | null =>
  validateRemoteInpaintBaseImageUrl(value, ALLOWED_REFERENCE_IMAGE_HOSTS);

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

    const imageResponse = await fetch(trustedReferenceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Reference image fetch failed: ${trustedReferenceImageUrl}`,
      );
    }

    const form = new FormData();
    for (const [key, val] of Object.entries(OPENAI_IMAGE_PARAMS)) {
      form.append(key, String(val));
    }
    form.append("prompt", prompt);
    form.append("image", await imageResponse.blob(), "reference.webp");

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

  const uploaded = await uploadImageToImageKit(
    b64,
    `tile-${workId}.webp`,
    "tiles",
  );
  if (!uploaded) throw new Error("ImageKit upload failed");

  return { url: uploaded.url, workId };
}
