import type {
  AiModel,
  Attachment,
} from "@/entities/design/model/ai-design-types";
import type { DesignContext } from "@/entities/design/model/design-context";
import type { Scale } from "@/entities/design/model/design-scale";
import type { Message } from "@/entities/design/model/chat";

export type DesignContextPayload = DesignContext & {
  scale?: Scale;
};

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
  designContext: DesignContextPayload;
  aiModel: AiModel;
  conversationHistory?: Pick<Message, "role" | "content">[];
  sessionId: string;
  firstMessage: string;
  allMessages: SessionMessagePayload[];
  analysisWorkId?: string | null;
  executionMode?: "auto" | "analysis_only" | "render_from_analysis";
}
