import {
  classifyRouteWithLlm,
  type ClassifierResult,
} from "@/entities/design/api/route-classifier";
import { resolveHeuristicRoute } from "@/entities/design/api/resolve-generation-route-decision";
import { collectSignals } from "@/entities/design/api/resolve-generation-route-signals";
import type {
  AsyncRouteResolution,
  RouteResolution,
  RouteResolverInput,
} from "@/entities/design/api/resolve-generation-route-types";

export function resolveGenerationRoute(
  input: RouteResolverInput,
): RouteResolution {
  return resolveHeuristicRoute(input, collectSignals(input));
}

export async function resolveGenerationRouteAsync(
  input: RouteResolverInput,
): Promise<AsyncRouteResolution> {
  const heuristic = resolveGenerationRoute(input);
  if (heuristic.reason === "sharp_edge_pattern_repeat") {
    return {
      ...heuristic,
      source: "heuristic",
    };
  }

  const llm: ClassifierResult | null = await classifyRouteWithLlm(input);

  if (llm && llm.route !== "none") {
    return {
      route: llm.route,
      signals: llm.signals,
      reason: "llm_classifier",
      usedIntentRouter: false,
      source: "llm",
    };
  }

  return {
    ...heuristic,
    source: "heuristic",
  };
}
