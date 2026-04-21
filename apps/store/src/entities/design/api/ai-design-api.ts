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
import { resolveGenerationRoute } from "@/entities/design/api/resolve-generation-route";
import { shouldUseFalPipeline } from "@/entities/design/api/should-use-fal-pipeline";
import { tileLogoOnCanvas } from "@/entities/design/api/tile-logo-on-canvas";
import { ph } from "@/shared/lib/posthog";

interface DesignTokenBalance {
  total: number;
  paid: number;
  bonus: number;
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

const getFallbackFunctionName = (request: AiDesignRequest) =>
  request.aiModel === "openai" ? "generate-open-api" : "generate-google-api";

export async function aiDesignApi(
  request: AiDesignRequest,
): Promise<AiDesignResponse> {
  const routeResolution = resolveGenerationRoute({
    userMessage: request.userMessage,
    hasCiImage: !!request.designContext.ciImage,
    hasReferenceImage: !!request.designContext.referenceImage,
    hasPreviousGeneratedImage: !!request.baseImageUrl,
    selectedPreviewImageUrl: request.baseImageUrl ?? null,
    detectedPattern: request.designContext.pattern,
  });

  const [ciImageBase64, referenceImageBase64] = await Promise.all([
    request.designContext.ciImage
      ? fileToBase64(request.designContext.ciImage)
      : Promise.resolve(undefined),
    request.designContext.referenceImage
      ? fileToBase64(request.designContext.referenceImage)
      : Promise.resolve(undefined),
  ]);

  const useFalTiling = await shouldUseFalPipeline({
    ciImageBase64,
    ciPlacement: request.designContext.ciPlacement,
    fabricMethod: request.designContext.fabricMethod,
    allowFalRender: (request.executionMode ?? "auto") !== "analysis_only",
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
  const isPatternRoute =
    resolvedRoute === "fal_tiling" || resolvedRoute === "fal_controlnet";
  const canUseFalApi =
    resolvedRoute === "fal_edit" ||
    resolvedRoute === "fal_inpaint" ||
    resolvedRoute === "fal_controlnet" ||
    (resolvedRoute === "fal_tiling" && useFalTiling);

  if (
    isPatternRoute &&
    useFalTiling &&
    ciImageBase64 &&
    request.designContext.ciImage &&
    request.designContext.fabricMethod
  ) {
    try {
      const tileResult = await tileLogoOnCanvas({
        logoBase64: ciImageBase64,
        logoMimeType: request.designContext.ciImage.type || "image/png",
        scale: request.designContext.scale ?? "medium",
        backgroundColor: request.designContext.colors[0],
      });
      tiledBase64 = tileResult.base64;
      tiledMimeType = tileResult.mimeType;
    } catch (error) {
      safeCapture("design_generation_failed", {
        ai_model: request.aiModel,
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

  const functionName = canUseFalApi
    ? "generate-fal-api"
    : getFallbackFunctionName(request);

  const invokePayload = canUseFalApi
    ? buildInvokePayload(request, {
        ciImageBase64,
        referenceImageBase64,
        backgroundPattern,
        tiledBase64: isPatternRoute ? tiledBase64 : undefined,
        tiledMimeType: isPatternRoute ? tiledMimeType : undefined,
        route: resolvedRoute,
        routeSignals: routeResolution.signals,
        routeReason: routeResolution.reason,
        routeHint: request.routeHint,
        baseImageUrl: request.baseImageUrl,
        baseImageWorkId: request.baseImageWorkId,
        controlType: request.controlType,
        structureImageBase64: request.structureImageBase64,
        structureImageMimeType: request.structureImageMimeType,
        baseImageBase64: request.baseImageBase64,
        baseImageMimeType: request.baseImageMimeType,
        maskBase64: request.maskBase64,
        maskMimeType: request.maskMimeType,
        editPrompt: request.editPrompt,
      })
    : buildInvokePayload(request, {
        ciImageBase64,
        referenceImageBase64,
        backgroundPattern,
      });

  const startTime = Date.now();

  let { data, error } = await supabase.functions.invoke(functionName, {
    body: invokePayload,
  });
  let usedFallback = false;

  if (error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const body = (await context.json()) as {
        error?: string;
        balance?: number;
        cost?: number;
      };
      if (body.error === "insufficient_tokens") {
        safeCapture("design_generation_failed", {
          ai_model: request.aiModel,
          error_type: "insufficient_tokens",
        });
        throw new InsufficientTokensError(body.balance ?? 0, body.cost ?? 0);
      }

      if (
        body.error === "fal_pipeline_disabled" &&
        routeResolution.route !== "openai"
      ) {
        usedFallback = true;
        ({ data, error } = await supabase.functions.invoke(
          getFallbackFunctionName(request),
          {
            body: buildInvokePayload(request, {
              ciImageBase64,
              referenceImageBase64,
              backgroundPattern,
              routeHint: request.routeHint,
              baseImageUrl: request.baseImageUrl,
              baseImageWorkId: request.baseImageWorkId,
            }),
          },
        ));
      }
    }
  }

  const usedFalApi = canUseFalApi && !usedFallback;

  if (error) {
    safeCapture("design_generation_failed", {
      ai_model: request.aiModel,
      error_type: "api_error",
      pipeline: usedFalApi ? "fal-ai" : undefined,
    });
    throw new Error(`디자인 생성 실패: ${error.message}`);
  }

  if (!data) {
    safeCapture("design_generation_failed", {
      ai_model: request.aiModel,
      error_type: "api_error",
      pipeline: usedFalApi ? "fal-ai" : undefined,
    });
    throw new Error("디자인 생성 결과를 받을 수 없습니다.");
  }

  const result = normalizeInvokeResponse(data, request);
  safeCapture("design_generated", {
    ai_model: request.aiModel,
    latency_ms: Date.now() - startTime,
    has_image: result.imageUrl !== null,
    pipeline: usedFalApi ? "fal-ai" : undefined,
    route: result.route ?? routeResolution.route,
    route_reason: result.routeReason ?? routeResolution.reason,
    route_signals: result.routeSignals ?? routeResolution.signals,
  });
  return result;
}
