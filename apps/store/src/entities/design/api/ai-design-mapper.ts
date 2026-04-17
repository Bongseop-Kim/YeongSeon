import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
import type { AiDesignRequest } from "@/entities/design/model/ai-design-request";
import type { AiDesignResponse } from "@/entities/design/model/ai-design-response";
import type { Attachment } from "@/entities/design/model/ai-design-types";
import type {
  CiPlacement,
  FabricMethod,
  PatternOption,
} from "@/entities/design/model/design-context";

export interface DesignTokenRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  ai_model: string | null;
  request_type: string | null;
  description: string | null;
  created_at: string;
  work_id: string | null;
}

export const toDesignTokenHistoryItem = (
  row: DesignTokenRow,
): DesignTokenHistoryItem => ({
  id: row.id,
  amount: row.amount,
  type: row.type,
  aiModel: row.ai_model,
  requestType: row.request_type,
  description: row.description,
  createdAt: row.created_at,
  workId: row.work_id,
});

const DEFAULT_TAGS = ["클래식", "프리미엄", "넥타이"];

const PATTERN_LABELS: Record<PatternOption, string> = {
  stripe: "스트라이프",
  dot: "도트",
  check: "체크",
  paisley: "페이즐리",
  plain: "솔리드",
  houndstooth: "하운즈투스",
  floral: "플로럴",
};

const FABRIC_LABELS: Record<FabricMethod, string> = {
  "yarn-dyed": "선염",
  print: "날염",
};

const CI_PLACEMENT_LABELS: Record<CiPlacement, string> = {
  "all-over": "올패턴",
  "one-point": "원포인트",
};

const isKnownKey = <T extends string>(
  map: Record<T, string>,
  value: unknown,
): value is T =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(map, value);

const getLookupLabel = <T extends string>(
  map: Record<T, string>,
  value: unknown,
): string | undefined => (isKnownKey(map, value) ? map[value] : undefined);

const getAttachmentLabels = (
  attachments: Attachment[],
  type: Attachment["type"],
): string[] =>
  attachments
    .filter(
      (attachment) =>
        attachment.type === type && attachment.label.trim().length > 0,
    )
    .map((attachment) => attachment.label.trim());

export const getTags = (request: AiDesignRequest): string[] => {
  const colorLabels = getAttachmentLabels(request.attachments, "color");
  const patternLabels = getAttachmentLabels(request.attachments, "pattern");
  const fabricLabels = getAttachmentLabels(request.attachments, "fabric");

  if (patternLabels.length === 0) {
    const patternLabel = getLookupLabel(
      PATTERN_LABELS,
      request.designContext.pattern,
    );
    if (patternLabel) {
      patternLabels.push(patternLabel);
    }
  }

  if (fabricLabels.length === 0) {
    const fabricLabel = getLookupLabel(
      FABRIC_LABELS,
      request.designContext.fabricMethod,
    );
    if (fabricLabel) {
      fabricLabels.push(fabricLabel);
    }
  }

  const ciPlacementLabels: string[] = [];
  const ciPlacementLabel = getLookupLabel(
    CI_PLACEMENT_LABELS,
    request.designContext.ciPlacement,
  );
  if (ciPlacementLabel) {
    ciPlacementLabels.push(ciPlacementLabel);
  }

  const tags = [
    ...new Set([
      ...colorLabels,
      ...patternLabels,
      ...fabricLabels,
      ...ciPlacementLabels,
    ]),
  ].slice(0, 3);

  return tags.length > 0 ? tags : DEFAULT_TAGS;
};

interface InvokePayloadInput {
  ciImageBase64?: string;
  referenceImageBase64?: string;
}

interface InvokeResponseBody {
  aiMessage: string;
  imageUrl?: string | null;
  workId?: string | null;
  workflowId?: string | null;
  analysisWorkId?: string | null;
  generateImage?: boolean | null;
  eligibleForRender?: boolean | null;
  missingRequirements?: unknown;
  contextChips?: unknown;
  remainingTokens?: unknown;
}

const normalizeString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const normalizeBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const normalizeMissingRequirements = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const isContextChip = (
  value: unknown,
): value is { label: string; action: string } => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.label === "string" &&
    record.label.length > 0 &&
    typeof record.action === "string" &&
    record.action.length > 0
  );
};

const normalizeContextChips = (value: unknown) =>
  Array.isArray(value) ? value.filter(isContextChip) : [];

export function buildInvokePayload(
  request: AiDesignRequest,
  input: InvokePayloadInput = {},
) {
  return {
    userMessage: request.userMessage,
    designContext: {
      colors: request.designContext.colors,
      pattern: request.designContext.pattern,
      fabricMethod: request.designContext.fabricMethod,
      ciPlacement: request.designContext.ciPlacement,
      scale: request.designContext.scale,
    },
    conversationHistory: request.conversationHistory ?? [],
    ciImageBase64: input.ciImageBase64,
    ciImageMimeType: request.designContext.ciImage?.type || undefined,
    referenceImageBase64: input.referenceImageBase64,
    referenceImageMimeType:
      request.designContext.referenceImage?.type || undefined,
    sessionId: request.sessionId,
    firstMessage: request.firstMessage,
    allMessages: request.allMessages,
    executionMode: request.executionMode ?? "auto",
    analysisWorkId: request.analysisWorkId ?? null,
  };
}

export function normalizeInvokeResponse(
  response: InvokeResponseBody,
  request: AiDesignRequest,
): AiDesignResponse {
  return {
    aiMessage: response.aiMessage,
    imageUrl: response.imageUrl ?? null,
    workId: normalizeString(response.workId),
    workflowId: normalizeString(response.workflowId),
    analysisWorkId: normalizeString(response.analysisWorkId),
    generateImage: normalizeBoolean(response.generateImage),
    eligibleForRender: normalizeBoolean(response.eligibleForRender),
    missingRequirements: normalizeMissingRequirements(
      response.missingRequirements,
    ),
    tags: getTags(request),
    contextChips: normalizeContextChips(response.contextChips),
    remainingTokens:
      typeof response.remainingTokens === "number"
        ? response.remainingTokens
        : undefined,
  };
}
