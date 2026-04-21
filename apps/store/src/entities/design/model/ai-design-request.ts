import type {
  AiModel,
  Attachment,
} from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";
import type { Scale } from "@/entities/design/model/design-scale";
import type { Message } from "@/entities/design/model/chat";

export const GENERATION_ROUTE_VALUES = [
  "openai",
  "fal_tiling",
  "fal_edit",
  "fal_controlnet",
  "fal_inpaint",
] as const;

export type GenerationRoute = (typeof GENERATION_ROUTE_VALUES)[number];

export const GENERATION_ROUTE_SIGNAL_VALUES = [
  "ci_image_present",
  "reference_image_present",
  "previous_generated_image_present",
  "selected_preview_image_present",
  "pattern_repeat",
  "exact_placement",
  "modification_intent",
  "preserve_identity",
  "similar_mood",
  "new_generation",
  "edit_only",
] as const;

export type GenerationRouteSignal =
  (typeof GENERATION_ROUTE_SIGNAL_VALUES)[number];

export const GENERATION_ROUTE_REASON_VALUES = [
  "ci_image_with_pattern_repeat",
  "sharp_edge_pattern_repeat",
  "existing_result_edit_request",
  "similar_mood_or_new_generation",
  "default_openai_generation",
  "llm_classifier",
] as const;

export type GenerationRouteReason =
  (typeof GENERATION_ROUTE_REASON_VALUES)[number];

export type DesignContextPayload = DesignContext & {
  scale?: Scale;
};

export interface AiDesignRouteHint {
  routeHint?: GenerationRoute;
  baseImageUrl?: string | null;
  baseImageWorkId?: string | null;
}

export interface SessionMessagePayload {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  attachments?: Attachment[];
  sequenceNumber: number;
}

export interface AiDesignRequest extends AiDesignRouteHint {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContextPayload;
  aiModel: AiModel;
  conversationHistory?: Pick<Message, "role" | "content">[];
  sessionId: string;
  firstMessage: string;
  allMessages: SessionMessagePayload[];
  analysisWorkId?: string | null;
  executionMode?: "auto" | "analysis_only" | "render_from_analysis";
  route?: Exclude<GenerationRoute, "openai">;
  controlType?: "lineart" | "edge" | "depth";
  structureImageBase64?: string;
  structureImageMimeType?: string;
  baseImageBase64?: string;
  baseImageMimeType?: string;
  maskBase64?: string;
  maskMimeType?: string;
  editPrompt?: string;
}
