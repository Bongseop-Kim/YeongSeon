import type {
  DesignSession,
  DesignSessionMessage,
} from "@/entities/design/model/design-session";
import type {
  AccentLayout,
  FabricType,
  PatternType,
} from "@/entities/design/model/tile-types";
import type { FabricMethod } from "@/entities/design/model/design-context";
import { createEnumMapper } from "@/shared/lib/enum-mapper";
import { isRecord, createGuard } from "@/shared/lib/type-guard";

export interface DesignSessionRow {
  id: string;
  user_id: string;
  ai_model: string;
  first_message: string;
  last_image_url: string | null;
  last_image_file_id: string | null;
  last_image_work_id: string | null;
  repeat_tile_url: string | null;
  repeat_tile_work_id: string | null;
  accent_tile_url: string | null;
  accent_tile_work_id: string | null;
  accent_layout_json: unknown;
  pattern_type: string | null;
  fabric_type: string | null;
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

const AI_MODEL_SET: ReadonlySet<DesignSession["aiModel"]> = new Set([
  "openai",
  "fal",
]);
const MESSAGE_ROLE_SET: ReadonlySet<DesignSessionMessage["role"]> = new Set([
  "user",
  "ai",
]);
const PATTERN_TYPE_SET: ReadonlySet<PatternType> = new Set([
  "all_over",
  "one_point",
]);
const FABRIC_TYPE_SET: ReadonlySet<FabricType> = new Set([
  "yarn_dyed",
  "printed",
]);
const OBJECT_SOURCE_SET: ReadonlySet<AccentLayout["objectSource"]> = new Set([
  "text",
  "image",
  "both",
]);
const ACCENT_SIZE_SET: ReadonlySet<NonNullable<AccentLayout["size"]>> = new Set(
  ["small", "medium", "large"],
);

const isAiModel = createGuard<DesignSession["aiModel"]>(AI_MODEL_SET);
const isMessageRole =
  createGuard<DesignSessionMessage["role"]>(MESSAGE_ROLE_SET);
const isObjectSource =
  createGuard<AccentLayout["objectSource"]>(OBJECT_SOURCE_SET);
const isAccentSize =
  createGuard<NonNullable<AccentLayout["size"]>>(ACCENT_SIZE_SET);

const toPatternType = createEnumMapper<PatternType>(PATTERN_TYPE_SET);
const toFabricType = createEnumMapper<FabricType>(FABRIC_TYPE_SET);

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

export function toAccentLayout(value: unknown): AccentLayout | null {
  if (!isRecord(value)) return null;

  const objectDescription = value.objectDescription;
  const objectSource = value.objectSource;
  const color = value.color ?? null;
  const size = value.size ?? null;

  if (typeof objectDescription !== "string") return null;
  if (typeof objectSource !== "string" || !isObjectSource(objectSource))
    return null;
  if (color !== null && typeof color !== "string") return null;
  if (size !== null && (typeof size !== "string" || !isAccentSize(size)))
    return null;

  return { objectDescription, objectSource, color, size };
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
    repeatTileUrl: row.repeat_tile_url,
    repeatTileWorkId: row.repeat_tile_work_id,
    accentTileUrl: row.accent_tile_url,
    accentTileWorkId: row.accent_tile_work_id,
    accentLayout: toAccentLayout(row.accent_layout_json),
    patternType: toPatternType(row.pattern_type),
    fabricType: toFabricType(row.fabric_type),
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

const FABRIC_METHOD_TO_TYPE: Record<FabricMethod, FabricType> = {
  "yarn-dyed": "yarn_dyed",
  print: "printed",
};

const FABRIC_TYPE_TO_METHOD: Record<FabricType, FabricMethod> = {
  yarn_dyed: "yarn-dyed",
  printed: "print",
};

export const fabricMethodToFabricType = (
  method: FabricMethod | null,
): FabricType | null =>
  method ? (FABRIC_METHOD_TO_TYPE[method] ?? null) : null;

export const fabricTypeToFabricMethod = (
  type: FabricType | null,
): FabricMethod | null => (type ? (FABRIC_TYPE_TO_METHOD[type] ?? null) : null);
