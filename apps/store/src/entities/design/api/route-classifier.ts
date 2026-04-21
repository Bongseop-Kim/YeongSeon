import {
  GENERATION_ROUTE_SIGNAL_VALUES,
  GENERATION_ROUTE_VALUES,
  type GenerationRoute,
  type GenerationRouteSignal,
} from "@/entities/design/model/ai-design-request";
import { normalizeDetectedPattern } from "@/entities/design/api/normalize-detected-pattern";
import { supabase } from "@/shared/lib/supabase";

export interface ClassifierInput {
  userMessage: string;
  hasCiImage: boolean;
  hasReferenceImage: boolean;
  hasPreviousGeneratedImage: boolean;
  selectedPreviewImageUrl: string | null;
  detectedPattern?: string | null;
}

type ClassifierRoute = GenerationRoute | "none";

interface ClassifierResponse {
  route?: ClassifierRoute;
  signals?: unknown;
  confidence?: number;
}

export interface ClassifierResult {
  route: ClassifierRoute;
  signals: GenerationRouteSignal[];
  confidence: number;
  source: "llm";
}

export interface ClassifyOptions {
  timeoutMs?: number;
  minConfidence?: number;
}

const DEFAULT_TIMEOUT_MS = 500;
const DEFAULT_MIN_CONFIDENCE = 0.6;

const isGenerationRouteSignal = (
  value: unknown,
): value is GenerationRouteSignal =>
  typeof value === "string" &&
  (GENERATION_ROUTE_SIGNAL_VALUES as readonly string[]).includes(value);

const normalizeSignals = (value: unknown): GenerationRouteSignal[] =>
  Array.isArray(value) ? value.filter(isGenerationRouteSignal) : [];

const isClassifierRoute = (value: unknown): value is ClassifierRoute =>
  typeof value === "string" &&
  ((GENERATION_ROUTE_VALUES as readonly string[]).includes(value) ||
    value === "none");

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
};

export async function classifyRouteWithLlm(
  input: ClassifierInput,
  options: ClassifyOptions = {},
): Promise<ClassifierResult | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const minConfidence = options.minConfidence ?? DEFAULT_MIN_CONFIDENCE;
  const controller = new AbortController();
  const normalizedInput = {
    ...input,
    detectedPattern: normalizeDetectedPattern(input.detectedPattern),
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  const invokePromise = (async (): Promise<ClassifierResult | null> => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "classify-generation-route",
        {
          body: normalizedInput,
          signal: controller.signal,
        },
      );

      if (error || !data) {
        if (error && !controller.signal.aborted && !isAbortLikeError(error)) {
          console.warn("classifyRouteWithLlm error:", error);
        }
        return null;
      }

      const response = data as ClassifierResponse;

      if (
        !isClassifierRoute(response.route) ||
        typeof response.confidence !== "number" ||
        response.confidence < minConfidence
      ) {
        return null;
      }

      return {
        route: response.route,
        signals: normalizeSignals(response.signals),
        confidence: response.confidence,
        source: "llm",
      };
    } catch (error) {
      if (!controller.signal.aborted && !isAbortLikeError(error)) {
        console.warn("classifyRouteWithLlm error:", error);
      }
      return null;
    }
  })();

  try {
    return await Promise.race([invokePromise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}
