import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

import { corsHeaders } from "../_shared/cors.ts";
import {
  buildGeminiImagePrompt,
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
  };
  conversationHistory?: ConversationTurn[];
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
  const parts: Array<Record<string, unknown>> = [{
    text: buildTextPrompt(payload),
  }];

  if (payload.ciImageBase64) {
    parts.push({
      inlineData: {
        mimeType: payload.ciImageMimeType || "image/png",
        data: payload.ciImageBase64,
      },
    });
  }

  if (payload.referenceImageBase64) {
    parts.push({
      inlineData: {
        mimeType: payload.referenceImageMimeType || "image/png",
        data: payload.referenceImageBase64,
      },
    });
  }

  const textController = new AbortController();
  const textTimeoutId = setTimeout(() => textController.abort(), 30000);

  const response = await fetch(
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

  clearTimeout(textTimeoutId);

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
    aiMessage: typeof parsed.aiMessage === "string"
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

const requestGeminiImage = async (
  payload: GenerateDesignRequest,
  apiKey: string,
): Promise<string | null> => {
  try {
    const parts: Array<Record<string, unknown>> = [
      { text: buildGeminiImagePrompt(payload) },
    ];

    if (payload.ciImageBase64) {
      parts.push({
        inlineData: {
          mimeType: payload.ciImageMimeType || "image/png",
          data: payload.ciImageBase64,
        },
      });
    }

    if (payload.referenceImageBase64) {
      parts.push({
        inlineData: {
          mimeType: payload.referenceImageMimeType || "image/png",
          data: payload.referenceImageBase64,
        },
      });
    }

    const imageController = new AbortController();
    const imageTimeoutId = setTimeout(() => imageController.abort(), 30000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: imageController.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "3:4" },
          },
        }),
      },
    );

    clearTimeout(imageTimeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Gemini image API failed: ${response.status} ${errorText}`,
      );
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

    // TODO: Supabase Storage에 업로드 후 영구 URL 반환으로 교체
    return `data:${imagePart?.inlineData?.mimeType ?? "image/png"};base64,${base64}`;
  } catch (err) {
    console.error("Gemini image generation failed:", err);
    return null;
  }
};

// ─── Supabase client ─────────────────────────────────────────────────────────

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
  try {
    supabase = createAuthenticatedSupabaseClient(authHeader);
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

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(500, { error: "Missing Gemini configuration" });
  }

  try {
    const textResult = await requestGeminiText(payload, geminiApiKey);
    const imageUrl = await requestGeminiImage(payload, geminiApiKey);

    return jsonResponse(
      200,
      {
        aiMessage: textResult.aiMessage,
        contextChips: textResult.contextChips,
        imageUrl,
      } satisfies GenerateDesignResult,
    );
  } catch (error) {
    return jsonResponse(500, {
      error: error instanceof Error
        ? error.message
        : "Failed to generate design",
    });
  }
});
