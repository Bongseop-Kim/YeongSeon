import type { DesignContext } from "@/features/design/types/design-context";

export type AiModel = "openai" | "gemini";

export type MessageRole = "user" | "ai";
export type GenerationStatus =
  | "idle"
  | "generating"
  | "completed"
  | "regenerating";

export interface Attachment {
  type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
  label: string;
  value: string;
  file?: File;
}

export interface ContextChip {
  label: string;
  action: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  attachments?: Attachment[];
  contextChips?: ContextChip[];
  timestamp: number;
  designContext?: DesignContext;
  uiOnly?: boolean;
}
