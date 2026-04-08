import type {
  AiModel,
  Attachment,
} from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";
import type { Message } from "@/entities/design/model/chat";

export interface SessionMessagePayload {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  attachments?: Attachment[];
  sequenceNumber: number;
}

export interface AiDesignRequest {
  userMessage: string;
  attachments: Attachment[];
  designContext: DesignContext;
  aiModel: AiModel;
  conversationHistory?: Pick<Message, "role" | "content">[];
  sessionId: string;
  firstMessage: string;
  allMessages: SessionMessagePayload[];
}
