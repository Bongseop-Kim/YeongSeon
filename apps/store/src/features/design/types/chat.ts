import type { Attachment, ContextChip, DesignContext } from "@/entities/design";

export type { AiModel, Attachment, ContextChip } from "@/entities/design";

export type GenerationStatus =
  | "idle"
  | "generating"
  | "completed"
  | "regenerating";

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl?: string;
  rawImageUrl?: string;
  attachments?: Attachment[];
  contextChips?: ContextChip[];
  timestamp: number;
  designContext?: DesignContext;
  uiOnly?: boolean;
}
