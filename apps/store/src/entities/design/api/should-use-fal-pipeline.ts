import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";

interface ShouldUseFalPipelineInput {
  ciImageBase64: string | undefined;
  ciPlacement: CiPlacement | null | undefined;
  fabricMethod: FabricMethod | null | undefined;
  allowFalRender: boolean;
}

const isFalPipelineCandidate = (input: ShouldUseFalPipelineInput): boolean =>
  input.allowFalRender &&
  input.ciPlacement === "all-over" &&
  !!input.ciImageBase64 &&
  !!input.fabricMethod;

const SHOULD_USE_FAL_PIPELINE_URL = `${
  import.meta.env.VITE_SUPABASE_URL
}/functions/v1/generate-fal-api/should-use-fal-pipeline`;

const PROBE_CACHE_TTL_MS = 60_000;
let probeCache: { value: boolean; expiresAt: number } | null = null;

export const __resetProbeCacheForTesting = () => {
  probeCache = null;
};

async function fetchFalPipelineEnabled(): Promise<boolean> {
  const now = Date.now();
  if (probeCache && now < probeCache.expiresAt) {
    return probeCache.value;
  }

  try {
    const response = await fetch(SHOULD_USE_FAL_PIPELINE_URL);
    const value = response.ok
      ? ((await response.json()) as { enabled?: unknown }).enabled !== false
      : true;
    probeCache = { value, expiresAt: now + PROBE_CACHE_TTL_MS };
    return value;
  } catch {
    return true;
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
