import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import {
  type GenerationRequestType,
  type ImageQuality,
  type UseDesignTokensResult,
  MAX_IMAGE_BASE64_LENGTH,
} from "@/functions/_shared/design-generation.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import {
  buildAllOverRepairPrompt,
  buildOnePointRepairPrompt,
} from "@/functions/_shared/prompt-builders.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from "@/functions/_shared/supabase-clients.ts";

type PreparePatternSourceOpenAiRequest = {
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  placementMode?: "all-over" | "one-point";
  fabricMethod?: string | null;
  scale?: "large" | "medium" | "small" | null;
  backgroundColor?: string;
  reasonCodes?: string[];
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

const PREP_REQUEST_TYPE = "prep" as const satisfies GenerationRequestType;
const PREP_QUALITY = "high" as const satisfies ImageQuality;
const PREP_AI_MODEL = "openai" as const;
const OPENAI_TIMEOUT_MS = 120_000;

const base64ToBlob = (base64: string, mimeType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
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
  sourceImageBase64: string;
  sourceImageMimeType: string;
}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  let response: Response;
  try {
    const formData = new FormData();
    formData.append(
      "image",
      base64ToBlob(params.sourceImageBase64, params.sourceImageMimeType),
      "pattern-source.png",
    );
    formData.append("prompt", params.prompt);
    formData.append("model", "gpt-image-1");
    formData.append("size", "1024x1024");
    formData.append("quality", PREP_QUALITY);

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
    console.error("OpenAI prep image API failed:", response.status, errorText);
    throw new Error("OpenAI prep image API failed");
  }

  const result = (await response.json()) as OpenAIImageResponse;
  const base64 = result.data?.[0]?.b64_json;

  if (!base64) {
    throw new Error("OpenAI prep image API returned empty content");
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
  if (!openaiApiKey) {
    return jsonResponse(500, { error: "missing_api_key" });
  }

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

  let payload: PreparePatternSourceOpenAiRequest;
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
  if ((payload.sourceImageBase64.length ?? 0) > MAX_IMAGE_BASE64_LENGTH) {
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
  if (payload.reasonCodes && !Array.isArray(payload.reasonCodes)) {
    return jsonResponse(400, { error: "reasonCodes must be an array" });
  }

  const workflowId = crypto.randomUUID();
  const prepWorkId = crypto.randomUUID();
  const phaseStartTime = Date.now();
  const reasonCodes = Array.isArray(payload.reasonCodes)
    ? payload.reasonCodes.filter(
        (code): code is string => typeof code === "string",
      )
    : [];
  const repairPromptKind =
    payload.placementMode === "all-over" ? "all_over_tile" : "one_point_motif";
  const prompt =
    payload.placementMode === "all-over"
      ? buildAllOverRepairPrompt({
          fabricMethod: payload.fabricMethod,
          reasonCodes,
        })
      : buildOnePointRepairPrompt({
          fabricMethod: payload.fabricMethod,
          reasonCodes,
        });
  let tokensCharged = 0;
  let tokensRefunded = 0;
  let remainingTokens: number | null = null;
  let imageLatencyMs: number | null = null;

  const emitPrepLog = async (overrides: Record<string, unknown> = {}) => {
    await logGeneration(adminClient, {
      work_id: prepWorkId,
      workflow_id: workflowId,
      phase: "prep",
      parent_work_id: null,
      user_id: user.id,
      ai_model: PREP_AI_MODEL,
      request_type: PREP_REQUEST_TYPE,
      quality: PREP_QUALITY,
      user_message: "패턴 보정 준비",
      prompt_length: prompt.length,
      has_ci_image: true,
      has_reference_image: false,
      has_previous_image: false,
      generate_image: true,
      image_prompt: prompt,
      image_generated: false,
      pattern_preparation_backend: "openai_repair",
      pattern_repair_prompt_kind: repairPromptKind,
      pattern_repair_applied: true,
      pattern_repair_reason_codes: reasonCodes,
      prep_tokens_charged: tokensCharged,
      tokens_charged: tokensCharged,
      tokens_refunded: tokensRefunded,
      image_latency_ms: imageLatencyMs,
      total_latency_ms: Date.now() - phaseStartTime,
      ...overrides,
    });
  };

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
    await emitPrepLog({
      error_type: "token_processing_failed",
      error_message: tokenError.message,
    });
    return jsonResponse(500, { error: "token_processing_failed" });
  }

  if (!tokenResult?.success) {
    await emitPrepLog({
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

  try {
    const imageStartTime = Date.now();
    const preparedBase64 = await requestOpenAiRepair({
      apiKey: openaiApiKey,
      prompt,
      sourceImageBase64: payload.sourceImageBase64,
      sourceImageMimeType: payload.sourceImageMimeType,
    });
    imageLatencyMs = Date.now() - imageStartTime;

    await emitPrepLog({
      image_generated: true,
    });

    return jsonResponse(200, {
      preparedSourceBase64: preparedBase64,
      preparedSourceMimeType: "image/png",
      preparedPatternTileBase64:
        payload.placementMode === "all-over" ? preparedBase64 : undefined,
      preparedPatternTileMimeType:
        payload.placementMode === "all-over" ? "image/png" : undefined,
      preparedPointMotifTileBase64:
        payload.placementMode === "one-point" ? preparedBase64 : undefined,
      preparedPointMotifTileMimeType:
        payload.placementMode === "one-point" ? "image/png" : undefined,
      repairSummary:
        payload.placementMode === "all-over"
          ? "반복 가능한 타일로 다시 정리했습니다."
          : "원포인트용 단일 모티프로 다시 정리했습니다.",
      repairPromptKind,
      prepWorkId,
      prepWorkflowId: workflowId,
      prepTokensCharged: tokensCharged,
      remainingTokens,
    });
  } catch (error) {
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

    await emitPrepLog({
      tokens_refunded: tokensRefunded,
      error_type: "pattern_preparation_failed",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(502, {
      error: "pattern_preparation_failed",
      remainingTokens: remainingTokens ?? 0,
    });
  }
});
