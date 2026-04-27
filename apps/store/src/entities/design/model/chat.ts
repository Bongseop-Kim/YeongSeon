import type {
  Attachment,
  ContextChip,
} from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";

export type { Attachment, ContextChip };

export type GenerationStatus =
  | "idle"
  | "generating"
  | "completed"
  | "regenerating"
  | "rendering";

export const isActiveGeneration = (status: GenerationStatus): boolean =>
  status === "generating" ||
  status === "regenerating" ||
  status === "rendering";

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl?: string;
  imageFileId?: string;
  workId?: string | null;
  attachments?: Attachment[];
  contextChips?: ContextChip[];
  timestamp: number;
  designContext?: DesignContext;
  uiOnly?: boolean;
}
