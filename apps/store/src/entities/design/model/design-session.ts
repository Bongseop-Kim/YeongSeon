export interface DesignSession {
  id: string;
  aiModel: "openai" | "gemini";
  firstMessage: string;
  lastImageUrl: string | null;
  lastImageFileId: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSessionMessage {
  id: string;
  sessionId: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  sequenceNumber: number;
  createdAt: string;
}
