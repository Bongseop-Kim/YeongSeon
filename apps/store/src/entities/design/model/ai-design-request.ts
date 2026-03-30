import type {
  AiModel,
  Attachment,
} from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";
import type { Message } from "@/entities/design/model/chat";

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
  aiModel: AiModel;
  conversationHistory?: Pick<Message, "role" | "content">[];
}
