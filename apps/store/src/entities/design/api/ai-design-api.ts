import type { AiDesignRequest } from "@/entities/design/model/ai-design-request";
import type { AiDesignResponse } from "@/entities/design/model/ai-design-response";
import type { DesignTokenHistoryItem } from "@/entities/design/model/token-history";
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
import { preparePatternSource } from "@/entities/design/api/prepare-pattern-source";
import { tileLogoOnCanvas } from "@/entities/design/api/tile-logo-on-canvas";
import { ph } from "@/shared/lib/posthog";

interface DesignTokenBalance {
  total: number;
  paid: number;
  bonus: number;
}

interface PatternRepairResponse {
  preparedSourceBase64?: string;
  preparedSourceMimeType?: string;
  preparedPatternTileBase64?: string;
  preparedPatternTileMimeType?: string;
  preparedPointMotifTileBase64?: string;
  preparedPointMotifTileMimeType?: string;
  repairSummary?: string | null;
  repairPromptKind?: "all_over_tile" | "one_point_motif" | null;
  prepTokensCharged?: number | null;
}

export class InsufficientTokensError extends Error {
  constructor(
    public readonly balance: number,
    public readonly cost: number,
  ) {
    super("insufficient_tokens");
    this.name = "InsufficientTokensError";
  }
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

const requiresOpenAiPatternRepair = (
  patternPreparation: Awaited<ReturnType<typeof preparePatternSource>> | null,
): boolean =>
  patternPreparation?.sourceStatus === "repair_required" ||
  patternPreparation?.fabricStatus === "repair_required";

const invokeOpenAiPatternRepair = async (params: {
  sourceImageBase64: string;
  sourceImageMimeType: string;
  patternPreparation: Awaited<ReturnType<typeof preparePatternSource>>;
  fabricMethod: AiDesignRequest["designContext"]["fabricMethod"];
  scale: AiDesignRequest["designContext"]["scale"];
  backgroundColor?: string;
}) => {
  const { data, error } = await supabase.functions.invoke(
    "prepare-pattern-source-openai",
    {
      body: {
        sourceImageBase64: params.sourceImageBase64,
        sourceImageMimeType: params.sourceImageMimeType,
        placementMode: params.patternPreparation.placementMode,
        fabricMethod: params.fabricMethod,
        scale: params.scale ?? "medium",
        backgroundColor: params.backgroundColor,
        reasonCodes: params.patternPreparation.reasonCodes,
      },
    },
  );

  if (error) {
    throw error;
  }

  return data as PatternRepairResponse | null;
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

  const [sourceImageBase64] = await Promise.all([
    sourceImage ? fileToBase64(sourceImage) : Promise.resolve(undefined),
  ]);
  const placementMode = request.designContext.ciPlacement;
  let patternPreparation =
    sourceImageBase64 &&
    sourceImage &&
    (placementMode === "all-over" || placementMode === "one-point")
      ? await preparePatternSource({
          sourceImageBase64,
          sourceImageMimeType: sourceImage.type || "image/png",
          placementMode,
          fabricMethod: request.designContext.fabricMethod,
          scale: request.designContext.scale ?? "medium",
          backgroundColor: request.designContext.colors[0],
        })
      : null;

  if (
    sourceImageBase64 &&
    sourceImage &&
    patternPreparation &&
    requiresOpenAiPatternRepair(patternPreparation)
  ) {
    try {
      const repairResult = await invokeOpenAiPatternRepair({
        sourceImageBase64:
          patternPreparation.preparedSourceBase64 ?? sourceImageBase64,
        sourceImageMimeType:
          patternPreparation.preparedSourceMimeType ??
          sourceImage.type ??
          "image/png",
        patternPreparation,
        fabricMethod: request.designContext.fabricMethod,
        scale: request.designContext.scale,
        backgroundColor: request.designContext.colors[0],
      });

      if (!repairResult?.preparedSourceBase64) {
        throw new Error("prepared_source_missing");
      }

      patternPreparation = {
        ...patternPreparation,
        preparationBackend: "openai_repair",
        repairApplied: true,
        repairPromptKind: repairResult.repairPromptKind ?? null,
        repairSummary: repairResult.repairSummary ?? null,
        prepTokensCharged: repairResult.prepTokensCharged ?? null,
        preparedSourceBase64: repairResult.preparedSourceBase64,
        preparedSourceMimeType:
          repairResult.preparedSourceMimeType === "image/png"
            ? repairResult.preparedSourceMimeType
            : "image/png",
        preparedPatternTileBase64:
          repairResult.preparedPatternTileBase64 ??
          patternPreparation.preparedPatternTileBase64,
        preparedPatternTileMimeType:
          repairResult.preparedPatternTileMimeType === "image/png"
            ? repairResult.preparedPatternTileMimeType
            : patternPreparation.preparedPatternTileMimeType,
        preparedPointMotifTileBase64:
          repairResult.preparedPointMotifTileBase64 ??
          patternPreparation.preparedPointMotifTileBase64,
        preparedPointMotifTileMimeType:
          repairResult.preparedPointMotifTileMimeType === "image/png"
            ? repairResult.preparedPointMotifTileMimeType
            : patternPreparation.preparedPointMotifTileMimeType,
      };
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
      throw new Error(
        "첨부 이미지를 패턴용으로 정리하지 못했습니다. 더 단순한 이미지를 사용해 주세요.",
      );
    }
  }

  const preparedSourceBase64 =
    patternPreparation?.preparedSourceBase64 ?? sourceImageBase64;
  const preparedSourceMimeType =
    patternPreparation?.preparedSourceMimeType ??
    sourceImage?.type ??
    undefined;
  const preparedPatternTileBase64 =
    patternPreparation?.preparedPatternTileBase64 ??
    patternPreparation?.preparedPointMotifTileBase64;
  const preparedPatternTileMimeType =
    patternPreparation?.preparedPatternTileMimeType ??
    patternPreparation?.preparedPointMotifTileMimeType;

  const useFalTiling = await shouldUseFalPipeline({
    ciImageBase64: preparedSourceBase64,
    ciPlacement: request.designContext.ciPlacement,
    fabricMethod: request.designContext.fabricMethod,
    allowFalRender: true,
  });
  const backgroundPattern =
    request.designContext.ciPlacement === "one-point" &&
    request.designContext.colors[0]
      ? {
          type: "solid" as const,
          color: request.designContext.colors[0],
        }
      : undefined;

  let tiledBase64: string | undefined;
  let tiledMimeType: string | undefined;
  const resolvedRoute = request.route ?? routeResolution.route;
  const shouldPrepareTiledPattern = resolvedRoute === "fal_tiling";
  const controlStructureBase64 =
    resolvedRoute === "fal_controlnet"
      ? (request.structureImageBase64 ??
        preparedPatternTileBase64 ??
        preparedSourceBase64)
      : request.structureImageBase64;
  const controlStructureMimeType =
    resolvedRoute === "fal_controlnet"
      ? (request.structureImageMimeType ??
        preparedPatternTileMimeType ??
        preparedSourceMimeType ??
        undefined)
      : request.structureImageMimeType;
  const canUseFalApi =
    resolvedRoute === "fal_edit" ||
    resolvedRoute === "fal_inpaint" ||
    resolvedRoute === "fal_controlnet" ||
    (resolvedRoute === "fal_tiling" && useFalTiling);

  if (
    shouldPrepareTiledPattern &&
    useFalTiling &&
    preparedSourceBase64 &&
    sourceImage &&
    request.designContext.fabricMethod
  ) {
    try {
      if (preparedPatternTileBase64 && preparedPatternTileMimeType) {
        tiledBase64 = preparedPatternTileBase64;
        tiledMimeType = preparedPatternTileMimeType;
      } else {
        const tileResult = await tileLogoOnCanvas({
          logoBase64: preparedSourceBase64,
          logoMimeType: preparedSourceMimeType || "image/png",
          scale: request.designContext.scale ?? "medium",
          backgroundColor: request.designContext.colors[0],
        });
        tiledBase64 = tileResult.base64;
        tiledMimeType = tileResult.mimeType;
      }
    } catch (error) {
      captureGenerationFailed({
        error_type: "tile_logo_on_canvas_failed",
        pipeline: "fal-ai",
        scale: request.designContext.scale ?? "medium",
        colors: request.designContext.colors,
        fabric_method: request.designContext.fabricMethod,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error("CI 패턴 이미지를 준비하지 못했습니다.");
    }
  }

  const falPayload = buildInvokePayload(request, {
    sourceImageBase64: preparedSourceBase64,
    sourceImageMimeType: preparedSourceMimeType,
    ciImageBase64: preparedSourceBase64,
    backgroundPattern,
    tiledBase64: shouldPrepareTiledPattern ? tiledBase64 : undefined,
    tiledMimeType: shouldPrepareTiledPattern ? tiledMimeType : undefined,
    patternPreparation: patternPreparation
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
      : undefined,
    route: resolvedRoute,
    routeSignals: routeResolution.signals,
    routeReason: routeResolution.reason,
    routeHint: request.routeHint,
    baseImageUrl: request.baseImageUrl,
    baseImageWorkId: request.baseImageWorkId,
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
    sourceImageBase64: preparedSourceBase64,
    sourceImageMimeType: preparedSourceMimeType,
    ciImageBase64: preparedSourceBase64,
    backgroundPattern,
    patternPreparation: patternPreparation
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
      : undefined,
    routeHint: request.routeHint,
    baseImageUrl: request.baseImageUrl,
    baseImageWorkId: request.baseImageWorkId,
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
  const routeReason = patternPreparation
    ? request.designContext.ciPlacement === "one-point"
      ? patternPreparation.preparedSourceKind === "repaired"
        ? "one_point_source_repaired"
        : "one_point_source_ready"
      : patternPreparation.fabricStatus === "repair_required"
        ? "fabric_constraint_repaired"
        : patternPreparation.preparedSourceKind === "repaired"
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
