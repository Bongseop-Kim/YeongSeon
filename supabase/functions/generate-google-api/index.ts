import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  type ConversationTurn,
  type DetectedDesign,
  filterValidConversationTurns,
} from "@/functions/_shared/conversation.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import type { AiGenerationLogInsert } from "@/functions/_shared/log-generation.ts";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import {
  buildImagePrompt,
  buildImageEditPrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "@/functions/_shared/prompt-builders.ts";

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

type GenerateDesignResult = {
  aiMessage: string;
  contextChips: Array<{
    label: string;
    action: string;
  }>;
  imageUrl: string | null;
};

// ─── API requests ────────────────────────────────────────────────────────────

const requestGeminiText = async (
  payload: GenerateDesignRequest,
  apiKey: string,
  conversationTurns: ConversationTurn[],
) => {
  // 대화 히스토리를 Gemini 네이티브 멀티턴 포맷으로 변환
  const historyContents: Array<Record<string, unknown>> = conversationTurns.map(
    (turn) => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    }),
  );

  // 현재 메시지 (designContext + userMessage + 이미지)
  const currentParts: Array<Record<string, unknown>> = [
    { text: buildTextPrompt(payload) },
  ];
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

const requestGeminiImage = async (
  payload: GenerateDesignRequest,
  apiKey: string,
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
            parts: [{ text: buildImagePrompt(payload) }],
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
            parts: [{ text: buildImageEditPrompt(payload) }, ...currentParts],
          },
        ]
      : [
          {
            role: "user",
            parts: [{ text: buildImagePrompt(payload) }, ...currentParts],
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
      (p) => p.inlineData?.data,
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
  } catch (err) {
    console.error("Gemini image generation failed:", err);
    return null;
  }
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

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(500, { error: "Missing Gemini configuration" });
  }

  let textLatencyMs: number | null = null;
  let imageLatencyMs: number | null = null;
  let refundAmount = 0;
  let chargedTokens = 0;
  let requestType: "text_only" | "text_and_image" | null = null;
  let textResult: Awaited<ReturnType<typeof requestGeminiText>> | null = null;

  const emitGenerationLog = async (
    overrides: Partial<AiGenerationLogInsert> = {},
  ) => {
    await logGeneration(adminClient, {
      work_id: workId,
      user_id: user.id,
      ai_model: "gemini",
      request_type: requestType,
      user_message: payload.userMessage,
      prompt_length: payload.userMessage.length,
      design_context: payload.designContext ?? null,
      conversation_turn: conversationTurns.length,
      has_ci_image: !!payload.ciImageBase64,
      has_reference_image: !!payload.referenceImageBase64,
      has_previous_image: !!payload.previousImageBase64,
      ai_message: textResult?.aiMessage ?? null,
      generate_image: textResult?.generateImage ?? null,
      image_generated: overrides.image_generated ?? false,
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

  try {
    const textStartTime = Date.now();
    try {
      textResult = await requestGeminiText(
        payload,
        geminiApiKey,
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

    // 토큰 차감
    const { data: tokenResult, error: tokenError } = await adminClient.rpc(
      "use_design_tokens",
      {
        p_user_id: user.id,
        p_ai_model: "gemini",
        p_request_type: requestType,
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

    const tokenData = tokenResult as {
      success: boolean;
      error?: string;
      balance: number;
      cost: number;
    };

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
    let imageUrl: string | null = null;
    let remainingTokens = tokenData.balance;

    const refundTokens = async (amount: number) => {
      if (amount <= 0) return;
      const { error } = await adminClient.rpc("refund_design_tokens", {
        p_user_id: user.id,
        p_amount: amount,
        p_ai_model: "gemini",
        p_request_type: requestType,
        p_work_id: workId,
      });
      if (error) {
        console.error("Token refund failed:", error);
        return;
      }
      refundAmount = amount;
      remainingTokens = tokenData.balance + amount;
    };

    if (textResult.generateImage) {
      const imageStartTime = Date.now();
      imageUrl = await requestGeminiImage(imagePayload, geminiApiKey);
      imageLatencyMs = Date.now() - imageStartTime;

      // 이미지 생성 실패 시 이미지 비용 환불 (텍스트 비용은 유지)
      if (imageUrl === null) {
        const { data: textCostData, error: textCostError } = await adminClient
          .from("admin_settings")
          .select("value")
          .eq("key", "design_token_cost_gemini_text")
          .single();
        if (textCostError || !textCostData) {
          // admin_settings 조회 실패 시 환불 생략 (textCost=0 폴백으로 전액 환불되는 과다 환불 방지)
          console.error(
            "CRITICAL: admin_settings 'design_token_cost_gemini_text' 조회 실패 — 이미지 비용 환불 생략",
            textCostError,
          );
        } else {
          const parsedTextCost = parseInt(textCostData.value, 10);
          const textCost =
            isNaN(parsedTextCost) || parsedTextCost <= 0
              ? 0
              : Math.min(parsedTextCost, tokenData.cost);
          await refundTokens(Math.max(tokenData.cost - textCost, 0));
        }
      }
    }

    await emitGenerationLog({
      image_generated: imageUrl !== null,
    });

    return jsonResponse(200, {
      aiMessage: textResult.aiMessage,
      contextChips: textResult.contextChips,
      imageUrl,
      remainingTokens,
    } satisfies GenerateDesignResult & { remainingTokens: number });
  } catch (error) {
    await emitGenerationLog({
      image_generated: false,
      error_type: "generation_failed",
      error_message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse(500, {
      error:
        error instanceof Error ? error.message : "Failed to generate design",
    });
  }
});
