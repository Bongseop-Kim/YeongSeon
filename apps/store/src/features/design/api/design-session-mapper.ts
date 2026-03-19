import type {
  DesignSession,
  DesignSessionMessage,
} from "@/features/design/types/session";
import type { Message } from "@/features/design/types/chat";
import { toPreviewBackground } from "@/features/design/utils";

export interface DesignSessionRow {
  id: string;
  user_id: string;
  ai_model: string;
  first_message: string;
  last_image_url: string | null;
  last_image_file_id: string | null;
  image_count: number;
  created_at: string;
  updated_at: string;
}

export interface DesignSessionMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  image_url: string | null;
  image_file_id: string | null;
  sequence_number: number;
  created_at: string;
}

export function toDesignSession(row: DesignSessionRow): DesignSession {
  return {
    id: row.id,
    aiModel: row.ai_model as "openai" | "gemini",
    firstMessage: row.first_message,
    lastImageUrl: row.last_image_url,
    lastImageFileId: row.last_image_file_id,
    imageCount: row.image_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toDesignSessionMessage(
  row: DesignSessionMessageRow,
): DesignSessionMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role as "user" | "ai",
    content: row.content,
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    sequenceNumber: row.sequence_number,
    createdAt: row.created_at,
  };
}

export function sessionMessageToMessage(m: DesignSessionMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl ? toPreviewBackground(m.imageUrl) : undefined,
    rawImageUrl: m.imageUrl ?? undefined,
    timestamp: new Date(m.createdAt).getTime(),
  };
}
