import type { AiDesignRequest } from "@/entities/design/model/ai-design-request";
import type { AiDesignResponse } from "@/entities/design/model/ai-design-response";
import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
import { InsufficientTokensError } from "@/entities/design/model/design-errors";
import { supabase } from "@/shared/lib/supabase";
import {
  buildInvokePayload,
  normalizeInvokeResponse,
  toDesignTokenHistoryItem,
  type DesignTokenRow,
} from "@/entities/design/api/ai-design-mapper";
import { falProvider } from "@/entities/design/api/providers/fal-provider";
import { openaiProvider } from "@/entities/design/api/providers/openai-provider";
import { parseEdgeErrorResponse } from "@/entities/design/api/providers/parse-edge-error";
import { runProviderChain } from "@/entities/design/api/providers/provider-chain";
import { resolveGenerationRouteAsync } from "@/entities/design/api/resolve-generation-route";
import { shouldUseFalPipeline } from "@/entities/design/api/should-use-fal-pipeline";
import { ph } from "@/shared/lib/posthog";

interface DesignTokenBalance {
  total: number;
  paid: number;
  bonus: number;
}

interface PatternPreparationResponse {
  workflowId?: string | null;
  prepWorkId?: string | null;
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
  userMessage: string;
  preparedSourceBase64?: string;
  preparedSourceMimeType?: string;
  preparedPatternTileBase64?: string;
  preparedPatternTileMimeType?: string;
  preparedPointMotifTileBase64?: string;
  preparedPointMotifTileMimeType?: string;
  tileSizePx?: number;
  gapPx?: number;
  compositeCanvasWidth?: number;
  compositeCanvasHeight?: number;
  harmonizationApplied?: boolean;
  harmonizationBackend?: "fal" | "openai" | null;
}

const DESIGN_TOKEN_SELECT_FIELDS =
  "id, user_id, amount, type, ai_model, request_type, description, created_at, work_id";
const DEFAULT_AI_MODEL = "openai" as const;

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("CI 이미지 인코딩 결과가 올바르지 않습니다."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("CI 이미지 인코딩에 실패했습니다."));
    };

    reader.readAsDataURL(file);
  });

export async function getDesignTokenBalance(): Promise<DesignTokenBalance> {
  const { data, error } = await supabase.rpc("get_design_token_balance");

  if (error) {
    throw new Error(`토큰 잔액 조회 실패: ${error.message}`);
  }

  const raw: { total?: number; paid?: number; bonus?: number } | null = data;
  return {
    total: raw?.total ?? 0,
    paid: raw?.paid ?? 0,
    bonus: raw?.bonus ?? 0,
  };
}

export async function getDesignTokenHistory(): Promise<
  DesignTokenHistoryItem[]
> {
  const { data, error } = await supabase
    .from("design_tokens")
    .select(DESIGN_TOKEN_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`토큰 내역 조회 실패: ${error.message}`);
  }

  const rows: DesignTokenRow[] = data ?? [];
  return rows.map(toDesignTokenHistoryItem);
}

function safeCapture(
  eventName: Parameters<typeof ph.capture>[0],
  payload: Parameters<typeof ph.capture>[1],
) {
  try {
    ph.capture(eventName, payload as never);
  } catch (e) {
    console.warn("analytics error:", e);
  }
}

const getErrorResponseBody = async (
  error: unknown,
): Promise<{ error?: string; balance?: number; cost?: number } | null> => {
  return (await parseEdgeErrorResponse(error)) as {
    error?: string;
    balance?: number;
    cost?: number;
  };
};

const captureGenerationFailed = (
  payload: Omit<Parameters<typeof safeCapture>[1], "ai_model">,
): void => {
  safeCapture("design_generation_failed", {
    ai_model: DEFAULT_AI_MODEL,
    ...payload,
  });
};

const invokePatternComposite = async (params: {
  sourceImageBase64: string;
  sourceImageMimeType: string;
  placementMode: "all-over" | "one-point";
  fabricMethod: AiDesignRequest["designContext"]["fabricMethod"];
  scale: AiDesignRequest["designContext"]["scale"];
  backgroundColor?: string;
}) => {
  const { data, error } = await supabase.functions.invoke(
    "prepare-pattern-composite",
    {
      body: {
        sourceImageBase64: params.sourceImageBase64,
        sourceImageMimeType: params.sourceImageMimeType,
        placementMode: params.placementMode,
        fabricMethod: params.fabricMethod,
        scale: params.scale ?? "medium",
        backgroundColor: params.backgroundColor,
      },
    },
  );

  if (error) {
    throw error;
  }

  return data as PatternPreparationResponse | null;
};

export async function aiDesignApi(
  request: AiDesignRequest,
): Promise<AiDesignResponse> {
  const sourceImage =
    request.designContext.sourceImage ??
    request.designContext.ciImage ??
    request.designContext.referenceImage ??
    null;
  const routeResolution = await resolveGenerationRouteAsync({
    userMessage: request.userMessage,
    hasCiImage: !!sourceImage,
    hasReferenceImage: false,
    hasPreviousGeneratedImage: !!request.baseImageUrl,
    selectedPreviewImageUrl: request.baseImageUrl ?? null,
    detectedPattern: request.designContext.pattern,
  });

  const sourceImageBase64 = sourceImage
    ? await fileToBase64(sourceImage)
    : undefined;
  const placementMode = request.designContext.ciPlacement;
  let patternPreparation: PatternPreparationResponse | null = null;

  if (
    sourceImageBase64 &&
    sourceImage &&
    (placementMode === "all-over" || placementMode === "one-point")
  ) {
    try {
      patternPreparation = await invokePatternComposite({
        sourceImageBase64,
        sourceImageMimeType: sourceImage.type || "image/png",
        placementMode,
        fabricMethod: request.designContext.fabricMethod,
        scale: request.designContext.scale ?? "medium",
        backgroundColor: request.designContext.colors[0],
      });
    } catch (error) {
      const body = await getErrorResponseBody(error);

      if (body?.error === "insufficient_tokens") {
        captureGenerationFailed({
          error_type: "insufficient_tokens",
        });
        throw new InsufficientTokensError(body.balance ?? 0, body.cost ?? 0);
      }

      captureGenerationFailed({
        error_type: "pattern_preparation_failed",
      });
    }
  }

  const preparedSourceBase64 =
    patternPreparation?.preparedSourceBase64 ?? sourceImageBase64;
  const preparedSourceMimeType =
    patternPreparation?.preparedSourceMimeType ??
    sourceImage?.type ??
    undefined;
  const preparedCompositeBase64 =
    patternPreparation?.preparedPatternTileBase64 ??
    patternPreparation?.preparedPointMotifTileBase64;
  const preparedCompositeMimeType =
    patternPreparation?.preparedPatternTileMimeType ??
    patternPreparation?.preparedPointMotifTileMimeType;
  const preparedRenderImageBase64 =
    placementMode === "one-point"
      ? (preparedCompositeBase64 ?? preparedSourceBase64)
      : preparedSourceBase64;
  const preparedRenderImageMimeType =
    placementMode === "one-point"
      ? (preparedCompositeMimeType ?? preparedSourceMimeType)
      : preparedSourceMimeType;

  const backgroundPattern =
    request.designContext.ciPlacement === "one-point" &&
    request.designContext.colors[0]
      ? {
          type: "solid" as const,
          color: request.designContext.colors[0],
        }
      : undefined;

  const requestedRoute = request.route ?? routeResolution.route;
  const resolvedRoute =
    requestedRoute === "fal_tiling" &&
    placementMode === "all-over" &&
    !preparedCompositeBase64
      ? "openai"
      : requestedRoute;
  const useFalTiling =
    resolvedRoute === "fal_tiling"
      ? await shouldUseFalPipeline({
          ciImageBase64: preparedSourceBase64,
          ciPlacement: request.designContext.ciPlacement,
          fabricMethod: request.designContext.fabricMethod,
          allowFalRender: true,
        })
      : false;
  const shouldPrepareTiledPattern =
    resolvedRoute === "fal_tiling" && placementMode === "all-over";
  const controlStructureBase64 =
    resolvedRoute === "fal_controlnet"
      ? (request.structureImageBase64 ??
        preparedCompositeBase64 ??
        preparedSourceBase64)
      : request.structureImageBase64;
  const controlStructureMimeType =
    resolvedRoute === "fal_controlnet"
      ? (request.structureImageMimeType ??
        preparedCompositeMimeType ??
        preparedSourceMimeType ??
        undefined)
      : request.structureImageMimeType;
  const canUseFalApi =
    resolvedRoute === "fal_edit" ||
    resolvedRoute === "fal_inpaint" ||
    resolvedRoute === "fal_controlnet" ||
    (resolvedRoute === "fal_tiling" && useFalTiling);
  const patternPreparationPayload = patternPreparation
    ? {
        placementMode: patternPreparation.placementMode,
        sourceStatus: patternPreparation.sourceStatus,
        fabricStatus: patternPreparation.fabricStatus,
        reasonCodes: patternPreparation.reasonCodes,
        preparedSourceKind: patternPreparation.preparedSourceKind,
        preparationBackend: patternPreparation.preparationBackend,
        repairApplied: patternPreparation.repairApplied,
        repairPromptKind: patternPreparation.repairPromptKind,
        repairSummary: patternPreparation.repairSummary,
        prepTokensCharged: patternPreparation.prepTokensCharged,
      }
    : undefined;
  const sharedPayload = {
    sourceImageBase64: preparedRenderImageBase64,
    sourceImageMimeType: preparedRenderImageMimeType,
    ciImageBase64: preparedRenderImageBase64,
    workflowId: patternPreparation?.workflowId,
    prepWorkId: patternPreparation?.prepWorkId,
    backgroundPattern,
    patternPreparation: patternPreparationPayload,
    routeHint: request.routeHint,
    baseImageUrl: request.baseImageUrl,
    baseImageWorkId: request.baseImageWorkId,
  };

  const falPayload = buildInvokePayload(request, {
    ...sharedPayload,
    tiledBase64: shouldPrepareTiledPattern
      ? preparedCompositeBase64
      : undefined,
    tiledMimeType: shouldPrepareTiledPattern
      ? preparedCompositeMimeType
      : undefined,
    route: resolvedRoute,
    routeSignals: routeResolution.signals,
    routeReason: routeResolution.reason,
    controlType: request.controlType,
    structureImageBase64: controlStructureBase64,
    structureImageMimeType: controlStructureMimeType,
    baseImageBase64: request.baseImageBase64,
    baseImageMimeType: request.baseImageMimeType,
    maskBase64: request.maskBase64,
    maskMimeType: request.maskMimeType,
    editPrompt: request.editPrompt,
  }) as Record<string, unknown>;

  const defaultPayload = buildInvokePayload(request, {
    ...sharedPayload,
  }) as Record<string, unknown>;

  const startTime = Date.now();
  let data: unknown;
  let providerUsed: "fal" | "openai";

  try {
    const chainResult = await runProviderChain(
      {
        request,
        defaultPayload,
        falPayload,
        resolvedRoute,
        canUseFalApi,
      },
      [falProvider, openaiProvider],
    );

    data = chainResult.result;
    providerUsed = chainResult.providerUsed;
  } catch (error) {
    const body = await getErrorResponseBody(error);

    if (body?.error === "insufficient_tokens") {
      captureGenerationFailed({
        error_type: "insufficient_tokens",
      });
      throw new InsufficientTokensError(body.balance ?? 0, body.cost ?? 0);
    }

    captureGenerationFailed({
      error_type: "api_error",
      pipeline: canUseFalApi ? "fal-ai" : undefined,
    });
    throw new Error(
      `디자인 생성 실패: ${error instanceof Error ? error.message : String(error)}`,
      {
        cause: error,
      },
    );
  }

  const usedFalApi = providerUsed === "fal";

  if (!data) {
    captureGenerationFailed({
      error_type: "api_error",
      pipeline: usedFalApi ? "fal-ai" : undefined,
    });
    throw new Error("디자인 생성 결과를 받을 수 없습니다.");
  }

  const result = normalizeInvokeResponse(
    data as Parameters<typeof normalizeInvokeResponse>[0],
    request,
  );
  const patternPreparationMessage = patternPreparation?.userMessage;
  const sourceRepairing =
    patternPreparation?.preparedSourceKind === "repaired" ||
    patternPreparation?.sourceStatus === "repair_required";
  const fabricRepairing =
    patternPreparation?.fabricStatus === "repair_required";
  const routeReason = patternPreparation
    ? request.designContext.ciPlacement === "one-point"
      ? sourceRepairing || fabricRepairing
        ? "one_point_source_repaired"
        : "one_point_source_ready"
      : fabricRepairing
        ? "fabric_constraint_repaired"
        : sourceRepairing
          ? "pattern_source_repaired"
          : "pattern_source_ready"
    : (result.routeReason ?? routeResolution.reason);
  safeCapture("design_generated", {
    ai_model: DEFAULT_AI_MODEL,
    latency_ms: Date.now() - startTime,
    has_image: result.imageUrl !== null,
    pipeline: usedFalApi ? "fal-ai" : undefined,
    route: result.route ?? routeResolution.route,
    route_reason: routeReason,
    route_signals: result.routeSignals ?? routeResolution.signals,
  });
  return {
    ...result,
    routeReason,
    patternPreparationMessage,
  };
}
