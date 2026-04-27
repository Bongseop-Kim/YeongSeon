import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
import type { AiDesignRequest } from "@/entities/design/model/ai-design-request";
import {
  GENERATION_ROUTE_VALUES,
  GENERATION_ROUTE_REASON_VALUES,
  GENERATION_ROUTE_SIGNAL_VALUES,
} from "@/entities/design/model/ai-design-request";
import type { AiDesignResponse } from "@/entities/design/model/ai-design-response";
import type { Attachment } from "@/entities/design/model/ai-design-types";
import type {
  CiPlacement,
  FabricMethod,
  PatternOption,
} from "@/entities/design/model/design-context";
import type { BackgroundPattern } from "@yeongseon/shared/types/design/background-pattern";

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
  workflowId?: string | null;
  prepWorkId?: string | null;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  ciImageBase64?: string;
  referenceImageBase64?: string;
  backgroundPattern?: BackgroundPattern;
  tiledBase64?: string;
  tiledMimeType?: string;
  patternPreparation?: {
    placementMode: "all-over" | "one-point";
    sourceStatus: "ready" | "repair_required";
    fabricStatus: "ready" | "repair_required";
    reasonCodes: string[];
    preparedSourceKind: "original" | "repaired";
    preparationBackend?: "local" | "openai_repair";
    repairApplied?: boolean;
    repairPromptKind?: "all_over_tile" | "one_point_motif" | null;
    repairSummary?: string | null;
    prepTokensCharged?: number | null;
  };
  route?: AiDesignResponse["route"];
  routeSignals?: AiDesignResponse["routeSignals"];
  routeReason?: AiDesignResponse["routeReason"];
  routeHint?: AiDesignRequest["routeHint"];
  baseImageUrl?: AiDesignRequest["baseImageUrl"];
  baseImageWorkId?: AiDesignRequest["baseImageWorkId"];
  controlType?: AiDesignRequest["controlType"];
  structureImageBase64?: AiDesignRequest["structureImageBase64"];
  structureImageMimeType?: AiDesignRequest["structureImageMimeType"];
  baseImageBase64?: AiDesignRequest["baseImageBase64"];
  baseImageMimeType?: AiDesignRequest["baseImageMimeType"];
  maskBase64?: AiDesignRequest["maskBase64"];
  maskMimeType?: AiDesignRequest["maskMimeType"];
  editPrompt?: AiDesignRequest["editPrompt"];
}

type InvokePayload = {
  userMessage: string;
  attachments: Array<{
    type: Attachment["type"];
    label: string;
    value: string;
    fileName?: string;
  }>;
  designContext: {
    colors: string[];
    pattern: AiDesignRequest["designContext"]["pattern"];
    fabricMethod: AiDesignRequest["designContext"]["fabricMethod"];
    ciPlacement: AiDesignRequest["designContext"]["ciPlacement"];
    scale: AiDesignRequest["designContext"]["scale"];
    backgroundPattern?: BackgroundPattern;
  };
  conversationHistory: NonNullable<AiDesignRequest["conversationHistory"]>;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  tiledBase64?: string;
  tiledMimeType?: string;
  patternPreparation?: {
    placementMode: "all-over" | "one-point";
    sourceStatus: "ready" | "repair_required";
    fabricStatus: "ready" | "repair_required";
    reasonCodes: string[];
    preparedSourceKind: "original" | "repaired";
    preparationBackend?: "local" | "openai_repair";
    repairApplied?: boolean;
    repairPromptKind?: "all_over_tile" | "one_point_motif" | null;
    repairSummary?: string | null;
    prepTokensCharged?: number | null;
  };
  sessionId: string;
  firstMessage: string;
  allMessages: AiDesignRequest["allMessages"];
  executionMode: NonNullable<AiDesignRequest["executionMode"]> | "auto";
  workflowId?: string | null;
  prepWorkId?: string | null;
  analysisWorkId: string | null;
  autoGenerate?: AiDesignRequest["autoGenerate"];
  route?: AiDesignResponse["route"];
  routeSignals?: AiDesignResponse["routeSignals"];
  routeReason?: AiDesignResponse["routeReason"];
  routeHint?: AiDesignRequest["routeHint"];
  baseImageUrl?: AiDesignRequest["baseImageUrl"];
  baseImageWorkId?: AiDesignRequest["baseImageWorkId"];
  controlType?: AiDesignRequest["controlType"];
  structureImageBase64?: AiDesignRequest["structureImageBase64"];
  structureImageMimeType?: AiDesignRequest["structureImageMimeType"];
  baseImageBase64?: AiDesignRequest["baseImageBase64"];
  baseImageMimeType?: AiDesignRequest["baseImageMimeType"];
  maskBase64?: AiDesignRequest["maskBase64"];
  maskMimeType?: AiDesignRequest["maskMimeType"];
  editPrompt?: AiDesignRequest["editPrompt"];
};

interface InvokeResponseBody {
  aiMessage: string;
  imageUrl?: string | null;
  workId?: string | null;
  workflowId?: string | null;
  analysisWorkId?: string | null;
  route?: string | null;
  routeSignals?: unknown;
  routeReason?: string | null;
  falRequestId?: string | null;
  seed?: number | null;
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
  if (typeof record.label !== "string" || typeof record.action !== "string") {
    return false;
  }

  const label = record.label.trim();
  const action = record.action.trim();

  return label.length > 0 && action.length > 0;
};

const normalizeContextChips = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(isContextChip).map((chip) => ({
        label: chip.label.trim(),
        action: chip.action.trim(),
      }))
    : [];

const normalizeGenerationRoute = (
  value: unknown,
): AiDesignResponse["route"] => {
  if (typeof value !== "string") {
    return undefined;
  }

  return (GENERATION_ROUTE_VALUES as readonly string[]).includes(value)
    ? (value as AiDesignResponse["route"])
    : undefined;
};

const normalizeGenerationRouteSignals = (
  value: unknown,
): AiDesignResponse["routeSignals"] => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const signals = value.filter(
    (item): item is NonNullable<AiDesignResponse["routeSignals"]>[number] =>
      typeof item === "string" &&
      (GENERATION_ROUTE_SIGNAL_VALUES as readonly string[]).includes(item),
  );

  return signals.length > 0 ? signals : undefined;
};

const normalizeGenerationRouteReason = (
  value: unknown,
): AiDesignResponse["routeReason"] => {
  if (typeof value !== "string") {
    return undefined;
  }

  return (GENERATION_ROUTE_REASON_VALUES as readonly string[]).includes(value)
    ? (value as AiDesignResponse["routeReason"])
    : undefined;
};

export function buildInvokePayload(
  request: AiDesignRequest,
  input: InvokePayloadInput = {},
): InvokePayload {
  const payload: InvokePayload = {
    userMessage: request.userMessage,
    attachments: request.attachments.map(
      ({ type, label, value, file, fileName }) => ({
        type,
        label,
        value,
        ...((fileName ?? file?.name)
          ? { fileName: fileName ?? file?.name }
          : {}),
      }),
    ),
    designContext: {
      colors: request.designContext.colors,
      pattern: request.designContext.pattern,
      fabricMethod: request.designContext.fabricMethod,
      ciPlacement: request.designContext.ciPlacement,
      scale: request.designContext.scale,
      ...(input.backgroundPattern != null
        ? { backgroundPattern: input.backgroundPattern }
        : {}),
    },
    conversationHistory: request.conversationHistory ?? [],
    sessionId: request.sessionId,
    firstMessage: request.firstMessage,
    allMessages: request.allMessages,
    executionMode: request.executionMode ?? "auto",
    analysisWorkId: request.analysisWorkId ?? null,
    ...(request.autoGenerate !== undefined
      ? { autoGenerate: request.autoGenerate }
      : {}),
  };

  if (input.sourceImageBase64 !== undefined) {
    payload.sourceImageBase64 = input.sourceImageBase64;
  }

  const sourceImageMimeType =
    input.sourceImageMimeType ??
    request.designContext.sourceImage?.type ??
    request.designContext.ciImage?.type ??
    request.designContext.referenceImage?.type ??
    undefined;

  if (sourceImageMimeType !== undefined) {
    payload.sourceImageMimeType = sourceImageMimeType;
  }

  if (input.ciImageBase64 !== undefined) {
    payload.ciImageBase64 = input.ciImageBase64;
    payload.ciImageMimeType =
      input.sourceImageMimeType ??
      request.designContext.sourceImage?.type ??
      request.designContext.ciImage?.type ??
      undefined;
  }

  if (input.referenceImageBase64 !== undefined) {
    payload.referenceImageBase64 = input.referenceImageBase64;
    payload.referenceImageMimeType =
      request.designContext.referenceImage?.type || undefined;
  }

  if (input.tiledBase64 !== undefined) {
    payload.tiledBase64 = input.tiledBase64;
  }

  if (input.tiledMimeType !== undefined) {
    payload.tiledMimeType = input.tiledMimeType;
  }

  if (input.patternPreparation !== undefined) {
    payload.patternPreparation = input.patternPreparation;
  }

  if (input.workflowId !== undefined) {
    payload.workflowId = input.workflowId;
  }

  if (input.prepWorkId !== undefined) {
    payload.prepWorkId = input.prepWorkId;
  }

  if (input.route !== undefined) {
    payload.route = input.route;
  }

  if (input.routeSignals !== undefined) {
    payload.routeSignals = input.routeSignals;
  }

  if (input.routeReason !== undefined) {
    payload.routeReason = input.routeReason;
  }

  if (input.routeHint !== undefined) {
    payload.routeHint = input.routeHint;
  }

  if (input.baseImageUrl !== undefined) {
    payload.baseImageUrl = input.baseImageUrl;
  }

  if (input.baseImageWorkId !== undefined) {
    payload.baseImageWorkId = input.baseImageWorkId;
  }

  if (input.controlType !== undefined) {
    payload.controlType = input.controlType;
  }

  if (input.structureImageBase64 !== undefined) {
    payload.structureImageBase64 = input.structureImageBase64;
  }

  if (input.structureImageMimeType !== undefined) {
    payload.structureImageMimeType = input.structureImageMimeType;
  }

  if (input.baseImageBase64 !== undefined) {
    payload.baseImageBase64 = input.baseImageBase64;
  }

  if (input.baseImageMimeType !== undefined) {
    payload.baseImageMimeType = input.baseImageMimeType;
  }

  if (input.maskBase64 !== undefined) {
    payload.maskBase64 = input.maskBase64;
  }

  if (input.maskMimeType !== undefined) {
    payload.maskMimeType = input.maskMimeType;
  }

  if (input.editPrompt !== undefined) {
    payload.editPrompt = input.editPrompt;
  }

  return payload;
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
    route: normalizeGenerationRoute(response.route),
    routeSignals: normalizeGenerationRouteSignals(response.routeSignals),
    routeReason: normalizeGenerationRouteReason(response.routeReason),
    falRequestId: normalizeString(response.falRequestId),
    seed: typeof response.seed === "number" ? response.seed : undefined,
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
