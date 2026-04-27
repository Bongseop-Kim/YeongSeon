import type { AttachmentType } from "./request-attachments.ts";

interface RequestSessionAttachment {
  type: AttachmentType;
  label: string;
  value: string;
  fileName?: string;
}

export interface RequestSessionMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  imageUrl: string | null;
  imageFileId: string | null;
  attachments?: RequestSessionAttachment[];
  sequenceNumber: number;
}

export type GenerateDesignRequest = {
  userMessage: string;
  attachments?: RequestSessionAttachment[];
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
  };
  workflowId?: string | null;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  sessionId?: string;
  firstMessage?: string;
  allMessages?: RequestSessionMessage[];
};
