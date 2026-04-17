import "@supabase/functions-js/edge-runtime.d.ts";

import { filterValidConversationTurns } from "@/functions/_shared/conversation.ts";
import { determineEligibility } from "@/functions/_shared/design-generation.ts";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import { callFalFluxImg2Img } from "@/functions/_shared/fal-client.ts";
import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import { createLogger } from "@/functions/_shared/logger.ts";
import {
  buildFalPatternPrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "@/functions/_shared/prompt-builders.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  buildSessionMessages,
  saveDesignSession,
  type SessionMessage,
} from "@/functions/_shared/session-save.ts";
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from "@/functions/_shared/supabase-clients.ts";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";

type OpenAITextResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const MAX_MESSAGE_LENGTH = 4000;
const MAX_IMAGE_BASE64_LENGTH = 20 * 1024 * 1024;

const bytesToBase64 = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));

const { processLogger, errorLogger } = createLogger("generate-fal-api");

const ANALYSIS_REQUEST_TYPE = "analysis" as const;
const RENDER_REQUEST_TYPE = "render_standard" as const;
const ANALYSIS_AI_MODEL = "openai" as const;
const RENDER_AI_MODEL = "fal" as const;

const SERVER_VAR = "FALAI_CI_PATTERN_ENABLED";
const CLIENT_VAR = "VITE_FALAI_CI_PATTERN_ENABLED";
const IS_FAL_PIPELINE_ENABLED = Deno.env.get(SERVER_VAR) === "true";

async function tryRefund(
  client: ReturnType<typeof createAdminSupabaseClient>,
  params: {
    userId: string;
    amount: number;
    aiModel: string;
    requestType: string;
    workId: string;
  },
): Promise<number> {
  if (params.amount <= 0) return 0;
  const { error } = await client.rpc("refund_design_tokens", {
    p_user_id: params.userId,
    p_amount: params.amount,
    p_ai_model: params.aiModel,
    p_request_type: params.requestType,
    p_work_id: params.workId,
  });
  return error ? 0 : params.amount;
}

const saveSessionIfNeeded = async (
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  payload: GenerateDesignRequest,
  aiMessage: string,
  imageUrl: string | null,
  imageFileId: string | null,
) => {
  if (!payload.sessionId || !Array.isArray(payload.allMessages)) {
    return;
  }

  await saveDesignSession(supabase, {
    sessionId: payload.sessionId,
    aiModel: "openai",
    firstMessage: payload.firstMessage ?? "",
    lastImageUrl: imageUrl,
    lastImageFileId: imageFileId,
    messages: buildSessionMessages(payload.allMessages, {
      id: crypto.randomUUID(),
      role: "ai",
      content: aiMessage,
      image_url: imageUrl,
      image_file_id: imageFileId,
      sequence_number: payload.allMessages.length,
    } satisfies SessionMessage),
  });
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (
    req.method === "GET" &&
    url.pathname.endsWith("/should-use-fal-pipeline")
  ) {
    return jsonResponse(200, {
      enabled: IS_FAL_PIPELINE_ENABLED,
      serverVar: SERVER_VAR,
      clientVar: CLIENT_VAR,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!IS_FAL_PIPELINE_ENABLED) {
    return jsonResponse(503, { error: "fal_pipeline_disabled" });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  const falApiKey = Deno.env.get("FAL_KEY");
  if (!openaiApiKey || !falApiKey) {
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

  let payload: GenerateDesignRequest;
  try {
    payload = (await req.json()) as GenerateDesignRequest;
  } catch {
    return jsonResponse(400, { error: "invalid_json" });
  }

  if (
    typeof payload.userMessage !== "string" ||
    !payload.userMessage.trim() ||
    payload.userMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return jsonResponse(400, { error: "invalid_user_message" });
  }

  if (payload.designContext?.ciPlacement !== "all-over") {
    return jsonResponse(400, {
      error: "ci_placement_must_be_all_over",
    });
  }

  if (!payload.designContext?.fabricMethod) {
    return jsonResponse(400, { error: "fabric_method_required" });
  }

  if (!payload.tiledBase64 || !payload.tiledMimeType) {
    return jsonResponse(400, { error: "tiled_image_required" });
  }

  if (payload.tiledBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse(400, { error: "tiled_image_too_large" });
  }

  const workId = crypto.randomUUID();
  const analysisWorkId = `${workId}_analysis`;
  const renderWorkId = `${workId}_render`;
  const textPrompt = buildTextPrompt(payload);
  const history = filterValidConversationTurns(payload.conversationHistory);
  const textStart = Date.now();
  let analysisTokensCharged = 0;
  let analysisTokensRefunded = 0;

  const { data: analysisTokenResult, error: analysisTokenError } =
    await adminClient.rpc("use_design_tokens", {
      p_user_id: user.id,
      p_ai_model: ANALYSIS_AI_MODEL,
      p_request_type: ANALYSIS_REQUEST_TYPE,
      p_work_id: analysisWorkId,
    });

  if (analysisTokenError) {
    await logGeneration(adminClient, {
      work_id: analysisWorkId,
      workflow_id: workId,
      phase: "analysis",
      user_id: user.id,
      ai_model: ANALYSIS_AI_MODEL,
      request_type: ANALYSIS_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_generated: false,
      error_type: "token_processing_failed",
      error_message: analysisTokenError.message,
    });
    return jsonResponse(500, { error: "token_processing_failed" });
  }

  if (!analysisTokenResult?.success) {
    await logGeneration(adminClient, {
      work_id: analysisWorkId,
      workflow_id: workId,
      phase: "analysis",
      user_id: user.id,
      ai_model: ANALYSIS_AI_MODEL,
      request_type: ANALYSIS_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_generated: false,
      error_type: analysisTokenResult?.error ?? "insufficient_tokens",
      error_message:
        analysisTokenResult?.error ?? "Token deduction was rejected",
    });
    return jsonResponse(403, {
      error: "insufficient_tokens",
      balance: analysisTokenResult?.balance ?? 0,
      cost: analysisTokenResult?.cost ?? 0,
    });
  }

  analysisTokensCharged = analysisTokenResult.cost ?? 0;

  let analysisJson: ReturnType<typeof parseJsonBlock>;
  try {
    const textResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...history.map((turn) => ({
            role: turn.role === "user" ? "user" : "assistant",
            content: turn.content,
          })),
          { role: "user", content: textPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!textResp.ok) {
      const errorText = await textResp.text();
      throw new Error(`OpenAI text failed: ${textResp.status} ${errorText}`);
    }

    const textData = (await textResp.json()) as OpenAITextResponse;
    const content = textData.choices?.[0]?.message?.content ?? "";
    analysisJson = parseJsonBlock(content);
  } catch (error) {
    analysisTokensRefunded = await tryRefund(adminClient, {
      userId: user.id,
      amount: analysisTokensCharged,
      aiModel: ANALYSIS_AI_MODEL,
      requestType: ANALYSIS_REQUEST_TYPE,
      workId: `${analysisWorkId}_analysis_failed_refund`,
    });

    await logGeneration(adminClient, {
      work_id: analysisWorkId,
      workflow_id: workId,
      phase: "analysis",
      user_id: user.id,
      ai_model: ANALYSIS_AI_MODEL,
      request_type: ANALYSIS_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_generated: false,
      tokens_charged: analysisTokensCharged,
      tokens_refunded: analysisTokensRefunded,
      error_type: "text_analysis_failed",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(500, { error: "text_analysis_failed" });
  }

  const textLatencyMs = Date.now() - textStart;
  const aiMessage =
    typeof analysisJson.aiMessage === "string" ? analysisJson.aiMessage : "";
  const generateImage = analysisJson.generateImage === true;
  const contextChips = Array.isArray(analysisJson.contextChips)
    ? analysisJson.contextChips
    : [];
  const eligibility = determineEligibility(
    payload,
    {
      colors: payload.designContext?.colors ?? [],
      pattern: payload.designContext?.pattern ?? null,
      fabricMethod: payload.designContext?.fabricMethod ?? null,
      ciPlacement: payload.designContext?.ciPlacement ?? null,
      scale: payload.designContext?.scale ?? null,
    },
    generateImage,
  );

  await logGeneration(adminClient, {
    work_id: analysisWorkId,
    workflow_id: workId,
    phase: "analysis",
    user_id: user.id,
    ai_model: ANALYSIS_AI_MODEL,
    request_type: ANALYSIS_REQUEST_TYPE,
    user_message: payload.userMessage,
    prompt_length: payload.userMessage.length,
    text_prompt: textPrompt,
    ai_message: aiMessage,
    generate_image: generateImage,
    eligible_for_render: eligibility.eligibleForRender,
    image_generated: false,
    text_latency_ms: textLatencyMs,
    tokens_charged: analysisTokensCharged,
    tokens_refunded: analysisTokensRefunded,
  });

  if (!generateImage) {
    try {
      await saveSessionIfNeeded(supabase, payload, aiMessage, null, null);
    } catch (reason) {
      console.error("Post-generation task failed", {
        workId: analysisWorkId,
        task: "saveSessionIfNeeded",
        reason,
      });
    }

    return jsonResponse(200, {
      aiMessage,
      imageUrl: null,
      workId,
      analysisWorkId,
      generateImage: false,
      eligibleForRender: eligibility.eligibleForRender,
      missingRequirements: eligibility.missingRequirements,
      contextChips,
    });
  }

  const imagePrompt = buildFalPatternPrompt({
    colors: payload.designContext?.colors ?? [],
    pattern: payload.designContext?.pattern ?? null,
    fabricMethod: payload.designContext?.fabricMethod ?? null,
    ciPlacement: payload.designContext?.ciPlacement ?? null,
    scale: payload.designContext?.scale ?? null,
  });

  const imageStart = Date.now();
  let falImageUrl: string;
  let renderTokensCharged = 0;
  let renderTokensRefunded = 0;

  const { data: renderTokenResult, error: renderTokenError } =
    await adminClient.rpc("use_design_tokens", {
      p_user_id: user.id,
      p_ai_model: RENDER_AI_MODEL,
      p_request_type: RENDER_REQUEST_TYPE,
      p_work_id: renderWorkId,
    });

  if (renderTokenError) {
    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      error_type: "token_processing_failed",
      error_message: renderTokenError.message,
    });
    return jsonResponse(500, { error: "token_processing_failed" });
  }

  if (!renderTokenResult?.success) {
    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      error_type: renderTokenResult?.error ?? "insufficient_tokens",
      error_message: renderTokenResult?.error ?? "Token deduction was rejected",
    });
    return jsonResponse(403, {
      error: "insufficient_tokens",
      balance: renderTokenResult?.balance ?? 0,
      cost: renderTokenResult?.cost ?? 0,
    });
  }

  renderTokensCharged = renderTokenResult.cost ?? 0;

  try {
    const falResult = await callFalFluxImg2Img({
      imageBase64: payload.tiledBase64,
      imageMimeType: payload.tiledMimeType,
      prompt: imagePrompt,
      strength: 0.3,
      apiKey: falApiKey,
    });
    falImageUrl = falResult.imageUrl;
  } catch (error) {
    renderTokensRefunded = await tryRefund(adminClient, {
      userId: user.id,
      amount: renderTokensCharged,
      aiModel: RENDER_AI_MODEL,
      requestType: RENDER_REQUEST_TYPE,
      workId: `${renderWorkId}_render_failed_refund`,
    });

    errorLogger("fal_render_failed", error, {
      workId,
      renderWorkId,
    });
    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      tokens_charged: renderTokensCharged,
      tokens_refunded: renderTokensRefunded,
      error_type: "fal_render_failed",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(500, { error: "fal_render_failed" });
  }

  const imageLatencyMs = Date.now() - imageStart;
  let finalImageUrl = falImageUrl;
  let finalImageFileId: string | null = null;
  let errorCode: "fal_image_fetch_failed" | "image_upload_failed" | null = null;

  try {
    let imageBytes: Uint8Array;
    let imageMimeType: string;

    try {
      processLogger("fal_image_fetch_start", { workId, renderWorkId });
      const falImageResp = await fetch(falImageUrl);
      if (!falImageResp.ok) {
        throw new Error(`Fal image fetch failed: ${falImageResp.status}`);
      }

      imageBytes = new Uint8Array(await falImageResp.arrayBuffer());
      imageMimeType =
        falImageResp.headers.get("content-type") ?? payload.tiledMimeType;
    } catch (error) {
      errorCode = "fal_image_fetch_failed";
      throw error;
    }

    let uploaded;
    try {
      processLogger("image_upload_start", { workId, renderWorkId });
      uploaded = await uploadImageToImageKit(
        `data:${imageMimeType};base64,${bytesToBase64(imageBytes)}`,
        `design-${workId}.png`,
        "/design-sessions",
      );
    } catch (error) {
      errorCode = "image_upload_failed";
      throw error;
    }

    finalImageUrl = uploaded?.url ?? falImageUrl;
    finalImageFileId = uploaded?.fileId ?? null;
  } catch (error) {
    renderTokensRefunded = await tryRefund(adminClient, {
      userId: user.id,
      amount: renderTokensCharged,
      aiModel: RENDER_AI_MODEL,
      requestType: RENDER_REQUEST_TYPE,
      workId: `${renderWorkId}_render_failed_refund`,
    });

    const resolvedErrorCode = errorCode ?? "fal_image_fetch_failed";
    errorLogger(resolvedErrorCode, error, {
      workId,
      renderWorkId,
      falImageUrl,
    });
    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      image_latency_ms: imageLatencyMs,
      total_latency_ms: textLatencyMs + imageLatencyMs,
      tokens_charged: renderTokensCharged,
      tokens_refunded: renderTokensRefunded,
      error_type: resolvedErrorCode,
      error_message: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(500, { error: resolvedErrorCode });
  }

  await logGeneration(adminClient, {
    work_id: renderWorkId,
    workflow_id: workId,
    phase: "render",
    parent_work_id: analysisWorkId,
    user_id: user.id,
    ai_model: RENDER_AI_MODEL,
    request_type: RENDER_REQUEST_TYPE,
    user_message: payload.userMessage,
    prompt_length: payload.userMessage.length,
    text_prompt: textPrompt,
    image_prompt: imagePrompt,
    ai_message: aiMessage,
    generate_image: true,
    eligible_for_render: eligibility.eligibleForRender,
    image_generated: true,
    generated_image_url: finalImageUrl,
    text_latency_ms: textLatencyMs,
    image_latency_ms: imageLatencyMs,
    total_latency_ms: textLatencyMs + imageLatencyMs,
    tokens_charged: renderTokensCharged,
    tokens_refunded: renderTokensRefunded,
  });

  try {
    await saveSessionIfNeeded(
      supabase,
      payload,
      aiMessage,
      finalImageUrl,
      finalImageFileId,
    );
  } catch (reason) {
    console.error("Post-generation task failed", {
      workId: renderWorkId,
      task: "saveSessionIfNeeded",
      reason,
    });
  }

  return jsonResponse(200, {
    aiMessage,
    imageUrl: finalImageUrl,
    workId,
    workflowId: workId,
    generateImage: true,
    eligibleForRender: eligibility.eligibleForRender,
    missingRequirements: eligibility.missingRequirements,
    contextChips,
  });
});
