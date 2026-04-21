import type {
  GenerationRoute,
  GenerationRouteReason,
  GenerationRouteSignal,
} from "@/entities/design/model/ai-design-request";
import type { ClassifierInput } from "@/entities/design/api/route-classifier";

export type RouteResolverInput = ClassifierInput;

export interface RouteResolution {
  route: GenerationRoute;
  signals: GenerationRouteSignal[];
  reason: GenerationRouteReason;
  usedIntentRouter: boolean;
}

export interface AsyncRouteResolution extends RouteResolution {
  source: "llm" | "heuristic";
}
