import type { AiModel, Attachment } from "@/features/design/types/chat";
import type { DesignContext } from "@/features/design/types/design-context";

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
  aiModel: AiModel;
  conversationHistory?: {
    role: "user" | "ai";
    content: string;
  }[];
}
