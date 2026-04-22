import type {
  DesignSession,
  DesignSessionMessage,
} from "@/entities/design/model/design-session";

export interface DesignSessionRow {
  id: string;
  user_id: string;
  ai_model: string;
  first_message: string;
  last_image_url: string | null;
  last_image_file_id: string | null;
  last_image_work_id: string | null;
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
  attachments: unknown;
  sequence_number: number;
  created_at: string;
}

const AI_MODELS = ["openai", "gemini", "fal"] as const;
const MESSAGE_ROLES = ["user", "ai"] as const;
const AI_MODEL_SET: ReadonlySet<string> = new Set(AI_MODELS);
const MESSAGE_ROLE_SET: ReadonlySet<string> = new Set(MESSAGE_ROLES);

function isAiModel(value: string): value is DesignSession["aiModel"] {
  return AI_MODEL_SET.has(value);
}

function isMessageRole(value: string): value is DesignSessionMessage["role"] {
  return MESSAGE_ROLE_SET.has(value);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function toAttachments(value: unknown): DesignSessionMessage["attachments"] {
  if (!Array.isArray(value)) {
    return null;
  }

  const attachments = value
    .filter(isRecord)
    .map((attachment) => {
      const type = attachment.type;
      const label = attachment.label;
      const itemValue = attachment.value;
      const fileName = attachment.fileName;

      if (
        (type !== "color" &&
          type !== "pattern" &&
          type !== "fabric" &&
          type !== "image" &&
          type !== "ci-placement") ||
        typeof label !== "string" ||
        typeof itemValue !== "string"
      ) {
        return null;
      }

      return {
        type,
        label,
        value: itemValue,
        ...(typeof fileName === "string" ? { fileName } : {}),
      };
    })
    .filter(
      (
        attachment,
      ): attachment is NonNullable<
        DesignSessionMessage["attachments"]
      >[number] => attachment !== null,
    );

  return attachments.length > 0 ? attachments : null;
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
    lastImageWorkId: row.last_image_work_id,
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
    attachments: toAttachments(row.attachments),
    sequenceNumber: row.sequence_number,
    createdAt: row.created_at,
  };
}
