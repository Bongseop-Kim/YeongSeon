import { normalizeDetectedPattern } from "@/entities/design/api/normalize-detected-pattern";
import { hasEditTarget } from "@/entities/design/api/resolve-generation-route-signals";
import type {
  RouteResolution,
  RouteResolverInput,
} from "@/entities/design/api/resolve-generation-route-types";

const SHARP_EDGE_PATTERNS = new Set(["check", "stripe", "houndstooth"]);

export function resolveHeuristicRoute(
  input: RouteResolverInput,
  signals: RouteResolution["signals"],
): RouteResolution {
  const normalizedDetectedPattern = normalizeDetectedPattern(
    input.detectedPattern,
  );

  if (hasEditTarget(input) && signals.includes("edit_only")) {
    return {
      route: "fal_edit",
      signals,
      reason: "existing_result_edit_request",
      usedIntentRouter: false,
    };
  }

  if (
    input.hasCiImage &&
    signals.includes("pattern_repeat") &&
    normalizedDetectedPattern &&
    SHARP_EDGE_PATTERNS.has(normalizedDetectedPattern)
  ) {
    return {
      route: "fal_controlnet",
      signals,
      reason: "sharp_edge_pattern_repeat",
      usedIntentRouter: false,
    };
  }

  if (input.hasCiImage && signals.includes("pattern_repeat")) {
    return {
      route: "fal_tiling",
      signals,
      reason: "ci_image_with_pattern_repeat",
      usedIntentRouter: false,
    };
  }

  if (signals.includes("similar_mood") || signals.includes("new_generation")) {
    return {
      route: "openai",
      signals,
      reason: "similar_mood_or_new_generation",
      usedIntentRouter: false,
    };
  }

  return {
    route: "openai",
    signals,
    reason: "default_openai_generation",
    usedIntentRouter: false,
  };
}
