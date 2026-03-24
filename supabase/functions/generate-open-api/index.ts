import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  type ConversationTurn,
  type DetectedDesign,
  filterValidConversationTurns,
} from "@/functions/_shared/conversation.ts";
import {
  type AiGenerationLogInsert,
  logGeneration,
} from "@/functions/_shared/log-generation.ts";
import {
  buildImageEditPrompt,
  buildImagePrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "./prompts.ts";

export type GenerateDesignRequest = {
  userMessage: string;
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
    ciPlacement?: string | null;
    scale?: "large" | "medium" | "small" | null;
  };
  conversationHistory?: ConversationTurn[];
  previousImageBase64?: string;
  previousImageMimeType?: string;
  ciImageBase64?: string;
  ciImageMimeType?: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
};

type OpenAITextResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

type GenerateDesignResult = {
  aiMessage: string;
  contextChips: Array<{
    label: string;
    action: string;
  }>;
  imageUrl: string | null;
};

type GenerationRequestType = NonNullable<AiGenerationLogInsert["request_type"]>;
type ImageQuality = Exclude<AiGenerationLogInsert["quality"], null | undefined>;
type UseDesignTokensResult = {
  success: boolean;
  error?: string;
  balance: number;
  cost: number;
};

// ─── API requests ────────────────────────────────────────────────────────────

const base64ToBlob = (base64: string, mimeType: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
};

const requestOpenAIText = async (
  payload: GenerateDesignRequest,
  apiKey: string,
  conversationTurns: ConversationTurn[],
) => {
  const historyMessages: Array<Record<string, unknown>> = conversationTurns.map(
    (turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.content,
    }),
  );

  const textParts: Array<Record<string, unknown>> = [
    { type: "text", text: buildTextPrompt(payload) },
  ];
  const imageParts: Array<Record<string, unknown>> = [];

  if (payload.ciImageBase64) {
    imageParts.push({
      type: "image_url",
      image_url: {
        url: `data:${
          payload.ciImageMimeType || "image/png"
        };base64,${payload.ciImageBase64}`,
      },
    });
  }
  if (payload.referenceImageBase64) {
    imageParts.push({
      type: "image_url",
      image_url: {
        url: `data:${
          payload.referenceImageMimeType || "image/png"
        };base64,${payload.referenceImageBase64}`,
      },
    });
  }

  const textController = new AbortController();
  const textTimeoutId = setTimeout(() => textController.abort(), 30000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: textController.signal,
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...historyMessages,
          { role: "user", content: [...textParts, ...imageParts] },
        ],
      }),
    });
  } finally {
    clearTimeout(textTimeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`OpenAI text API failed: ${response.status}`, errorText);
    throw new Error("OpenAI text API failed");
  }

  const result = (await response.json()) as OpenAITextResponse;
  const text = result.choices?.[0]?.message?.content?.trim();

  if (!text) {
    throw new Error("OpenAI text API returned empty content");
  }

  const parsed = parseJsonBlock(text);

  const rawDetected = parsed.detectedDesign as
    | Record<string, unknown>
    | undefined;
  const detectedDesign: DetectedDesign | null = rawDetected
    ? {
        pattern:
          typeof rawDetected.pattern === "string" ? rawDetected.pattern : null,
        colors: Array.isArray(rawDetected.colors)
          ? rawDetected.colors.filter((c): c is string => typeof c === "string")
          : [],
        ciPlacement:
          typeof rawDetected.ciPlacement === "string"
            ? rawDetected.ciPlacement
            : null,
        scale:
          rawDetected.scale === "large" ||
          rawDetected.scale === "medium" ||
          rawDetected.scale === "small"
            ? rawDetected.scale
            : null,
      }
    : null;

  return {
    aiMessage:
      typeof parsed.aiMessage === "string"
        ? parsed.aiMessage
        : "디자인 방향을 반영한 넥타이 시안을 준비했습니다.",
    generateImage:
      typeof parsed.generateImage === "boolean" ? parsed.generateImage : true,
    contextChips: Array.isArray(parsed.contextChips)
      ? parsed.contextChips.filter(
          (chip): chip is { label: string; action: string } =>
            typeof chip === "object" &&
            chip !== null &&
            typeof (chip as { label?: unknown }).label === "string" &&
            typeof (chip as { action?: unknown }).action === "string",
        )
      : [],
    detectedDesign,
  };
};

const requestOpenAIImage = async (
  payload: GenerateDesignRequest,
  apiKey: string,
): Promise<string | null> => {
  try {
    const imageController = new AbortController();
    const imageTimeoutId = setTimeout(() => imageController.abort(), 120000);

    let response: Response;
    try {
      const quality =
        payload.ciImageBase64 ||
        payload.referenceImageBase64 ||
        payload.designContext?.ciPlacement
          ? "high"
          : "medium";

      if (
        payload.previousImageBase64 ||
        payload.ciImageBase64 ||
        payload.referenceImageBase64
      ) {
        const formData = new FormData();

        if (payload.previousImageBase64) {
          // EDIT MODE: previousImageBase64 as primary, ci/reference as auxiliaries, input_fidelity=high
          formData.append(
            "image",
            base64ToBlob(
              payload.previousImageBase64,
              payload.previousImageMimeType || "image/png",
            ),
            "source-image.png",
          );
          formData.append("prompt", buildImageEditPrompt(payload));
          formData.append("model", "gpt-image-1.5");
          formData.append("size", "1024x1536");
          formData.append("quality", quality);
          if (payload.ciImageBase64) {
            formData.append(
              "image[]",
              base64ToBlob(
                payload.ciImageBase64,
                payload.ciImageMimeType || "image/png",
              ),
              "ci-image.png",
            );
          }
          if (payload.referenceImageBase64) {
            formData.append(
              "image[]",
              base64ToBlob(
                payload.referenceImageBase64,
                payload.referenceImageMimeType || "image/png",
              ),
              "reference-image.png",
            );
          }
          if (payload.ciImageBase64 || payload.referenceImageBase64) {
            formData.append("input_fidelity", "high");
          }
        } else {
          // GENERATE WITH SOURCE: ci or reference as primary (not duplicated), NO input_fidelity
          const primaryBase64 =
            payload.ciImageBase64 || payload.referenceImageBase64;
          if (!primaryBase64) {
            throw new Error("Source image is required for edit mode");
          }
          const primaryMime = payload.ciImageBase64
            ? payload.ciImageMimeType || "image/png"
            : payload.referenceImageMimeType || "image/png";
          formData.append(
            "image",
            base64ToBlob(primaryBase64, primaryMime),
            "source-image.png",
          );
          formData.append("prompt", buildImagePrompt(payload));
          formData.append("model", "gpt-image-1.5");
          formData.append("size", "1024x1536");
          formData.append("quality", quality);
          // Only append reference as auxiliary when both ci AND reference exist (ci is primary, reference is auxiliary)
          if (payload.ciImageBase64 && payload.referenceImageBase64) {
            formData.append(
              "image[]",
              base64ToBlob(
                payload.referenceImageBase64,
                payload.referenceImageMimeType || "image/png",
              ),
              "reference-image.png",
            );
          }
          // No input_fidelity in generate mode
        }

        response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: imageController.signal,
          body: formData,
        });
      } else {
        response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: imageController.signal,
          body: JSON.stringify({
            model: "gpt-image-1.5",
            prompt: buildImagePrompt(payload),
            size: "1024x1536",
            quality,
          }),
        });
      }
    } finally {
      clearTimeout(imageTimeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI image API failed: ${response.status}`, errorText);
      throw new Error("OpenAI image API failed");
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const base64 = result.data?.[0]?.b64_json;

    if (!base64) {
      console.error(
        "OpenAI image API: no b64_json in response",
        JSON.stringify(result),
      );
      return null;
    }

    return `data:image/png;base64,${base64}`;
  } catch (err) {
    console.error("OpenAI image generation failed:", err);
    return null;
  }
};

const PREAUTHORIZED_REQUEST_TYPE: GenerationRequestType = "text_and_image";
const PREAUTHORIZED_IMAGE_QUALITY: ImageQuality = "high";

const getOpenAIImageQuality = (payload: GenerateDesignRequest): ImageQuality =>
  payload.ciImageBase64 ||
  payload.referenceImageBase64 ||
  payload.designContext?.ciPlacement
    ? "high"
    : "standard";

const getOpenAITokenCostSettingKey = (
  requestType: GenerationRequestType,
  quality: ImageQuality,
) => {
  if (requestType === "text_and_image" && quality === "high") {
    return "design_token_cost_openai_image_high";
  }

  return `design_token_cost_openai_${
    requestType === "text_and_image" ? "image" : "text"
  }`;
};

const getTokenCostFromSettings = async (
  adminClient: SupabaseClient,
  key: string,
) => {
  const { data, error } = await adminClient
    .from("admin_settings")
    .select("value")
    .eq("key", key)
    .single();

  if (error || !data) {
    console.error(`admin_settings '${key}' 조회 실패:`, error);
    throw new Error(`Token cost setting is missing: ${key}`);
  }

  const parsedCost = parseInt(data.value, 10);
  if (isNaN(parsedCost) || parsedCost <= 0) {
    throw new Error(`Invalid token cost setting: ${key}`);
  }

  return parsedCost;
};

// ─── Supabase clients ────────────────────────────────────────────────────────

const createAuthenticatedSupabaseClient = (authHeader: string) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase configuration");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
};

const createAdminSupabaseClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
};

// ─── Handler ─────────────────────────────────────────────────────────────────

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
  const workId = crypto.randomUUID();
  const requestStartTime = Date.now();

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

  if (typeof payload?.userMessage !== "string" || !payload.userMessage.trim()) {
    return jsonResponse(400, { error: "userMessage is required" });
  }

  const MAX_HISTORY_TURNS = 20;
  const MAX_MESSAGE_LENGTH = 2000;
  const MAX_IMAGE_BASE64_LENGTH = 5_000_000; // ~3.7MB decoded
  const rawConversationHistory = payload.conversationHistory;

  if (
    rawConversationHistory !== undefined &&
    !Array.isArray(rawConversationHistory)
  ) {
    return jsonResponse(400, { error: "conversationHistory must be an array" });
  }

  const conversationTurns = filterValidConversationTurns(
    rawConversationHistory,
  );

  if ((rawConversationHistory?.length ?? 0) > MAX_HISTORY_TURNS) {
    return jsonResponse(400, { error: "conversationHistory too long" });
  }
  if (
    (rawConversationHistory?.length ?? 0) > 0 &&
    conversationTurns.length === 0
  ) {
    return jsonResponse(400, { error: "no valid conversationHistory turns" });
  }
  if (payload.userMessage.length > MAX_MESSAGE_LENGTH) {
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

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return jsonResponse(500, { error: "Missing OpenAI configuration" });
  }

  let textLatencyMs: number | null = null;
  let imageLatencyMs: number | null = null;
  let refundAmount = 0;
  let chargedTokens = 0;
  let imageQuality: AiGenerationLogInsert["quality"] =
    PREAUTHORIZED_IMAGE_QUALITY;
  const conversationTurn = conversationTurns.length;
  let requestType: "text_only" | "text_and_image" | null = null;
  let textResult: Awaited<ReturnType<typeof requestOpenAIText>> | null = null;
  let remainingTokens: number | null = null;

  const emitGenerationLog = async (
    overrides: Partial<AiGenerationLogInsert> = {},
  ) => {
    await logGeneration(adminClient, {
      work_id: workId,
      user_id: user.id,
      ai_model: "openai",
      request_type: requestType,
      quality: imageQuality,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      design_context: payload.designContext ?? null,
      conversation_turn: conversationTurn,
      has_ci_image: !!payload.ciImageBase64,
      has_reference_image: !!payload.referenceImageBase64,
      has_previous_image: !!payload.previousImageBase64,
      ai_message: textResult?.aiMessage ?? null,
      generate_image: textResult?.generateImage ?? null,
      image_generated: false,
      detected_design: textResult?.detectedDesign ?? null,
      tokens_charged: chargedTokens,
      tokens_refunded: refundAmount,
      text_latency_ms: textLatencyMs,
      image_latency_ms:
        requestType === "text_and_image" ? imageLatencyMs : null,
      total_latency_ms: Date.now() - requestStartTime,
      ...overrides,
    });
  };

  type RefundReason =
    | "image_failed_refund"
    | "settlement_refund"
    | "generation_failed_refund";

  const refundTokens = async (amount: number, reason: RefundReason) => {
    if (amount <= 0) {
      return;
    }

    const { error } = await adminClient.rpc("refund_design_tokens", {
      p_user_id: user.id,
      p_amount: amount,
      p_ai_model: "openai",
      p_request_type: requestType ?? PREAUTHORIZED_REQUEST_TYPE,
      p_work_id: `${workId}_${reason}`,
    });

    if (error) {
      console.error("Token refund failed:", error);
      return;
    }

    refundAmount += amount;
    if (remainingTokens !== null) {
      remainingTokens += amount;
    }
  };

  try {
    requestType = PREAUTHORIZED_REQUEST_TYPE;
    imageQuality = PREAUTHORIZED_IMAGE_QUALITY;

    const { data: tokenResult, error: tokenError } = await adminClient.rpc(
      "use_design_tokens",
      {
        p_user_id: user.id,
        p_ai_model: "openai",
        p_request_type: requestType,
        p_quality: imageQuality,
        p_work_id: workId,
      },
    );

    if (tokenError) {
      console.error("Token deduction error:", tokenError);
      await emitGenerationLog({
        error_type: "token_processing_failed",
        error_message: tokenError.message,
      });
      return jsonResponse(500, { error: "Token processing failed" });
    }

    const tokenData = tokenResult as UseDesignTokensResult;

    if (!tokenData.success) {
      await emitGenerationLog({
        error_type: tokenData.error ?? "insufficient_tokens",
        error_message: tokenData.error ?? "Token deduction was rejected",
      });
      return jsonResponse(403, {
        error: "insufficient_tokens",
        balance: tokenData.balance,
        cost: tokenData.cost,
      });
    }

    chargedTokens = tokenData.cost;
    remainingTokens = tokenData.balance;

    const textStartTime = Date.now();
    try {
      textResult = await requestOpenAIText(
        payload,
        openaiApiKey,
        conversationTurns,
      );
    } finally {
      textLatencyMs = Date.now() - textStartTime;
    }

    // 채팅 모드에서 빈 designContext 필드를 텍스트 AI가 추출한 값으로 보완
    const detected = textResult.detectedDesign;
    const payloadColors = payload.designContext?.colors ?? [];
    const detectedColors = detected?.colors ?? [];
    const imagePayload: GenerateDesignRequest = {
      ...payload,
      designContext: {
        ...payload.designContext,
        pattern: payload.designContext?.pattern ?? detected?.pattern ?? null,
        colors: payloadColors.length > 0 ? payloadColors : detectedColors,
        ciPlacement:
          payload.designContext?.ciPlacement ?? detected?.ciPlacement ?? null,
        scale: payload.designContext?.scale ?? detected?.scale ?? null,
      },
    };

    requestType = textResult.generateImage ? "text_and_image" : "text_only";
    imageQuality = textResult.generateImage
      ? getOpenAIImageQuality(imagePayload)
      : null;

    let imageUrl: string | null = null;
    let finalCost: number;

    if (textResult.generateImage) {
      // 이미지 성공/실패 두 경우의 비용을 미리 병렬로 조회
      const [combinedCost, textOnlyCost] = await Promise.all([
        getTokenCostFromSettings(
          adminClient,
          getOpenAITokenCostSettingKey(requestType, imageQuality ?? "standard"),
        ),
        getTokenCostFromSettings(adminClient, "design_token_cost_openai_text"),
      ]);

      const imageStartTime = Date.now();
      imageUrl = await requestOpenAIImage(imagePayload, openaiApiKey);
      imageLatencyMs = Date.now() - imageStartTime;

      finalCost = imageUrl !== null ? combinedCost : textOnlyCost;
    } else {
      finalCost = await getTokenCostFromSettings(
        adminClient,
        getOpenAITokenCostSettingKey(requestType, imageQuality ?? "standard"),
      );
    }

    await refundTokens(
      Math.max(chargedTokens - finalCost, 0),
      textResult.generateImage && imageUrl === null
        ? "image_failed_refund"
        : "settlement_refund",
    );

    await emitGenerationLog({
      ai_message: textResult.aiMessage,
      generate_image: textResult.generateImage,
      image_generated: imageUrl !== null,
      detected_design: textResult.detectedDesign,
      image_latency_ms: textResult.generateImage ? imageLatencyMs : null,
    });

    return jsonResponse(200, {
      aiMessage: textResult.aiMessage,
      contextChips: textResult.contextChips,
      imageUrl,
      remainingTokens,
    } satisfies GenerateDesignResult & { remainingTokens: number });
  } catch (error) {
    await refundTokens(
      Math.max(chargedTokens - refundAmount, 0),
      "generation_failed_refund",
    );
    await emitGenerationLog({
      error_type: "generation_failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse(500, {
      error:
        error instanceof Error ? error.message : "Failed to generate design",
    });
  }
});
