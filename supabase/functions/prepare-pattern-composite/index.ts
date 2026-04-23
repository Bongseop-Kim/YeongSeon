import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  saveGenerationArtifact,
  type GenerationArtifactRow,
  type SaveGenerationArtifactResult,
} from "@/functions/_shared/generation-artifacts.ts";
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

type ErrorWithRemainingTokens = Error & {
  remainingTokens?: number | null;
};

const OPENAI_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BASE64_LENGTH = 5_000_000;
const MIN_REPAIR_EDGE_PX = 64;
const OPENAI_IMAGE_EDIT_MODEL = "gpt-image-1.5";
const PREP_REQUEST_TYPE = "prep" as const satisfies GenerationRequestType;
const PREP_QUALITY = "high" as const satisfies ImageQuality;
const PREP_AI_MODEL = "openai" as const;

const getCorsHeaders = (
  requestOrigin: string | null,
): Record<string, string> => {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const allowedOrigins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
    Vary: "Origin",
  };

  if (allowedOrigins.length === 0) {
    return base;
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return { ...base, "Access-Control-Allow-Origin": requestOrigin };
  }

  return base;
};

export type PrepArtifactRecorderContext = {
  workflowId: string;
  prepWorkId: string;
  placementMode: "all-over" | "one-point";
  sourceStatus: string;
  fabricStatus: string;
  reasonCodes: string[] | null;
  repairPromptKind: "all_over_tile" | "one_point_motif";
};

type PrepArtifactRecorderDeps = {
  saveGenerationArtifact: typeof saveGenerationArtifact;
  recordArtifactRow: (
    row: GenerationArtifactRow,
  ) => Promise<{ error: { message: string } | null } | void>;
};

type PrepArtifactRecorder = {
  recordSourceOriginal: (
    bytes: Uint8Array,
  ) => Promise<SaveGenerationArtifactResult>;
  recordOpenAiEditCanvas: (
    bytes: Uint8Array,
  ) => Promise<SaveGenerationArtifactResult>;
  recordPreparedSource: (
    base64: string,
  ) => Promise<SaveGenerationArtifactResult>;
  recordPreparedComposite: (
    bytes: Uint8Array,
    parentArtifactId: string | null,
    preparedSourceKind: "original" | "repaired",
  ) => Promise<SaveGenerationArtifactResult>;
};

const createRecordArtifactRow = (adminClient: SupabaseClient) => {
  return async (row: GenerationArtifactRow) => {
    const { error } = await adminClient
      .from("ai_generation_log_artifacts")
      .insert(row);

    return { error: error ? { message: error.message } : null };
  };
};

export const createPrepArtifactRecorder = (
  context: PrepArtifactRecorderContext,
  deps: PrepArtifactRecorderDeps,
): PrepArtifactRecorder => {
  const recordArtifact = async (
    artifactType: string,
    image:
      | { kind: "buffer"; bytes: Uint8Array; mimeType: string }
      | { kind: "base64"; base64: string; mimeType: string },
    meta: Record<string, unknown>,
    parentArtifactId: string | null = null,
  ) =>
    await deps.saveGenerationArtifact(
      {
        workflowId: context.workflowId,
        phase: "prep",
        artifactType,
        sourceWorkId: context.prepWorkId,
        parentArtifactId,
        image,
        meta,
      },
      {
        recordArtifactRow: deps.recordArtifactRow,
      },
    );

  return {
    recordSourceOriginal: async (bytes) =>
      await recordArtifact(
        "source_original",
        { kind: "buffer", bytes, mimeType: "image/png" },
        {
          placementMode: context.placementMode,
          sourceStatus: context.sourceStatus,
          fabricStatus: context.fabricStatus,
        },
      ),
    recordOpenAiEditCanvas: async (bytes) =>
      await recordArtifact(
        "openai_edit_canvas",
        { kind: "buffer", bytes, mimeType: "image/png" },
        {
          placementMode: context.placementMode,
          repairPromptKind: context.repairPromptKind,
        },
      ),
    recordPreparedSource: async (base64) =>
      await recordArtifact(
        "prepared_source",
        { kind: "base64", base64, mimeType: "image/png" },
        {
          repairApplied: true,
          reasonCodes: context.reasonCodes,
        },
      ),
    recordPreparedComposite: async (
      bytes,
      parentArtifactId,
      preparedSourceKind,
    ) =>
      await recordArtifact(
        context.placementMode === "all-over"
          ? "prepared_tile"
          : "prepared_point_motif",
        { kind: "buffer", bytes, mimeType: "image/png" },
        {
          placementMode: context.placementMode,
          preparedSourceKind,
        },
        parentArtifactId,
      ),
  };
};

const attachRemainingTokens = (
  error: unknown,
  nextRemainingTokens: number | null,
): ErrorWithRemainingTokens => {
  const normalizedError =
    error instanceof Error ? error : new Error(String(error));
  const errorWithRemainingTokens = normalizedError as ErrorWithRemainingTokens;
  errorWithRemainingTokens.remainingTokens = nextRemainingTokens;
  return errorWithRemainingTokens;
};

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

type PreparePatternCompositeDeps = {
  getCorsHeaders: (requestOrigin: string | null) => Record<string, string>;
  getOpenAiApiKey: () => string | undefined;
  createAuthenticatedSupabaseClient: typeof createAuthenticatedSupabaseClient;
  createAdminSupabaseClient: typeof createAdminSupabaseClient;
  saveGenerationArtifact: typeof saveGenerationArtifact;
  maybeDownscaleImage: typeof maybeDownscaleImage;
  readImageRgba: typeof readImageRgba;
  assessPatternPreparation: typeof assessPatternPreparation;
  renderPreparedSource: typeof renderPreparedSource;
  buildOpenAiEditCanvas: typeof buildOpenAiEditCanvas;
  composeAllOverTile: typeof composeAllOverTile;
  composeOnePointMotif: typeof composeOnePointMotif;
  buildAllOverRepairPrompt: typeof buildAllOverRepairPrompt;
  buildOnePointRepairPrompt: typeof buildOnePointRepairPrompt;
  requestOpenAiRepair: typeof requestOpenAiRepair;
  logGeneration: typeof logGeneration;
};

const defaultPreparePatternCompositeDeps: PreparePatternCompositeDeps = {
  getCorsHeaders,
  getOpenAiApiKey: () => Deno.env.get("OPENAI_API_KEY"),
  createAuthenticatedSupabaseClient,
  createAdminSupabaseClient,
  saveGenerationArtifact,
  maybeDownscaleImage,
  readImageRgba,
  assessPatternPreparation,
  renderPreparedSource,
  buildOpenAiEditCanvas,
  composeAllOverTile,
  composeOnePointMotif,
  buildAllOverRepairPrompt,
  buildOnePointRepairPrompt,
  requestOpenAiRepair,
  logGeneration,
};

export const createPreparePatternCompositeHandler = (
  overrides: Partial<PreparePatternCompositeDeps> = {},
) => {
  const deps = {
    ...defaultPreparePatternCompositeDeps,
    ...overrides,
  };

  return async (req: Request) => {
    const corsHeaders = deps.getCorsHeaders(req.headers.get("Origin"));
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

    const openaiApiKey = deps.getOpenAiApiKey();

    let supabase;
    let adminClient;
    try {
      supabase = deps.createAuthenticatedSupabaseClient(authHeader);
      adminClient = deps.createAdminSupabaseClient();
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
    let prepArtifactRecorder: PrepArtifactRecorder | null = null;

    const emitPrepLog = async (
      result: PatternPreparationResult | null,
      overrides: Record<string, unknown> = {},
    ) => {
      await deps.logGeneration(adminClient, {
        work_id: prepWorkId,
        workflow_id: workflowId,
        phase: "prep",
        parent_work_id: null,
        user_id: user.id,
        ai_model: PREP_AI_MODEL,
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

    const refundPrepCharge = async () => {
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

      return refunded;
    };

    try {
      const downscaledBytes = await deps.maybeDownscaleImage(
        decodeBase64Image(payload.sourceImageBase64),
      );
      const sourceImage = await deps.readImageRgba(downscaledBytes);
      const assessed = deps.assessPatternPreparation({
        placementMode: payload.placementMode,
        fabricMethod: payload.fabricMethod ?? null,
        metrics: computeMetrics(
          sourceImage.pixels,
          sourceImage.width,
          sourceImage.height,
        ),
      });

      prepArtifactRecorder = createPrepArtifactRecorder(
        {
          workflowId,
          prepWorkId,
          placementMode: payload.placementMode,
          sourceStatus: assessed.sourceStatus,
          fabricStatus: assessed.fabricStatus,
          reasonCodes: assessed.reasonCodes,
          repairPromptKind:
            payload.placementMode === "all-over"
              ? "all_over_tile"
              : "one_point_motif",
        },
        {
          saveGenerationArtifact: deps.saveGenerationArtifact,
          recordArtifactRow: createRecordArtifactRow(adminClient),
        },
      );

      const prepared = await deps.renderPreparedSource(
        sourceImage,
        payload.fabricMethod === "yarn-dyed",
      );
      if (!prepared) {
        throw new Error("prepared_source_missing");
      }
      let preparedSourceBytes = prepared.bytes;
      const preparedWidth = prepared.width;
      const preparedHeight = prepared.height;
      const artifactRecorder = prepArtifactRecorder;
      if (!artifactRecorder) {
        throw new Error("prep_artifact_recorder_missing");
      }

      await artifactRecorder.recordSourceOriginal(preparedSourceBytes);

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
        preparedWidth < MIN_REPAIR_EDGE_PX ||
        preparedHeight < MIN_REPAIR_EDGE_PX;
      const repairNeeded =
        (assessed.sourceStatus === "repair_required" ||
          assessed.fabricStatus === "repair_required") &&
        !sourceTooSmallForRepair;
      let preparedSourceArtifactId: string | null = null;

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

      if (repairNeeded && !openaiApiKey) {
        await emitPrepLog(result, {
          error_type: "openai_key_missing_for_repair",
          error_message: "OpenAI API key required for repair",
        });
        return jsonResponse(502, {
          error: "openai_key_missing_for_repair",
          remainingTokens: 0,
        });
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
            ? deps.buildAllOverRepairPrompt({
                fabricMethod: payload.fabricMethod,
                reasonCodes: assessed.reasonCodes,
              })
            : deps.buildOnePointRepairPrompt({
                fabricMethod: payload.fabricMethod,
                reasonCodes: assessed.reasonCodes,
              });

        try {
          const editCanvas =
            await deps.buildOpenAiEditCanvas(preparedSourceBytes);
          await artifactRecorder.recordOpenAiEditCanvas(editCanvas.bytes);

          console.info("prepare-pattern-composite: calling OpenAI edits", {
            placementMode: payload.placementMode,
            fabricMethod: payload.fabricMethod ?? null,
            sourceWidth: editCanvas.sourceWidth,
            sourceHeight: editCanvas.sourceHeight,
            canvasBytes: editCanvas.bytes.length,
            reasonCodes: assessed.reasonCodes,
          });

          const imageStartTime = Date.now();
          const repairedBase64 = await deps.requestOpenAiRepair({
            apiKey: openaiApiKey,
            prompt,
            sourceImageBytes: editCanvas.bytes,
          });
          imageLatencyMs = Date.now() - imageStartTime;
          preparedSourceBytes = decodeBase64Image(repairedBase64);
          const preparedSourceArtifact =
            await artifactRecorder.recordPreparedSource(repairedBase64);
          preparedSourceArtifactId =
            preparedSourceArtifact.status === "success"
              ? preparedSourceArtifact.artifactId
              : null;
          result = {
            ...result,
            preparedSourceKind: "repaired",
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
          await refundPrepCharge();

          await emitPrepLog(result, {
            error_type: "pattern_preparation_failed",
            error_message:
              error instanceof Error ? error.message : String(error),
          });
          return jsonResponse(502, {
            error: "pattern_preparation_failed",
            remainingTokens: remainingTokens ?? 0,
          });
        }
      }

      try {
        if (payload.placementMode === "all-over") {
          const composed = await deps.composeAllOverTile({
            spriteBytes: preparedSourceBytes,
            backgroundColor,
            scale,
          });
          await artifactRecorder.recordPreparedComposite(
            composed.tileBytes,
            preparedSourceArtifactId,
            result.preparedSourceKind,
          );

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
          const composed = await deps.composeOnePointMotif({
            spriteBytes: preparedSourceBytes,
            backgroundColor,
            scale,
          });
          await artifactRecorder.recordPreparedComposite(
            composed.motifBytes,
            preparedSourceArtifactId,
            result.preparedSourceKind,
          );

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
      } catch (error) {
        await refundPrepCharge();
        await emitPrepLog(result, {
          error_type: "pattern_preparation_failed",
          error_message: error instanceof Error ? error.message : String(error),
        });
        throw attachRemainingTokens(error, remainingTokens);
      }

      return jsonResponse(200, result as unknown as Record<string, unknown>);
    } catch (error) {
      console.error("prepare-pattern-composite failed:", error);
      const remainingTokensFromError =
        error instanceof Error && "remainingTokens" in error
          ? error.remainingTokens
          : undefined;
      return jsonResponse(500, {
        error: "pattern_preparation_failed",
        message: error instanceof Error ? error.message : String(error),
        ...(typeof remainingTokensFromError === "number"
          ? { remainingTokens: remainingTokensFromError }
          : {}),
      });
    }
  };
};

const handleRequest = createPreparePatternCompositeHandler();

if (import.meta.main) {
  Deno.serve(handleRequest);
}
