import type {
  CiPlacement,
  FabricMethod,
} from "@/entities/design/model/design-context";
import { supabase } from "@/shared/lib/supabase";

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
  if (probeCache && Date.now() < probeCache.expiresAt) {
    return probeCache.value;
  }

  const fallbackToDisabled = () => {
    probeCache = { value: false, expiresAt: Date.now() + PROBE_CACHE_TTL_MS };
    return false;
  };

  const sessionTimeout = Symbol("session-timeout");
  let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let fetchTimeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<typeof sessionTimeout>((resolve) => {
        sessionTimeoutId = setTimeout(
          () => resolve(sessionTimeout),
          PROBE_TIMEOUT_MS,
        );
      }),
    ]);
    if (sessionResult === sessionTimeout) {
      return fallbackToDisabled();
    }

    const {
      data: { session },
    } = sessionResult;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const headers: HeadersInit = {};

    if (anonKey) {
      headers.apikey = anonKey;
    }
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const controller = new AbortController();
    fetchTimeoutId = setTimeout(() => {
      controller.abort();
    }, PROBE_TIMEOUT_MS);

    const response = await fetch(SHOULD_USE_FAL_PIPELINE_URL, {
      headers,
      signal: controller.signal,
    });
    const value = response.ok
      ? ((await response.json()) as { enabled?: unknown }).enabled === true
      : false;
    probeCache = { value, expiresAt: Date.now() + PROBE_CACHE_TTL_MS };
    return value;
  } catch {
    return fallbackToDisabled();
  } finally {
    if (sessionTimeoutId) {
      clearTimeout(sessionTimeoutId);
    }
    if (fetchTimeoutId) {
      clearTimeout(fetchTimeoutId);
    }
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
