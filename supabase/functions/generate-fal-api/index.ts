import "@supabase/functions-js/edge-runtime.d.ts";

import { filterValidConversationTurns } from "@/functions/_shared/conversation.ts";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import { callFalFluxImg2Img } from "@/functions/_shared/fal-client.ts";
import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import {
  buildFalPatternPrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "@/functions/_shared/prompt-builders.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (Deno.env.get("FALAI_CI_PATTERN_ENABLED") !== "true") {
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
  const textPrompt = buildTextPrompt(payload);
  const history = filterValidConversationTurns(payload.conversationHistory);
  const textStart = Date.now();

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
    await logGeneration(adminClient, {
      work_id: workId,
      phase: "analysis",
      user_id: user.id,
      ai_model: "openai",
      request_type: "analysis",
      user_message: payload.userMessage,
      image_generated: false,
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

  if (!generateImage) {
    await logGeneration(adminClient, {
      work_id: workId,
      phase: "analysis",
      user_id: user.id,
      ai_model: "openai",
      request_type: "analysis",
      user_message: payload.userMessage,
      text_prompt: textPrompt,
      ai_message: aiMessage,
      generate_image: false,
      eligible_for_render: false,
      image_generated: false,
      text_latency_ms: textLatencyMs,
    });

    return jsonResponse(200, {
      aiMessage,
      imageUrl: null,
      workId,
      generateImage: false,
      eligibleForRender: false,
      missingRequirements: [],
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
    await logGeneration(adminClient, {
      work_id: workId,
      phase: "render",
      user_id: user.id,
      ai_model: "openai",
      request_type: "render_standard",
      user_message: payload.userMessage,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: true,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      error_type: "fal_render_failed",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(500, { error: "fal_render_failed" });
  }

  const imageLatencyMs = Date.now() - imageStart;
  const falImageResp = await fetch(falImageUrl);

  if (!falImageResp.ok) {
    return jsonResponse(500, { error: "fal_image_fetch_failed" });
  }

  const imageBytes = new Uint8Array(await falImageResp.arrayBuffer());
  const imageMimeType =
    falImageResp.headers.get("content-type") ?? payload.tiledMimeType;
  const uploaded = await uploadImageToImageKit(
    `data:${imageMimeType};base64,${bytesToBase64(imageBytes)}`,
    `design-${workId}.png`,
    "/design-sessions",
  );

  const finalImageUrl = uploaded?.url ?? falImageUrl;

  await logGeneration(adminClient, {
    work_id: workId,
    phase: "render",
    user_id: user.id,
    ai_model: "openai",
    request_type: "render_standard",
    user_message: payload.userMessage,
    text_prompt: textPrompt,
    image_prompt: imagePrompt,
    ai_message: aiMessage,
    generate_image: true,
    eligible_for_render: true,
    image_generated: true,
    generated_image_url: finalImageUrl,
    text_latency_ms: textLatencyMs,
    image_latency_ms: imageLatencyMs,
    total_latency_ms: textLatencyMs + imageLatencyMs,
  });

  return jsonResponse(200, {
    aiMessage,
    imageUrl: finalImageUrl,
    workId,
    generateImage: true,
    eligibleForRender: true,
    missingRequirements: [],
    contextChips,
  });
});
