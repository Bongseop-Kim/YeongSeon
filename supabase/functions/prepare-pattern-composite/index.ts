import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from "@/functions/_shared/supabase-clients.ts";
import {
  type GenerationRequestType,
  type ImageQuality,
  type UseDesignTokensResult,
} from "@/functions/_shared/design-generation.ts";
import {
  buildAllOverRepairPrompt,
  buildOnePointRepairPrompt,
} from "@/functions/_shared/prompt-builders.ts";
import {
  OPENAI_EDITS_CANVAS_SIZE,
  assessPatternPreparation,
  buildOpenAiEditCanvas,
  composeAllOverTile,
  composeOnePointMotif,
  computeMetrics,
  decodeBase64Image,
  maybeDownscaleImage,
  readImageRgba,
  renderPreparedSource,
  toPngBase64,
  type PatternPreparationResult,
} from "@/functions/_shared/pattern-composite.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";

type PreparePatternCompositeRequest = {
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  placementMode?: "all-over" | "one-point";
  fabricMethod?: string | null;
  scale?: "large" | "medium" | "small" | null;
  backgroundColor?: string;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

const OPENAI_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BASE64_LENGTH = 5_000_000;
const MIN_REPAIR_EDGE_PX = 64;
const OPENAI_IMAGE_EDIT_MODEL = "gpt-image-1.5";
const PREP_REQUEST_TYPE = "prep" as const satisfies GenerationRequestType;
const PREP_QUALITY = "high" as const satisfies ImageQuality;
const PREP_AI_MODEL = "openai" as const;

const chargeTokens = async (
  adminClient: SupabaseClient,
  params: {
    userId: string;
    requestType: GenerationRequestType;
    quality: ImageQuality;
    workId: string;
  },
) => {
  const { data, error } = await adminClient.rpc("use_design_tokens", {
    p_user_id: params.userId,
    p_ai_model: PREP_AI_MODEL,
    p_request_type: params.requestType,
    p_quality: params.quality,
    p_work_id: params.workId,
  });

  return {
    data: data as UseDesignTokensResult | null,
    error,
  };
};

const refundTokens = async (
  adminClient: SupabaseClient,
  params: {
    userId: string;
    amount: number;
    requestType: GenerationRequestType;
    workId: string;
  },
) => {
  if (params.amount <= 0) {
    return false;
  }

  const { error } = await adminClient.rpc("refund_design_tokens", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_ai_model: PREP_AI_MODEL,
    p_request_type: params.requestType,
    p_work_id: params.workId,
  });

  return !error;
};

const requestOpenAiRepair = async (params: {
  apiKey: string;
  prompt: string;
  sourceImageBytes: Uint8Array;
}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  let response: Response;
  try {
    const formData = new FormData();
    formData.append(
      "image",
      new Blob([params.sourceImageBytes as Uint8Array<ArrayBuffer>], {
        type: "image/png",
      }),
      "pattern-source.png",
    );
    formData.append("prompt", params.prompt);
    formData.append("model", OPENAI_IMAGE_EDIT_MODEL);
    formData.append(
      "size",
      `${OPENAI_EDITS_CANVAS_SIZE}x${OPENAI_EDITS_CANVAS_SIZE}`,
    );
    formData.append("quality", "high");

    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
      signal: controller.signal,
      body: formData,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "OpenAI pattern composite API failed:",
      response.status,
      errorText,
    );
    throw new Error("OpenAI pattern composite API failed");
  }

  const result = (await response.json()) as OpenAIImageResponse;
  const base64 = result.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI pattern composite API returned empty content");
  }

  return base64;
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  let supabase;
  let adminClient;
  try {
    supabase = createAuthenticatedSupabaseClient(authHeader);
    adminClient = createAdminSupabaseClient();
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error
          ? error.message
          : "Missing Supabase configuration",
    });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  let payload: PreparePatternCompositeRequest;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (
    typeof payload.sourceImageBase64 !== "string" ||
    payload.sourceImageBase64.length === 0
  ) {
    return jsonResponse(400, { error: "sourceImageBase64 is required" });
  }
  if (payload.sourceImageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse(413, { error: "sourceImageBase64 too large" });
  }
  if (
    typeof payload.sourceImageMimeType !== "string" ||
    payload.sourceImageMimeType.length === 0
  ) {
    return jsonResponse(400, { error: "sourceImageMimeType is required" });
  }
  if (
    payload.placementMode !== "all-over" &&
    payload.placementMode !== "one-point"
  ) {
    return jsonResponse(400, { error: "placementMode is required" });
  }

  const scale = payload.scale ?? "medium";
  const backgroundColor = payload.backgroundColor ?? "#e8e4de";
  const workflowId = crypto.randomUUID();
  const prepWorkId = crypto.randomUUID();
  const phaseStartTime = Date.now();
  let tokensCharged = 0;
  let tokensRefunded = 0;
  let remainingTokens: number | null = null;
  let imageLatencyMs: number | null = null;

  const emitPrepLog = async (
    result: PatternPreparationResult | null,
    overrides: Record<string, unknown> = {},
  ) => {
    await logGeneration(adminClient, {
      work_id: prepWorkId,
      workflow_id: workflowId,
      phase: "prep",
      parent_work_id: null,
      user_id: user.id,
      ai_model: result?.repairApplied ? PREP_AI_MODEL : "fal",
      request_type: PREP_REQUEST_TYPE,
      quality: PREP_QUALITY,
      user_message: "prepare-pattern-composite",
      prompt_length: 0,
      request_attachments: null,
      design_context: null,
      normalized_design: null,
      conversation_turn: 0,
      has_ci_image: true,
      has_reference_image: false,
      has_previous_image: false,
      generate_image: true,
      eligible_for_render: true,
      missing_requirements: null,
      eligibility_reason: null,
      detected_design: null,
      text_prompt: null,
      image_prompt: null,
      image_edit_prompt: null,
      ai_message: result?.userMessage ?? null,
      image_generated: false,
      generated_image_url: null,
      pattern_preparation_backend: result?.preparationBackend ?? null,
      pattern_repair_prompt_kind: result?.repairPromptKind ?? null,
      pattern_repair_applied: result?.repairApplied ?? null,
      pattern_repair_reason_codes: result?.reasonCodes ?? null,
      prep_tokens_charged: result?.prepTokensCharged ?? null,
      tokens_charged: tokensCharged,
      tokens_refunded: tokensRefunded,
      text_latency_ms: null,
      image_latency_ms: imageLatencyMs,
      total_latency_ms: Date.now() - phaseStartTime,
      ...overrides,
    });
  };

  try {
    const downscaledBytes = await maybeDownscaleImage(
      decodeBase64Image(payload.sourceImageBase64),
    );
    const sourceImage = await readImageRgba(downscaledBytes);
    const assessed = assessPatternPreparation({
      placementMode: payload.placementMode,
      fabricMethod: payload.fabricMethod ?? null,
      metrics: computeMetrics(
        sourceImage.pixels,
        sourceImage.width,
        sourceImage.height,
      ),
    });

    const prepared = await renderPreparedSource(
      sourceImage,
      payload.fabricMethod === "yarn-dyed",
    );
    if (!prepared) {
      throw new Error("prepared_source_missing");
    }
    let preparedSourceBytes = prepared.bytes;
    const preparedWidth = prepared.width;
    const preparedHeight = prepared.height;

    let result: PatternPreparationResult = {
      ...assessed,
      preparedSourceBase64: toPngBase64(preparedSourceBytes),
      preparedSourceMimeType: "image/png",
      tileSizePx: 0,
      gapPx: 0,
      compositeCanvasWidth: 0,
      compositeCanvasHeight: 0,
      harmonizationApplied: false,
      harmonizationBackend: null,
    };

    const sourceTooSmallForRepair =
      preparedWidth < MIN_REPAIR_EDGE_PX || preparedHeight < MIN_REPAIR_EDGE_PX;
    const repairNeeded =
      (assessed.sourceStatus === "repair_required" ||
        assessed.fabricStatus === "repair_required") &&
      !sourceTooSmallForRepair;

    if (sourceTooSmallForRepair) {
      console.warn(
        "prepare-pattern-composite: prepared source too small for OpenAI repair; using local preparation only",
        {
          width: preparedWidth,
          height: preparedHeight,
          placementMode: payload.placementMode,
          fabricMethod: payload.fabricMethod ?? null,
        },
      );
    }

    if (repairNeeded && openaiApiKey) {
      const { data: tokenResult, error: tokenError } = await chargeTokens(
        adminClient,
        {
          userId: user.id,
          requestType: PREP_REQUEST_TYPE,
          quality: PREP_QUALITY,
          workId: prepWorkId,
        },
      );

      if (tokenError) {
        await emitPrepLog(result, {
          error_type: "token_processing_failed",
          error_message: tokenError.message,
        });
        return jsonResponse(500, { error: "token_processing_failed" });
      }

      if (!tokenResult?.success) {
        await emitPrepLog(result, {
          error_type: tokenResult?.error ?? "insufficient_tokens",
          error_message: tokenResult?.error ?? "Token deduction was rejected",
        });
        return jsonResponse(403, {
          error: "insufficient_tokens",
          balance: tokenResult?.balance ?? 0,
          cost: tokenResult?.cost ?? 0,
        });
      }

      tokensCharged = tokenResult.cost;
      remainingTokens = tokenResult.balance;
      const prompt =
        payload.placementMode === "all-over"
          ? buildAllOverRepairPrompt({
              fabricMethod: payload.fabricMethod,
              reasonCodes: assessed.reasonCodes,
            })
          : buildOnePointRepairPrompt({
              fabricMethod: payload.fabricMethod,
              reasonCodes: assessed.reasonCodes,
            });

      try {
        const editCanvas = await buildOpenAiEditCanvas(preparedSourceBytes);

        console.info("prepare-pattern-composite: calling OpenAI edits", {
          placementMode: payload.placementMode,
          fabricMethod: payload.fabricMethod ?? null,
          sourceWidth: editCanvas.sourceWidth,
          sourceHeight: editCanvas.sourceHeight,
          canvasBytes: editCanvas.bytes.length,
          reasonCodes: assessed.reasonCodes,
        });

        const imageStartTime = Date.now();
        const repairedBase64 = await requestOpenAiRepair({
          apiKey: openaiApiKey,
          prompt,
          sourceImageBytes: editCanvas.bytes,
        });
        imageLatencyMs = Date.now() - imageStartTime;
        preparedSourceBytes = decodeBase64Image(repairedBase64);
        result = {
          ...result,
          preparationBackend: "openai_repair",
          repairApplied: true,
          repairPromptKind:
            payload.placementMode === "all-over"
              ? "all_over_tile"
              : "one_point_motif",
          repairSummary:
            payload.placementMode === "all-over"
              ? "타일 반복 간격을 균일하게 보정했습니다."
              : "원포인트용 단일 모티프로 정리했습니다.",
          preparedSourceBase64: repairedBase64,
          prepTokensCharged: tokensCharged,
        };
      } catch (error) {
        console.error("prepare-pattern-composite: OpenAI repair failed", {
          error: error instanceof Error ? error.message : String(error),
          placementMode: payload.placementMode,
          fabricMethod: payload.fabricMethod ?? null,
          preparedWidth,
          preparedHeight,
          reasonCodes: assessed.reasonCodes,
        });
        const refunded = await refundTokens(adminClient, {
          userId: user.id,
          amount: tokensCharged,
          requestType: PREP_REQUEST_TYPE,
          workId: `${prepWorkId}_prep_failed_refund`,
        });

        if (refunded) {
          tokensRefunded += tokensCharged;
          if (remainingTokens !== null) {
            remainingTokens += tokensCharged;
          }
        }

        await emitPrepLog(result, {
          error_type: "pattern_preparation_failed",
          error_message: error instanceof Error ? error.message : String(error),
        });
        return jsonResponse(502, {
          error: "pattern_preparation_failed",
          remainingTokens: remainingTokens ?? 0,
        });
      }
    }

    if (payload.placementMode === "all-over") {
      const composed = await composeAllOverTile({
        spriteBytes: preparedSourceBytes,
        backgroundColor,
        scale,
      });

      result = {
        ...result,
        preparedPatternTileBase64: toPngBase64(composed.tileBytes),
        preparedPatternTileMimeType: "image/png",
        tileSizePx: composed.tileSizePx,
        gapPx: composed.gapPx,
        compositeCanvasWidth: composed.compositeCanvasWidth,
        compositeCanvasHeight: composed.compositeCanvasHeight,
      };
    } else {
      const composed = await composeOnePointMotif({
        spriteBytes: preparedSourceBytes,
        backgroundColor,
        scale,
      });

      result = {
        ...result,
        preparedPointMotifTileBase64: toPngBase64(composed.motifBytes),
        preparedPointMotifTileMimeType: "image/png",
        tileSizePx: composed.tileSizePx,
        gapPx: composed.gapPx,
        compositeCanvasWidth: composed.compositeCanvasWidth,
        compositeCanvasHeight: composed.compositeCanvasHeight,
      };
    }

    await emitPrepLog(result, {
      image_generated: Boolean(result.repairApplied),
    });

    return jsonResponse(200, result as unknown as Record<string, unknown>);
  } catch (error) {
    console.error("prepare-pattern-composite failed:", error);
    return jsonResponse(500, {
      error: "pattern_preparation_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});
