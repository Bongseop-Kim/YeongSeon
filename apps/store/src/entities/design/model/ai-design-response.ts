import type { ContextChip } from "@/entities/design/model/ai-design-types";
import type {
  GenerationRoute,
  GenerationRouteReason,
  GenerationRouteSignal,
} from "@/entities/design/model/ai-design-request";

export interface AiDesignRouteMetadata {
  route?: GenerationRoute;
  routeSignals?: GenerationRouteSignal[];
  routeReason?: GenerationRouteReason;
  falRequestId?: string | null;
  seed?: number | null;
}

export interface AiDesignResponse extends AiDesignRouteMetadata {
  aiMessage: string;
  imageUrl: string | null;
  patternPreparationMessage?: string;
  workId?: string;
  workflowId?: string;
  analysisWorkId?: string;
  generateImage?: boolean;
  eligibleForRender?: boolean;
  missingRequirements?: string[];
  tags: string[];
  contextChips: ContextChip[];
  remainingTokens?: number;
}
