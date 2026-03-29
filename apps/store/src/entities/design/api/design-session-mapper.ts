import type {
  DesignSession,
  DesignSessionMessage,
} from "@/entities/design/model/session";
import type { GenerationStatus, Message } from "@/entities/design/model/chat";
import { toPreviewBackground } from "@/entities/design/lib/preview-background";

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

const AI_MODELS = ["openai", "gemini"] as const;
const MESSAGE_ROLES = ["user", "ai"] as const;
const AI_MODEL_SET: ReadonlySet<string> = new Set(AI_MODELS);
const MESSAGE_ROLE_SET: ReadonlySet<string> = new Set(MESSAGE_ROLES);

export interface RestoredDesignSessionState {
  messages: Message[];
  generatedImageUrl: string | null;
  resultTags: string[];
  generationStatus: GenerationStatus;
}

function isAiModel(value: string): value is DesignSession["aiModel"] {
  return AI_MODEL_SET.has(value);
}

function isMessageRole(value: string): value is DesignSessionMessage["role"] {
  return MESSAGE_ROLE_SET.has(value);
}

export function toDesignSession(row: DesignSessionRow): DesignSession {
  if (!isAiModel(row.ai_model)) {
    throw new Error(`알 수 없는 디자인 세션 모델입니다: ${row.ai_model}`);
  }

  return {
    id: row.id,
    aiModel: row.ai_model,
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
  if (!isMessageRole(row.role)) {
    throw new Error(`알 수 없는 디자인 세션 역할입니다: ${row.role}`);
  }

  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    imageUrl: row.image_url,
    imageFileId: row.image_file_id,
    sequenceNumber: row.sequence_number,
    createdAt: row.created_at,
  };
}

function sessionMessageToMessage(m: DesignSessionMessage): Message {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl ? toPreviewBackground(m.imageUrl) : undefined,
    rawImageUrl: m.imageUrl ?? undefined,
    timestamp: new Date(m.createdAt).getTime(),
  };
}

export function toRestoredDesignSessionState(
  messages: DesignSessionMessage[],
): RestoredDesignSessionState {
  const restoredMessages = messages.map(sessionMessageToMessage);
  const lastImageMessage = [...messages]
    .reverse()
    .find((message) => message.imageUrl);
  const generatedImageUrl = lastImageMessage?.imageUrl
    ? toPreviewBackground(lastImageMessage.imageUrl)
    : null;

  return {
    messages: restoredMessages,
    generatedImageUrl,
    resultTags: [],
    generationStatus: generatedImageUrl ? "completed" : "idle",
  };
}
