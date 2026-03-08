export type MessageRole = "user" | "ai";
export type GenerationStatus =
  | "idle"
  | "generating"
  | "completed"
  | "regenerating";

export interface Attachment {
  type: "color" | "pattern" | "fabric" | "image";
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
}

