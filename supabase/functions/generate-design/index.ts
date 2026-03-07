import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { corsHeaders } from "../_shared/cors.ts";

type ConversationTurn = {
  role: "user" | "ai";
  content: string;
};

type GenerateDesignRequest = {
  userMessage: string;
  designContext?: {
    colors?: string[];
    pattern?: string | null;
    fabricMethod?: string | null;
  };
  conversationHistory?: ConversationTurn[];
  ciImageBase64?: string;
  ciImageMimeType?: string;
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

type ImagenResponse = {
  predictions?: Array<{
    bytesBase64Encoded?: string;
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

const SYSTEM_PROMPT = `당신은 넥타이 디자인을 제안하는 AI 어시스턴트입니다.
항상 한국어로만 응답하세요.
응답은 반드시 다음 JSON 형식만 반환하세요:
{"aiMessage": "...", "contextChips": [{"label": "...", "action": "..."}]}`;

const parseJsonBlock = (value: string): { aiMessage?: string; contextChips?: unknown } => {
  const trimmed = value.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(jsonText);
};

const buildTextPrompt = (payload: GenerateDesignRequest) => {
  const colors = payload.designContext?.colors?.join(", ") || "미정";
  const pattern = payload.designContext?.pattern || "미정";
  const fabricMethod = payload.designContext?.fabricMethod || "미정";
  const history =
    payload.conversationHistory
      ?.map((item) => `${item.role === "user" ? "사용자" : "AI"}: ${item.content}`)
      .join("\n") || "없음";

  return [
    "넥타이 디자인 상담 정보를 바탕으로 다음 응답을 생성하세요.",
    `designContext.colors: ${colors}`,
    `designContext.pattern: ${pattern}`,
    `designContext.fabricMethod: ${fabricMethod}`,
    `userMessage: ${payload.userMessage}`,
    `conversationHistory:\n${history}`,
    "contextChips는 후속 대화에 바로 사용할 수 있는 짧은 액션 2~3개로 구성하세요.",
  ].join("\n");
};

const buildImagenPrompt = (payload: GenerateDesignRequest) => {
  const colors = payload.designContext?.colors?.join(", ") || "세련된 컬러 조합";
  const pattern = payload.designContext?.pattern || "클래식 패턴";
  const fabricMethod = payload.designContext?.fabricMethod || "고급 제작 방식";

  return `넥타이 디자인 이미지, ${pattern}, ${colors}, ${fabricMethod}, 실크 재질, 고급스러운 배경, 상품 사진`;
};

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

const requestGeminiText = async (
  payload: GenerateDesignRequest,
  apiKey: string,
) => {
  const parts: Array<Record<string, unknown>> = [{ text: buildTextPrompt(payload) }];

  if (payload.ciImageBase64) {
    parts.push({
      inlineData: {
        mimeType: payload.ciImageMimeType || "image/png",
        data: payload.ciImageBase64,
      },
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini text API failed: ${response.status} ${errorText}`);
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
    contextChips: Array.isArray(parsed.contextChips)
      ? parsed.contextChips.filter(
          (chip): chip is { label: string; action: string } =>
            typeof chip === "object" &&
            chip !== null &&
            typeof (chip as { label?: unknown }).label === "string" &&
            typeof (chip as { action?: unknown }).action === "string",
        )
      : [],
  };
};

const requestImagen = async (
  payload: GenerateDesignRequest,
  apiKey: string,
) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: buildImagenPrompt(payload),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as ImagenResponse;
    const base64 = result.predictions?.[0]?.bytesBase64Encoded;

    if (!base64) {
      return null;
    }

    // TODO: Supabase Storage에 업로드 후 영구 URL 반환으로 교체
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
};

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
  try {
    supabase = createAuthenticatedSupabaseClient(authHeader);
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Missing Supabase configuration",
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

  if (!payload?.userMessage?.trim()) {
    return jsonResponse(400, { error: "userMessage is required" });
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(500, { error: "Missing Gemini configuration" });
  }

  try {
    const textResult = await requestGeminiText(payload, geminiApiKey);
    const imageUrl = await requestImagen(payload, geminiApiKey);

    return jsonResponse(200, {
      aiMessage: textResult.aiMessage,
      contextChips: textResult.contextChips,
      imageUrl,
    } satisfies GenerateDesignResult);
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : "Failed to generate design",
    });
  }
});
