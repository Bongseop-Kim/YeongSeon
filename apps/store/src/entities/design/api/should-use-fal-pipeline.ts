import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";

interface ShouldUseFalPipelineInput {
  ciImageBase64: string | undefined;
  referenceImageBase64?: string | undefined;
  ciPlacement: CiPlacement | null | undefined;
  fabricMethod: FabricMethod | null | undefined;
  allowFalRender: boolean;
}

const hasImageInput = (value: string | undefined): boolean =>
  typeof value === "string" && value.trim().length > 0;

const isFalPipelineCandidate = (input: ShouldUseFalPipelineInput): boolean =>
  input.allowFalRender &&
  input.ciPlacement === "all-over" &&
  (hasImageInput(input.ciImageBase64) ||
    hasImageInput(input.referenceImageBase64)) &&
  !!input.fabricMethod;

const SHOULD_USE_FAL_PIPELINE_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/generate-fal-api/should-use-fal-pipeline`;

const PROBE_CACHE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 3_000;
let probeCache: { value: boolean; expiresAt: number } | null = null;

export const __resetProbeCacheForTesting = () => {
  probeCache = null;
};

async function fetchFalPipelineEnabled(): Promise<boolean> {
  const now = Date.now();
  if (probeCache && now < probeCache.expiresAt) {
    return probeCache.value;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(SHOULD_USE_FAL_PIPELINE_URL, {
      signal: controller.signal,
    });
    const value = response.ok
      ? ((await response.json()) as { enabled?: unknown }).enabled !== false
      : true;
    probeCache = { value, expiresAt: now + PROBE_CACHE_TTL_MS };
    return value;
  } catch {
    probeCache = { value: true, expiresAt: now + PROBE_CACHE_TTL_MS };
    return true;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function shouldUseFalPipeline(
  input: ShouldUseFalPipelineInput,
): Promise<boolean> {
  if (!isFalPipelineCandidate(input)) {
    return false;
  }

  return fetchFalPipelineEnabled();
}
