import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { corsHeaders } from "../_shared/cors.ts";
import {
  buildImagePrompt,
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

type OpenAITextResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

type DetectedDesign = {
  pattern: string | null;
  colors: string[];
  ciPlacement: string | null;
  scale: "large" | "medium" | "small" | null;
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

const base64ToBlob = (
  base64: string,
  mimeType: string,
) => {
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
) => {
  const historyMessages: Array<Record<string, unknown>> = (
    payload.conversationHistory ?? []
  ).map((turn) => ({
    role: turn.role === "user" ? "user" : "assistant",
    content: turn.content,
  }));

  const textParts: Array<Record<string, unknown>> = [
    { type: "text", text: buildTextPrompt(payload) },
  ];
  const imageParts: Array<Record<string, unknown>> = [];

  if (payload.ciImageBase64) {
    imageParts.push({
      type: "image_url",
      image_url: {
        url: `data:${payload.ciImageMimeType || "image/png"};base64,${
          payload.ciImageBase64
        }`,
      },
    });
  }
  if (payload.referenceImageBase64) {
    imageParts.push({
      type: "image_url",
      image_url: {
        url: `data:${payload.referenceImageMimeType || "image/png"};base64,${
          payload.referenceImageBase64
        }`,
      },
    });
  }

  const textController = new AbortController();
  const textTimeoutId = setTimeout(() => textController.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
    );
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

const requestOpenAIImage = async (
  payload: GenerateDesignRequest,
  apiKey: string,
): Promise<string | null> => {
  try {
    const imageController = new AbortController();
    const imageTimeoutId = setTimeout(() => imageController.abort(), 120000);

    let response: Response;
    try {
      const sourceImageBase64 = payload.previousImageBase64 ??
        payload.ciImageBase64 ??
        payload.referenceImageBase64;
      const sourceImageMimeType = payload.previousImageBase64
        ? payload.previousImageMimeType || "image/png"
        : payload.ciImageBase64
        ? payload.ciImageMimeType || "image/png"
        : payload.referenceImageMimeType || "image/png";
      const hasAuxiliaryImages = !!(
        payload.ciImageBase64 || payload.referenceImageBase64
      );
      const quality = payload.ciImageBase64 ||
          payload.referenceImageBase64 ||
          payload.designContext?.ciPlacement
        ? "high"
        : "medium";

      if (sourceImageBase64) {
        const formData = new FormData();
        formData.append(
          "image",
          base64ToBlob(sourceImageBase64, sourceImageMimeType),
          "source-image.png",
        );
        formData.append(
          "prompt",
          payload.previousImageBase64
            ? buildImageEditPrompt(payload)
            : buildImagePrompt(payload),
        );
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
        if (sourceImageBase64 && hasAuxiliaryImages) {
          formData.append("input_fidelity", "high");
        }

        response = await fetch(
          "https://api.openai.com/v1/images/edits",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            signal: imageController.signal,
            body: formData,
          },
        );
      } else {
        response = await fetch(
          "https://api.openai.com/v1/images/generations",
          {
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
              ...(hasAuxiliaryImages ? { input_fidelity: "high" } : {}),
            }),
          },
        );
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

  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    return jsonResponse(500, { error: "Missing OpenAI configuration" });
  }

  try {
    const textResult = await requestOpenAIText(payload, openaiApiKey);

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

    // high quality 여부 결정 (이미지 비용 차등 과금)
    const imageQuality = imagePayload.ciImageBase64 ||
        imagePayload.referenceImageBase64 ||
        imagePayload.designContext?.ciPlacement
      ? "high"
      : "standard";

    // 토큰 차감
    const { data: tokenResult, error: tokenError } = await adminClient.rpc(
      "use_design_tokens",
      {
        p_user_id: user.id,
        p_ai_model: "openai",
        p_request_type: requestType,
        p_quality: imageQuality,
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
      imageUrl = await requestOpenAIImage(imagePayload, openaiApiKey);

      // 이미지 생성 실패 시 이미지 비용 환불 (텍스트 비용은 유지)
      if (imageUrl === null) {
        const { data: textCostData } = await adminClient
          .from("admin_settings")
          .select("value")
          .eq("key", "design_token_cost_openai_text")
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
              p_ai_model: "openai",
              p_request_type: requestType,
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
