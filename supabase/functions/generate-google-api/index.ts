import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { corsHeaders } from "../_shared/cors.ts";
import {
  buildGeminiImagePrompt,
  buildImageEditPrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "./prompts.ts";

type ConversationTurn = {
  role: "user" | "ai";
  content: string;
};

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

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

// ─── API requests ────────────────────────────────────────────────────────────

const requestGeminiText = async (
  payload: GenerateDesignRequest,
  apiKey: string,
) => {
  // 대화 히스토리를 Gemini 네이티브 멀티턴 포맷으로 변환
  const historyContents: Array<Record<string, unknown>> = (
    payload.conversationHistory ?? []
  ).map((turn) => ({
    role: turn.role === "user" ? "user" : "model",
    parts: [{ text: turn.content }],
  }));

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

  const contents = [
    ...historyContents,
    { role: "user", parts: currentParts },
  ];

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
  const detectedDesign = rawDetected
    ? {
      pattern: typeof rawDetected.pattern === "string"
        ? rawDetected.pattern
        : null,
      colors: Array.isArray(rawDetected.colors)
        ? rawDetected.colors.filter((c): c is string => typeof c === "string")
        : [],
      ciPlacement: typeof rawDetected.ciPlacement === "string"
        ? rawDetected.ciPlacement
        : null,
      scale: rawDetected.scale === "large" ||
          rawDetected.scale === "medium" ||
          rawDetected.scale === "small"
        ? rawDetected.scale
        : null,
    }
    : null;

  return {
    aiMessage: typeof parsed.aiMessage === "string"
      ? parsed.aiMessage
      : "디자인 방향을 반영한 넥타이 시안을 준비했습니다.",
    generateImage: typeof parsed.generateImage === "boolean"
      ? parsed.generateImage
      : true,
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

    const contents = payload.previousImageBase64
      ? [
        {
          role: "user",
          parts: [{ text: buildGeminiImagePrompt(payload) }],
        },
        {
          role: "model",
          parts: [{
            inlineData: {
              mimeType: payload.previousImageMimeType || "image/png",
              data: payload.previousImageBase64,
            },
          }],
        },
        {
          role: "user",
          parts: [{ text: buildImageEditPrompt(payload) }, ...currentParts],
        },
      ]
      : [{
        role: "user",
        parts: [{ text: buildGeminiImagePrompt(payload) }, ...currentParts],
      }];

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
      error: error instanceof Error
        ? error.message
        : "Missing Supabase configuration",
    });
  }
  const workId = crypto.randomUUID();

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

  if ((payload.conversationHistory?.length ?? 0) > MAX_HISTORY_TURNS) {
    return jsonResponse(400, { error: "conversationHistory too long" });
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

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(500, { error: "Missing Gemini configuration" });
  }

  try {
    const textResult = await requestGeminiText(payload, geminiApiKey);

    // 채팅 모드에서 빈 designContext 필드를 텍스트 AI가 추출한 값으로 보완
    const detected = textResult.detectedDesign;
    const imagePayload: GenerateDesignRequest = {
      ...payload,
      designContext: {
        ...payload.designContext,
        pattern: payload.designContext?.pattern ?? detected?.pattern ?? null,
        colors: (payload.designContext?.colors?.length ?? 0) > 0
          ? payload.designContext!.colors
          : (detected?.colors.length ?? 0) > 0
          ? detected!.colors
          : (payload.designContext?.colors ?? []),
        ciPlacement: payload.designContext?.ciPlacement ??
          detected?.ciPlacement ?? null,
        scale: payload.designContext?.scale ?? detected?.scale ?? null,
      },
    };

    const requestType = textResult.generateImage
      ? "text_and_image"
      : "text_only";

    // 토큰 차감
    const { data: tokenResult, error: tokenError } = await adminClient.rpc(
      "use_design_tokens",
      {
        p_user_id: user.id,
        p_ai_model: "gemini",
        p_request_type: requestType,
      },
    );

    if (tokenError) {
      console.error("Token deduction error:", tokenError);
      return jsonResponse(500, { error: "Token processing failed" });
    }

    const tokenData = tokenResult as {
      success: boolean;
      error?: string;
      balance: number;
      cost: number;
    };

    if (!tokenData.success) {
      return jsonResponse(403, {
        error: "insufficient_tokens",
        balance: tokenData.balance,
        cost: tokenData.cost,
      });
    }

    let imageUrl: string | null = null;
    let remainingTokens = tokenData.balance;

    if (textResult.generateImage) {
      imageUrl = await requestGeminiImage(imagePayload, geminiApiKey);

      // 이미지 생성 실패 시 이미지 비용 환불 (텍스트 비용은 유지)
      if (imageUrl === null) {
        const { data: textCostData } = await adminClient
          .from("admin_settings")
          .select("value")
          .eq("key", "design_token_cost_gemini_text")
          .single();
        const textCost = textCostData
          ? parseInt(textCostData.value, 10) || 1
          : 1;
        const refundAmount = tokenData.cost - textCost;

        if (refundAmount > 0) {
          const { error: refundError } = await adminClient.rpc(
            "refund_design_tokens",
            {
              p_user_id: user.id,
              p_amount: refundAmount,
              p_ai_model: "gemini",
              p_request_type: requestType,
              p_work_id: workId,
            },
          );
          if (refundError) {
            console.error("Token refund failed:", refundError);
          }
          remainingTokens = tokenData.balance + refundAmount;
        }
      }
    }

    return jsonResponse(
      200,
      {
        aiMessage: textResult.aiMessage,
        contextChips: textResult.contextChips,
        imageUrl,
        remainingTokens,
      } satisfies GenerateDesignResult & { remainingTokens: number },
    );
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error
        ? error.message
        : "Failed to generate design",
    });
  }
});
