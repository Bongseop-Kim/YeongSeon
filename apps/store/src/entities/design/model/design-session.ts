export interface DesignSession {
  id: string;
  aiModel: "openai" | "fal";
  firstMessage: string;
  lastImageUrl: string | null;
  lastImageFileId: string | null;
  lastImageWorkId: string | null;
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
  attachments: Array<{
    type: "color" | "pattern" | "fabric" | "image" | "ci-placement";
    label: string;
    value: string;
    fileName?: string;
  }> | null;
  sequenceNumber: number;
  createdAt: string;
}
