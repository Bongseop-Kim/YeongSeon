import "@supabase/functions-js/edge-runtime.d.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from "@/functions/_shared/supabase-clients.ts";
import {
  type ConversationTurn,
  filterValidConversationTurns,
} from "@/functions/_shared/conversation.ts";
import {
  type AiGenerationLogInsert,
  logGeneration,
} from "@/functions/_shared/log-generation.ts";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import {
  buildImageEditPrompt,
  buildImagePrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "@/functions/_shared/prompt-builders.ts";
import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import {
  buildSessionMessages,
  saveDesignSession,
  type SessionMessage,
} from "@/functions/_shared/session-save.ts";
import { sanitizeLogRequestAttachments } from "@/functions/_shared/request-attachments.ts";
import {
  isContextChip,
  type GenerateDesignResult,
  type GenerationRequestType,
  type ImageQuality,
  type UseDesignTokensResult,
  type TextAnalysisResult,
  type AnalysisResult,
  type AnalysisSnapshot,
  type RenderResult,
  type LogContext,
  HttpError,
  MAX_HISTORY_TURNS,
  MAX_MESSAGE_LENGTH,
  MAX_IMAGE_BASE64_LENGTH,
  ANALYSIS_REQUEST_TYPE,
  ANALYSIS_QUALITY,
  toRecord,
  normalizeDetectedDesign,
  mergeDetectedDesign,
  getExecutionMode,
  determineEligibility,
  getImageQuality,
  loadAnalysisSnapshot,
} from "@/functions/_shared/design-generation.ts";

export type { GenerateDesignRequest };

type GeminiTextResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type GeminiImageResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { data?: string; mimeType?: string };
      }>;
    };
  }>;
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
    p_ai_model: "gemini",
    p_request_type: params.requestType,
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
    p_ai_model: "gemini",
    p_request_type: params.requestType,
    p_work_id: params.workId,
  });

  if (error) {
    console.error("Token refund failed:", error);
    return false;
  }

  return true;
};

const emitGenerationLog = async (
  adminClient: SupabaseClient,
  context: LogContext,
) => {
  const payload: AiGenerationLogInsert = {
    work_id: context.workId,
    workflow_id: context.workflowId,
    phase: context.phase,
    parent_work_id: context.parentWorkId ?? null,
    user_id: context.userId,
    ai_model: "gemini",
    request_type: context.requestType,
    quality: context.quality,
    user_message: context.userMessage,
    prompt_length: context.promptLength,
    request_attachments: context.requestAttachments ?? null,
    design_context: context.designContext,
    normalized_design: context.normalizedDesign ?? null,
    conversation_turn: context.conversationTurn,
    has_ci_image: context.hasCiImage,
    has_reference_image: context.hasReferenceImage,
    has_previous_image: context.hasPreviousImage,
    generate_image: context.generateImage ?? null,
    eligible_for_render: context.eligibleForRender ?? null,
    missing_requirements: context.missingRequirements ?? null,
    eligibility_reason: context.eligibilityReason ?? null,
    detected_design: context.detectedDesign ?? null,
    text_prompt: context.textPrompt ?? null,
    image_prompt: context.imagePrompt ?? null,
    image_edit_prompt: context.imageEditPrompt ?? null,
    ai_message: context.aiMessage ?? null,
    image_generated: context.imageGenerated ?? false,
    generated_image_url: context.generatedImageUrl ?? null,
    tokens_charged: context.tokensCharged ?? 0,
    tokens_refunded: context.tokensRefunded ?? 0,
    text_latency_ms: context.textLatencyMs ?? null,
    image_latency_ms: context.imageLatencyMs ?? null,
    total_latency_ms: context.totalLatencyMs ?? null,
    error_type: context.errorType ?? null,
    error_message: context.errorMessage ?? null,
  };

  await logGeneration(adminClient, payload);
};

const requestGeminiText = async (
  payload: GenerateDesignRequest,
  apiKey: string,
  conversationTurns: ConversationTurn[],
  textPrompt: string,
): Promise<TextAnalysisResult> => {
  const historyContents: Array<Record<string, unknown>> = conversationTurns.map(
    (turn) => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    }),
  );

  const currentParts: Array<Record<string, unknown>> = [{ text: textPrompt }];
  if (payload.ciImageBase64) {
    currentParts.push({
      inlineData: {
        mimeType: payload.ciImageMimeType || "image/png",
        data: payload.ciImageBase64,
      },
    });
  }
  if (payload.referenceImageBase64) {
    currentParts.push({
      inlineData: {
        mimeType: payload.referenceImageMimeType || "image/png",
        data: payload.referenceImageBase64,
      },
    });
  }

  const contents = [...historyContents, { role: "user", parts: currentParts }];

  const textController = new AbortController();
  const textTimeoutId = setTimeout(() => textController.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: textController.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      },
    );
  } finally {
    clearTimeout(textTimeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini text API failed: ${response.status}`, errorText);
    throw new Error("Gemini text API failed");
  }

  const result = (await response.json()) as GeminiTextResponse;
  const text = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini text API returned empty content");
  }

  const parsed = parseJsonBlock(text);

  return {
    aiMessage:
      typeof parsed.aiMessage === "string"
        ? parsed.aiMessage
        : "디자인 방향을 반영한 넥타이 시안을 준비했습니다.",
    generateImage:
      typeof parsed.generateImage === "boolean" ? parsed.generateImage : true,
    contextChips: Array.isArray(parsed.contextChips)
      ? parsed.contextChips.filter(isContextChip)
      : [],
    detectedDesign: normalizeDetectedDesign(parsed.detectedDesign),
  };
};

const requestGeminiImage = async (
  payload: GenerateDesignRequest,
  apiKey: string,
  prompts: {
    imagePrompt: string;
    imageEditPrompt: string;
  },
): Promise<string | null> => {
  try {
    const currentParts: Array<Record<string, unknown>> = [];
    if (payload.referenceImageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: payload.referenceImageMimeType || "image/png",
          data: payload.referenceImageBase64,
        },
      });
    }

    if (payload.ciImageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: payload.ciImageMimeType || "image/png",
          data: payload.ciImageBase64,
        },
      });
    }

    const contents = payload.previousImageBase64
      ? [
          {
            role: "user",
            parts: [{ text: prompts.imagePrompt }],
          },
          {
            role: "model",
            parts: [
              {
                inlineData: {
                  mimeType: payload.previousImageMimeType || "image/png",
                  data: payload.previousImageBase64,
                },
              },
            ],
          },
          {
            role: "user",
            parts: [{ text: prompts.imageEditPrompt }, ...currentParts],
          },
        ]
      : [
          {
            role: "user",
            parts: [{ text: prompts.imagePrompt }, ...currentParts],
          },
        ];

    const imageController = new AbortController();
    const imageTimeoutId = setTimeout(() => imageController.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: imageController.signal,
          body: JSON.stringify({
            contents,
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: { aspectRatio: "9:16" },
            },
          }),
        },
      );
    } finally {
      clearTimeout(imageTimeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini image API failed: ${response.status}`, errorText);
      throw new Error("Gemini image API failed");
    }

    const result = (await response.json()) as GeminiImageResponse;
    const imagePart = result.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.data,
    );
    const base64 = imagePart?.inlineData?.data;

    if (!base64) {
      console.error(
        "Gemini image API: no inlineData in response",
        JSON.stringify(result),
      );
      return null;
    }

    return `data:${
      imagePart?.inlineData?.mimeType ?? "image/png"
    };base64,${base64}`;
  } catch (error) {
    console.error("Gemini image generation failed:", error);
    return null;
  }
};

const saveSessionIfNeeded = async (
  supabase: SupabaseClient,
  payload: GenerateDesignRequest,
  aiMessage: string,
  imagekitUrl: string | null,
  imagekitFileId: string | null,
  imageWorkId: string | null,
) => {
  if (!payload.sessionId || !Array.isArray(payload.allMessages)) {
    return;
  }

  await saveDesignSession(supabase, {
    sessionId: payload.sessionId,
    aiModel: "gemini",
    firstMessage: payload.firstMessage ?? "",
    lastImageUrl: imagekitUrl,
    lastImageFileId: imagekitFileId,
    lastImageWorkId: imageWorkId,
    messages: buildSessionMessages(payload.allMessages, {
      id: crypto.randomUUID(),
      role: "ai",
      content: aiMessage,
      image_url: imagekitUrl,
      image_file_id: imagekitFileId,
      attachments: null,
      sequence_number: payload.allMessages.length,
    } satisfies SessionMessage),
  });
};

const runGeminiAnalysis = async (params: {
  adminClient: SupabaseClient;
  userId: string;
  payload: GenerateDesignRequest;
  conversationTurns: ConversationTurn[];
  conversationTurn: number;
  geminiApiKey: string;
}) => {
  const {
    adminClient,
    userId,
    payload,
    conversationTurns,
    conversationTurn,
    geminiApiKey,
  } = params;

  const workflowId = crypto.randomUUID();
  const analysisWorkId = crypto.randomUUID();
  const phaseStartTime = Date.now();
  let tokensCharged = 0;
  let tokensRefunded = 0;
  let remainingTokens: number | null = null;
  let textLatencyMs: number | null = null;
  const textPrompt = buildTextPrompt(payload);

  const emitAnalysisLog = async (overrides: Partial<LogContext> = {}) => {
    await emitGenerationLog(adminClient, {
      workId: analysisWorkId,
      workflowId,
      phase: "analysis",
      parentWorkId: null,
      requestType: ANALYSIS_REQUEST_TYPE,
      quality: ANALYSIS_QUALITY,
      userId,
      userMessage: payload.userMessage,
      promptLength: payload.userMessage.length,
      requestAttachments: sanitizeLogRequestAttachments(payload.attachments),
      conversationTurn,
      designContext: toRecord(payload.designContext) ?? null,
      hasCiImage: Boolean(payload.ciImageBase64),
      hasReferenceImage: Boolean(payload.referenceImageBase64),
      hasPreviousImage: Boolean(payload.previousImageBase64),
      imageGenerated: false,
      tokensCharged,
      tokensRefunded,
      textLatencyMs,
      imageLatencyMs: null,
      totalLatencyMs: Date.now() - phaseStartTime,
      textPrompt,
      ...overrides,
    });
  };

  const { data: tokenResult, error: tokenError } = await chargeTokens(
    adminClient,
    {
      userId,
      requestType: ANALYSIS_REQUEST_TYPE,
      quality: ANALYSIS_QUALITY,
      workId: analysisWorkId,
    },
  );

  if (tokenError) {
    await emitAnalysisLog({
      errorType: "token_processing_failed",
      errorMessage: tokenError.message,
    });
    throw new HttpError(500, { error: "Token processing failed" });
  }

  if (!tokenResult?.success) {
    await emitAnalysisLog({
      errorType: tokenResult?.error ?? "insufficient_tokens",
      errorMessage: tokenResult?.error ?? "Token deduction was rejected",
    });
    throw new HttpError(403, {
      error: "insufficient_tokens",
      balance: tokenResult?.balance ?? 0,
      cost: tokenResult?.cost ?? 0,
    });
  }

  tokensCharged = tokenResult.cost;
  remainingTokens = tokenResult.balance;

  try {
    const textStartTime = Date.now();
    const textResult = await requestGeminiText(
      payload,
      geminiApiKey,
      conversationTurns,
      textPrompt,
    );
    textLatencyMs = Date.now() - textStartTime;

    const normalizedDesign = mergeDetectedDesign(
      payload,
      textResult.detectedDesign,
    );
    const renderPayload: GenerateDesignRequest = {
      ...payload,
      designContext: normalizedDesign,
    };
    const imagePrompt = buildImagePrompt(renderPayload);
    const imageEditPrompt = buildImageEditPrompt(renderPayload);
    const eligibility = determineEligibility(
      payload,
      normalizedDesign,
      textResult.generateImage,
    );

    const analysis: AnalysisResult = {
      workflowId,
      analysisWorkId,
      userMessage: payload.userMessage,
      aiMessage: textResult.aiMessage,
      contextChips: textResult.contextChips,
      generateImage: textResult.generateImage,
      eligibleForRender: eligibility.eligibleForRender,
      missingRequirements: eligibility.missingRequirements,
      eligibilityReason: eligibility.eligibilityReason,
      conversationTurn,
      designContext: toRecord(payload.designContext) ?? null,
      normalizedDesign,
      detectedDesign: textResult.detectedDesign
        ? {
            pattern: textResult.detectedDesign.pattern,
            colors: textResult.detectedDesign.colors,
            ciPlacement: textResult.detectedDesign.ciPlacement,
            scale: textResult.detectedDesign.scale,
            positionIntent: textResult.detectedDesign.positionIntent,
          }
        : null,
      textPrompt,
      imagePrompt,
      imageEditPrompt,
      renderPayload,
      hasCiImage: Boolean(payload.ciImageBase64),
      hasReferenceImage: Boolean(payload.referenceImageBase64),
      hasPreviousImage: Boolean(payload.previousImageBase64),
      tokensCharged,
      tokensRefunded,
      textLatencyMs,
      remainingTokens,
    };

    await emitAnalysisLog({
      normalizedDesign: normalizedDesign as unknown as Record<string, unknown>,
      detectedDesign: analysis.detectedDesign,
      aiMessage: analysis.aiMessage,
      generateImage: analysis.generateImage,
      eligibleForRender: analysis.eligibleForRender,
      missingRequirements: analysis.missingRequirements,
      eligibilityReason: analysis.eligibilityReason,
      imagePrompt,
      imageEditPrompt,
    });

    return analysis;
  } catch (error) {
    const refunded = await refundTokens(adminClient, {
      userId,
      amount: tokensCharged,
      requestType: ANALYSIS_REQUEST_TYPE,
      workId: `${analysisWorkId}_analysis_failed_refund`,
    });

    if (refunded) {
      tokensRefunded += tokensCharged;
      if (remainingTokens !== null) {
        remainingTokens += tokensCharged;
      }
    }

    await emitAnalysisLog({
      errorType: "analysis_failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      tokensRefunded,
    });

    throw error;
  }
};

const runGeminiRenderFromAnalysis = async (params: {
  adminClient: SupabaseClient;
  userId: string;
  payload: GenerateDesignRequest;
  analysis: AnalysisSnapshot | AnalysisResult;
  geminiApiKey: string;
}) => {
  const { adminClient, userId, payload, analysis, geminiApiKey } = params;

  const renderWorkId = crypto.randomUUID();
  const phaseStartTime = Date.now();
  const renderPayload: GenerateDesignRequest = {
    ...payload,
    userMessage: analysis.userMessage,
    designContext: analysis.normalizedDesign,
  };
  const imagePrompt = analysis.imagePrompt ?? buildImagePrompt(renderPayload);
  const imageEditPrompt =
    analysis.imageEditPrompt ?? buildImageEditPrompt(renderPayload);
  const missingRenderAssets: string[] = [];

  if (analysis.hasPreviousImage && !payload.previousImageBase64) {
    missingRenderAssets.push("previousImage");
  }
  if (analysis.hasCiImage && !payload.ciImageBase64) {
    missingRenderAssets.push("ciImage");
  }
  if (analysis.hasReferenceImage && !payload.referenceImageBase64) {
    missingRenderAssets.push("referenceImage");
  }

  const quality = getImageQuality(renderPayload);
  const requestType: GenerationRequestType =
    quality === "high" ? "render_high" : "render_standard";
  let tokensCharged = 0;
  let tokensRefunded = 0;
  let remainingTokens: number | null = null;
  let imageLatencyMs: number | null = null;

  const emitRenderLog = async (overrides: Partial<LogContext> = {}) => {
    await emitGenerationLog(adminClient, {
      workId: renderWorkId,
      workflowId: analysis.workflowId,
      phase: "render",
      parentWorkId: analysis.analysisWorkId,
      requestType,
      quality,
      userId,
      userMessage: analysis.userMessage,
      promptLength: analysis.userMessage.length,
      requestAttachments: sanitizeLogRequestAttachments(
        renderPayload.attachments,
      ),
      conversationTurn: analysis.conversationTurn,
      designContext: analysis.designContext,
      normalizedDesign: analysis.normalizedDesign as unknown as Record<
        string,
        unknown
      >,
      hasCiImage: Boolean(renderPayload.ciImageBase64),
      hasReferenceImage: Boolean(renderPayload.referenceImageBase64),
      hasPreviousImage: Boolean(renderPayload.previousImageBase64),
      detectedDesign: analysis.detectedDesign,
      aiMessage: analysis.aiMessage,
      generateImage: analysis.generateImage,
      eligibleForRender: analysis.eligibleForRender,
      missingRequirements: analysis.missingRequirements,
      eligibilityReason: analysis.eligibilityReason,
      textPrompt: analysis.textPrompt,
      imagePrompt,
      imageEditPrompt,
      imageGenerated: false,
      tokensCharged,
      tokensRefunded,
      textLatencyMs: null,
      imageLatencyMs,
      totalLatencyMs: Date.now() - phaseStartTime,
      ...overrides,
    });
  };

  if (!analysis.generateImage || !analysis.eligibleForRender) {
    await emitRenderLog({
      errorType: "analysis_not_renderable",
      errorMessage: "Stored analysis snapshot is not eligible for render",
    });
    throw new HttpError(409, {
      error: "analysis_not_renderable",
      generateImage: analysis.generateImage,
      eligibleForRender: analysis.eligibleForRender,
      missingRequirements: analysis.missingRequirements,
    });
  }

  if (missingRenderAssets.length > 0) {
    await emitRenderLog({
      errorType: "missing_render_assets",
      errorMessage: `Missing render assets: ${missingRenderAssets.join(", ")}`,
    });
    throw new HttpError(400, {
      error: "missing_render_assets",
      missingAssets: missingRenderAssets,
    });
  }

  const { data: tokenResult, error: tokenError } = await chargeTokens(
    adminClient,
    {
      userId,
      requestType,
      quality,
      workId: renderWorkId,
    },
  );

  if (tokenError) {
    await emitRenderLog({
      errorType: "token_processing_failed",
      errorMessage: tokenError.message,
    });
    throw new HttpError(500, { error: "Token processing failed" });
  }

  if (!tokenResult?.success) {
    await emitRenderLog({
      errorType: tokenResult?.error ?? "insufficient_tokens",
      errorMessage: tokenResult?.error ?? "Token deduction was rejected",
    });
    throw new HttpError(403, {
      error: "insufficient_tokens",
      balance: tokenResult?.balance ?? 0,
      cost: tokenResult?.cost ?? 0,
    });
  }

  tokensCharged = tokenResult.cost;
  remainingTokens = tokenResult.balance;

  const imageStartTime = Date.now();
  const rawImageUrl = await requestGeminiImage(renderPayload, geminiApiKey, {
    imagePrompt,
    imageEditPrompt,
  });
  imageLatencyMs = Date.now() - imageStartTime;

  if (rawImageUrl === null) {
    const refunded = await refundTokens(adminClient, {
      userId,
      amount: tokensCharged,
      requestType,
      workId: `${renderWorkId}_render_failed_refund`,
    });

    if (refunded) {
      tokensRefunded += tokensCharged;
      if (remainingTokens !== null) {
        remainingTokens += tokensCharged;
      }
    }

    await emitRenderLog({
      tokensRefunded,
      errorType: "image_generation_failed",
      errorMessage: "Gemini image API failed",
    });

    throw new HttpError(502, {
      error: "image_generation_failed",
      remainingTokens: remainingTokens ?? 0,
    });
  }

  let imagekitUrl: string | null = null;
  let imagekitFileId: string | null = null;
  let responseImageUrl: string | null = rawImageUrl;

  const uploaded = await uploadImageToImageKit(
    rawImageUrl,
    `design-${renderWorkId}.png`,
    "/design-sessions",
  );

  if (!uploaded?.url || !uploaded.fileId) {
    console.error("ImageKit upload failed for generated image", {
      workId: renderWorkId,
      uploadResult: uploaded,
      imageUrlPreview: rawImageUrl.slice(0, 64),
    });
  } else {
    imagekitUrl = uploaded.url;
    imagekitFileId = uploaded.fileId;
    responseImageUrl = uploaded.url;
  }

  await emitRenderLog({
    imageGenerated: true,
    generatedImageUrl: imagekitUrl,
    imageLatencyMs,
  });

  return {
    renderWorkId,
    imageUrl: responseImageUrl,
    imagekitUrl,
    imagekitFileId,
    remainingTokens,
    quality,
    requestType,
    tokensCharged,
    tokensRefunded,
    imageLatencyMs,
    errorType: null,
    errorMessage: null,
  } satisfies RenderResult;
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
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  const executionMode = getExecutionMode(payload);
  const sanitizedAttachments = sanitizeLogRequestAttachments(
    payload.attachments,
  );

  if (
    executionMode !== "render_from_analysis" &&
    (typeof payload?.userMessage !== "string" || !payload.userMessage.trim())
  ) {
    return jsonResponse(400, { error: "userMessage is required" });
  }

  const rawConversationHistory = payload.conversationHistory;
  const optionalStringFields = [
    ["ciImageBase64", payload.ciImageBase64],
    ["ciImageMimeType", payload.ciImageMimeType],
    ["referenceImageBase64", payload.referenceImageBase64],
    ["referenceImageMimeType", payload.referenceImageMimeType],
    ["previousImageBase64", payload.previousImageBase64],
    ["previousImageMimeType", payload.previousImageMimeType],
    ["analysisWorkId", payload.analysisWorkId],
  ] as const;

  if (
    rawConversationHistory !== undefined &&
    !Array.isArray(rawConversationHistory)
  ) {
    return jsonResponse(400, { error: "conversationHistory must be an array" });
  }

  if (
    payload.attachments !== undefined &&
    !Array.isArray(payload.attachments)
  ) {
    return jsonResponse(400, { error: "attachments must be an array" });
  }

  for (const [field, value] of optionalStringFields) {
    if (value !== undefined && value !== null && typeof value !== "string") {
      return jsonResponse(400, { error: `${field} must be a string` });
    }
  }

  if ((rawConversationHistory?.length ?? 0) > MAX_HISTORY_TURNS) {
    return jsonResponse(400, { error: "conversationHistory too long" });
  }

  const conversationTurns = filterValidConversationTurns(
    rawConversationHistory,
  );

  if (
    (rawConversationHistory?.length ?? 0) > 0 &&
    conversationTurns.length === 0
  ) {
    return jsonResponse(400, { error: "no valid conversationHistory turns" });
  }

  if (
    executionMode !== "render_from_analysis" &&
    payload.userMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return jsonResponse(413, { error: "userMessage too long" });
  }
  if ((payload.ciImageBase64?.length ?? 0) > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse(413, { error: "ciImageBase64 too large" });
  }
  if ((payload.referenceImageBase64?.length ?? 0) > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse(413, { error: "referenceImageBase64 too large" });
  }
  if ((payload.previousImageBase64?.length ?? 0) > MAX_IMAGE_BASE64_LENGTH) {
    return jsonResponse(413, { error: "previousImageBase64 too large" });
  }

  if (
    executionMode === "render_from_analysis" &&
    (!payload.analysisWorkId || !payload.analysisWorkId.trim())
  ) {
    return jsonResponse(400, {
      error: "analysisWorkId is required for render_from_analysis",
    });
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(500, { error: "Missing Gemini configuration" });
  }

  payload.attachments = sanitizedAttachments ?? undefined;

  const conversationTurn = conversationTurns.length;

  const analysisWorkId =
    executionMode === "render_from_analysis" && payload.analysisWorkId
      ? payload.analysisWorkId.trim()
      : null;

  try {
    if (executionMode === "render_from_analysis") {
      if (!analysisWorkId) {
        throw new HttpError(400, {
          error: "analysisWorkId is required for render_from_analysis",
        });
      }

      const analysis = await loadAnalysisSnapshot(
        adminClient,
        user.id,
        analysisWorkId,
      );
      const render = await runGeminiRenderFromAnalysis({
        adminClient,
        userId: user.id,
        payload,
        analysis,
        geminiApiKey,
      });

      try {
        await saveSessionIfNeeded(
          supabase,
          payload,
          analysis.aiMessage,
          render.imagekitUrl,
          render.imagekitFileId,
          render.renderWorkId,
        );
      } catch (reason) {
        console.error("Post-generation task failed", {
          workId: render.renderWorkId,
          task: "saveSessionIfNeeded",
          reason,
        });
      }

      return jsonResponse(200, {
        aiMessage: analysis.aiMessage,
        contextChips: [],
        imageUrl: render.imageUrl,
        workId: render.renderWorkId,
        workflowId: analysis.workflowId,
        analysisWorkId: analysis.analysisWorkId,
        generateImage: analysis.generateImage,
        eligibleForRender: analysis.eligibleForRender,
        missingRequirements: analysis.missingRequirements,
        remainingTokens: render.remainingTokens,
      } satisfies GenerateDesignResult);
    }

    const analysis = await runGeminiAnalysis({
      adminClient,
      userId: user.id,
      payload,
      conversationTurns,
      conversationTurn,
      geminiApiKey,
    });

    const shouldRenderNow =
      executionMode === "auto" &&
      analysis.generateImage &&
      analysis.eligibleForRender;

    if (!shouldRenderNow) {
      try {
        await saveSessionIfNeeded(
          supabase,
          payload,
          analysis.aiMessage,
          null,
          null,
          null,
        );
      } catch (reason) {
        console.error("Post-generation task failed", {
          workId: analysis.analysisWorkId,
          task: "saveSessionIfNeeded",
          reason,
        });
      }

      return jsonResponse(200, {
        aiMessage: analysis.aiMessage,
        contextChips: analysis.contextChips,
        imageUrl: null,
        workId: analysis.analysisWorkId,
        workflowId: analysis.workflowId,
        analysisWorkId: analysis.analysisWorkId,
        generateImage: analysis.generateImage,
        eligibleForRender: analysis.eligibleForRender,
        missingRequirements: analysis.missingRequirements,
        remainingTokens: analysis.remainingTokens,
      } satisfies GenerateDesignResult);
    }

    const render = await runGeminiRenderFromAnalysis({
      adminClient,
      userId: user.id,
      payload,
      analysis,
      geminiApiKey,
    });

    try {
      await saveSessionIfNeeded(
        supabase,
        payload,
        analysis.aiMessage,
        render.imagekitUrl,
        render.imagekitFileId,
        render.renderWorkId,
      );
    } catch (reason) {
      console.error("Post-generation task failed", {
        workId: render.renderWorkId,
        task: "saveSessionIfNeeded",
        reason,
      });
    }

    return jsonResponse(200, {
      aiMessage: analysis.aiMessage,
      contextChips: analysis.contextChips,
      imageUrl: render.imageUrl,
      workId: render.renderWorkId,
      workflowId: analysis.workflowId,
      analysisWorkId: analysis.analysisWorkId,
      generateImage: analysis.generateImage,
      eligibleForRender: analysis.eligibleForRender,
      missingRequirements: analysis.missingRequirements,
      remainingTokens: render.remainingTokens,
    } satisfies GenerateDesignResult);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, error.body);
    }

    return jsonResponse(500, {
      error:
        error instanceof Error ? error.message : "Failed to generate design",
    });
  }
});
