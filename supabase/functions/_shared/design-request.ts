import type { ConversationTurn } from "./conversation.ts";

export interface RequestSessionMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  sequenceNumber: number;
}

export type GenerateDesignRequest = {
  userMessage: string;
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
  };
  conversationHistory?: ConversationTurn[];
  previousImageBase64?: string;
  previousImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  // 세션 저장용 필드 (클라이언트에서 선택적으로 전송)
  sessionId?: string;
  firstMessage?: string;
  allMessages?: RequestSessionMessage[];
};
