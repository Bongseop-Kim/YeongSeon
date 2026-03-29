import type { AiModel, Attachment } from "@/entities/design/model/chat";
import type { DesignContext } from "@/entities/design/model/design-context";

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
