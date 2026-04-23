import "@supabase/functions-js/edge-runtime.d.ts";

import {
  determineEligibility,
  getExecutionMode,
  HttpError,
  loadAnalysisSnapshot,
} from "@/functions/_shared/design-generation.ts";
import type { GenerateDesignRequest } from "@/functions/_shared/design-request.ts";
import {
  callFalFluxControlNet,
  callFalFluxFill,
  callFalFluxImg2Img,
  callFalFluxIpAdapter,
  callFalNanoBananaEdit,
  callFalReferenceToIpAdapterWorkflow,
} from "@/functions/_shared/fal-client.ts";
import { validateFalGeneratePayload } from "@/functions/_shared/fal-request-validation.ts";
import {
  buildPlacedPreviewArtifacts,
  buildAllowedInpaintBaseImageHosts,
  buildFalErrorResponseBody,
  getGenerationLogUserMessage,
  getTrustedFalImageUrl,
  inspectRemoteInpaintImage,
  parseValidatedInpaintDataUri,
  recordFinalRenderArtifacts,
  recordOptionalRenderArtifacts,
  type RecordRenderArtifactInput,
  shouldExecuteFalRender,
  validateRemoteInpaintBaseImageUrl,
} from "@/functions/_shared/generate-fal-api-utils.ts";
import {
  createArtifactRowRpcRecorder,
  saveGenerationArtifact,
  type SaveGenerationArtifactResult,
} from "@/functions/_shared/generation-artifacts.ts";
import { planFalRender } from "@/functions/_shared/generate-fal-render-plan.ts";
import { uploadImageToImageKit } from "@/functions/_shared/imagekit-upload.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import { createLogger } from "@/functions/_shared/logger.ts";
import {
  buildFabricPrompt,
  buildFalPatternPrompt,
  buildImageEditPrompt,
  buildTextPrompt,
  parseJsonBlock,
  SYSTEM_PROMPT,
} from "@/functions/_shared/prompt-builders.ts";
import { resolveRenderCapability } from "@/functions/_shared/render-capability.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  buildSessionMessages,
  saveDesignSession,
  type SessionMessage,
} from "@/functions/_shared/session-save.ts";
import { sanitizeLogRequestAttachments } from "@/functions/_shared/request-attachments.ts";
import {
  createAdminSupabaseClient,
  createAuthenticatedSupabaseClient,
} from "@/functions/_shared/supabase-clients.ts";
import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { bytesToBase64 } from "@/functions/_shared/color.ts";
import { prepareControlImage } from "@/functions/_shared/preprocessing/control-image.ts";
import { maybeUpscaleReference } from "@/functions/_shared/preprocessing/upscale.ts";
import { uploadGeneratedImageToSupabaseStorage } from "@/functions/_shared/supabase-storage-fallback.ts";

type OpenAITextResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const { processLogger, errorLogger } = createLogger("generate-fal-api");

const ANALYSIS_REQUEST_TYPE = "analysis" as const;
const RENDER_REQUEST_TYPE = "render_standard" as const;
const ANALYSIS_AI_MODEL = "openai" as const;
const RENDER_AI_MODEL = "fal" as const;
const OPENAI_TIMEOUT_MS = 60_000;
const DEFAULT_FAL_ROUTE = "fal_tiling" as const;

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
  imageWorkId: string | null,
) => {
  if (!payload.sessionId || !Array.isArray(payload.allMessages)) {
    return;
  }

  await saveDesignSession(supabase, {
    sessionId: payload.sessionId,
    aiModel: "fal",
    firstMessage: payload.firstMessage ?? "",
    lastImageUrl: imageUrl,
    lastImageFileId: imageFileId,
    lastImageWorkId: imageWorkId,
    messages: buildSessionMessages(payload.allMessages, {
      id: crypto.randomUUID(),
      role: "ai",
      content: aiMessage,
      image_url: imageUrl,
      image_file_id: imageFileId,
      attachments: null,
      sequence_number: payload.allMessages.length,
    } satisfies SessionMessage),
  });
};

const toDataUri = (base64: string, mimeType: string): string =>
  `data:${mimeType};base64,${base64}`;

const readImageAsBase64 = async (
  imageUrl: string,
  allowedHosts: readonly string[],
): Promise<{
  base64: string;
  mimeType: string;
}> => {
  const dataUri = parseValidatedInpaintDataUri(imageUrl);
  if (dataUri) {
    return dataUri;
  }

  const inspectedImage = await inspectRemoteInpaintImage(imageUrl, {
    allowedHosts,
    timeoutMs: OPENAI_TIMEOUT_MS,
  });

  const response = await fetch(inspectedImage.url, {
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
    redirect: "error",
  });

  if (!response.ok) {
    throw new Error(`Base image fetch failed: ${response.status}`);
  }

  const finalImageUrl = validateRemoteInpaintBaseImageUrl(
    response.url || inspectedImage.url,
    allowedHosts,
  );
  if (!finalImageUrl) {
    throw new Error("Base image fetch failed: redirected_to_untrusted_host");
  }

  const mimeType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    inspectedImage.mimeType;
  const bytes = new Uint8Array(await response.arrayBuffer());

  return {
    base64: bytesToBase64(bytes),
    mimeType,
  };
};

const toDeterministicSeed = (value: string): number => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) || 1;
};

export const handleRequest = async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);
  const url = new URL(req.url);
  const isFalPipelineDisabled =
    Deno.env.get("FAL_PIPELINE_DISABLED") === "true";

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (
    req.method === "GET" &&
    url.pathname.endsWith("/should-use-fal-pipeline")
  ) {
    return jsonResponse(200, {
      enabled: !isFalPipelineDisabled,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (isFalPipelineDisabled) {
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

  const executionMode = getExecutionMode(payload);
  const payloadUserMessage =
    typeof payload.userMessage === "string" ? payload.userMessage : "";
  const validation = validateFalGeneratePayload(payload, executionMode);
  if (!validation.ok) {
    return jsonResponse(validation.status, validation.body);
  }
  const attachmentLogFields = {
    request_attachments: sanitizeLogRequestAttachments(payload.attachments),
  } as const;
  const patternPreparationLogFields = {
    pattern_preparation_backend:
      payload.patternPreparation?.preparationBackend ?? null,
    pattern_repair_prompt_kind:
      payload.patternPreparation?.repairPromptKind ?? null,
    pattern_repair_applied: payload.patternPreparation?.repairApplied ?? null,
    pattern_repair_reason_codes:
      payload.patternPreparation?.reasonCodes ?? null,
    prep_tokens_charged: payload.patternPreparation?.prepTokensCharged ?? null,
  } as const;

  let analysisSnapshot = null;
  if (executionMode === "render_from_analysis") {
    const requestedAnalysisWorkId = (payload.analysisWorkId ?? "").trim();
    try {
      analysisSnapshot = await loadAnalysisSnapshot(
        adminClient,
        user.id,
        requestedAnalysisWorkId,
      );
    } catch (error) {
      if (error instanceof HttpError) {
        return jsonResponse(error.status, error.body);
      }

      errorLogger("analysis_snapshot_load_failed", error, {
        analysisWorkId: requestedAnalysisWorkId,
        userId: user.id,
        route: payload.route ?? DEFAULT_FAL_ROUTE,
      });
      await logGeneration(adminClient, {
        work_id: requestedAnalysisWorkId,
        workflow_id: requestedAnalysisWorkId,
        phase: "render",
        user_id: user.id,
        ai_model: RENDER_AI_MODEL,
        request_type: RENDER_REQUEST_TYPE,
        route: payload.route ?? DEFAULT_FAL_ROUTE,
        route_reason: payload.routeReason ?? null,
        route_signals: payload.routeSignals ?? [],
        base_image_work_id: payload.baseImageWorkId ?? null,
        ...patternPreparationLogFields,
        ...attachmentLogFields,
        user_message: payloadUserMessage,
        prompt_length: payloadUserMessage.length,
        image_generated: false,
        error_type: "analysis_snapshot_load_failed",
        error_message: error instanceof Error ? error.message : String(error),
      });
      return jsonResponse(500, { error: "analysis_snapshot_load_failed" });
    }
  }

  const route = payload.route ?? DEFAULT_FAL_ROUTE;
  const routeLogFields = {
    route,
    route_reason: payload.routeReason ?? null,
    route_signals: payload.routeSignals ?? [],
    base_image_work_id: payload.baseImageWorkId ?? null,
  } as const;

  const workId = analysisSnapshot?.workflowId ?? crypto.randomUUID();
  const analysisWorkId =
    analysisSnapshot?.analysisWorkId ?? `${workId}_analysis`;
  const renderWorkId = `${workId}_render`;
  const renderSeed =
    route === "fal_edit"
      ? (payload.seed ??
        toDeterministicSeed(
          payload.baseImageWorkId ?? payload.baseImageUrl ?? workId,
        ))
      : null;
  const textPrompt = analysisSnapshot?.textPrompt ?? buildTextPrompt(payload);
  const {
    userMessage: userMessageForLog,
    promptLength: userMessagePromptLength,
  } = getGenerationLogUserMessage({
    payloadUserMessage,
    analysisUserMessage: analysisSnapshot?.userMessage,
  });
  const userMessageLogFields = {
    user_message: userMessageForLog,
    prompt_length: userMessagePromptLength,
  } as const;
  const history = validation.conversationHistory;
  const textStart =
    executionMode === "render_from_analysis" ? null : Date.now();
  let analysisTokensCharged = 0;
  let analysisTokensRefunded = 0;
  let textLatencyMs: number | null = null;
  let aiMessage = "";
  let generateImage = false;
  let contextChips: unknown[] = [];
  let eligibility: ReturnType<typeof determineEligibility>;

  if (analysisSnapshot) {
    aiMessage = analysisSnapshot.aiMessage;
    generateImage = analysisSnapshot.generateImage;
    eligibility = {
      eligibleForRender: analysisSnapshot.eligibleForRender,
      missingRequirements: analysisSnapshot.missingRequirements,
      eligibilityReason: analysisSnapshot.eligibilityReason,
    };
  } else {
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
        ...routeLogFields,
        ...attachmentLogFields,
        ...userMessageLogFields,
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
        ...routeLogFields,
        ...attachmentLogFields,
        ...userMessageLogFields,
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
      const textResp = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
          signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
        },
      );

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
        workId: `${analysisWorkId}_failed_refund`,
      });

      await logGeneration(adminClient, {
        work_id: analysisWorkId,
        workflow_id: workId,
        phase: "analysis",
        user_id: user.id,
        ai_model: ANALYSIS_AI_MODEL,
        request_type: ANALYSIS_REQUEST_TYPE,
        ...routeLogFields,
        ...attachmentLogFields,
        ...userMessageLogFields,
        text_prompt: textPrompt,
        image_generated: false,
        tokens_charged: analysisTokensCharged,
        tokens_refunded: analysisTokensRefunded,
        error_type: "text_analysis_failed",
        error_message: error instanceof Error ? error.message : String(error),
      });

      return jsonResponse(500, { error: "text_analysis_failed" });
    }

    textLatencyMs = textStart === null ? null : Date.now() - textStart;
    aiMessage =
      typeof analysisJson.aiMessage === "string" ? analysisJson.aiMessage : "";
    generateImage = analysisJson.generateImage === true;
    contextChips = Array.isArray(analysisJson.contextChips)
      ? analysisJson.contextChips
      : [];
    eligibility = determineEligibility(
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
      ...routeLogFields,
      ...attachmentLogFields,
      ...userMessageLogFields,
      text_prompt: textPrompt,
      ai_message: aiMessage,
      generate_image: generateImage,
      eligible_for_render: eligibility.eligibleForRender,
      missing_requirements: eligibility.missingRequirements,
      eligibility_reason: eligibility.eligibilityReason,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      tokens_charged: analysisTokensCharged,
      tokens_refunded: analysisTokensRefunded,
    });
  }

  const analysisResponseBody = {
    aiMessage,
    imageUrl: null,
    workId: analysisWorkId,
    workflowId: workId,
    analysisWorkId,
    route,
    routeSignals: payload.routeSignals ?? [],
    routeReason: payload.routeReason ?? null,
    falRequestId: null,
    seed: renderSeed,
    generateImage: false,
    eligibleForRender: eligibility.eligibleForRender,
    eligibilityReason: eligibility.eligibilityReason,
    missingRequirements: eligibility.missingRequirements,
    contextChips,
  };

  if (!shouldExecuteFalRender(generateImage, eligibility)) {
    if (analysisSnapshot) {
      return jsonResponse(409, {
        error: "analysis_not_renderable",
        ...analysisResponseBody,
      });
    }

    await saveSessionIfNeeded(supabase, payload, aiMessage, null, null, null);
    return jsonResponse(200, analysisResponseBody);
  }

  const imagePrompt =
    route === "fal_tiling" || route === "fal_controlnet"
      ? (analysisSnapshot?.imagePrompt ??
        buildFalPatternPrompt({
          colors: payload.designContext?.colors ?? [],
          pattern: payload.designContext?.pattern ?? null,
          fabricMethod: payload.designContext?.fabricMethod ?? null,
          ciPlacement: payload.designContext?.ciPlacement ?? null,
          scale: payload.designContext?.scale ?? null,
        }))
      : null;
  const imageEditPrompt =
    route === "fal_edit"
      ? (analysisSnapshot?.imageEditPrompt ?? buildImageEditPrompt(payload))
      : null;
  const imageInpaintPrompt =
    route === "fal_inpaint"
      ? `${buildFabricPrompt(payload.designContext?.fabricMethod)} ${
          payload.editPrompt ?? ""
        }`.trim()
      : null;

  const imageStart = Date.now();
  let falImageUrl: string;
  let falRequestId: string | null = null;
  let renderBackend:
    | "ip_adapter"
    | "img2img"
    | "nano_banana_edit"
    | "controlnet"
    | "flux_fill"
    | null = route === "fal_edit" ? "nano_banana_edit" : null;
  let renderTokensCharged = 0;
  let renderTokensRefunded = 0;
  const allowedInpaintBaseImageHosts = buildAllowedInpaintBaseImageHosts({
    supabaseUrl: Deno.env.get("SUPABASE_URL"),
    imagekitUrlEndpoint:
      Deno.env.get("IMAGEKIT_URL_ENDPOINT") ??
      Deno.env.get("VITE_IMAGEKIT_URL_ENDPOINT"),
  });

  const { data: renderTokenResult, error: renderTokenError } =
    await adminClient.rpc("use_design_tokens", {
      p_user_id: user.id,
      p_ai_model: RENDER_AI_MODEL,
      p_request_type: RENDER_REQUEST_TYPE,
      p_work_id: renderWorkId,
    });

  if (renderTokenError) {
    await saveSessionIfNeeded(supabase, payload, aiMessage, null, null, null);

    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      ...routeLogFields,
      ...patternPreparationLogFields,
      ...attachmentLogFields,
      ...userMessageLogFields,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      image_edit_prompt: imageEditPrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      missing_requirements: eligibility.missingRequirements,
      eligibility_reason: eligibility.eligibilityReason,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      error_type: "token_processing_failed",
      error_message: renderTokenError.message,
    });
    return jsonResponse(500, {
      error: "token_processing_failed",
      ...analysisResponseBody,
    });
  }

  if (!renderTokenResult?.success) {
    await saveSessionIfNeeded(supabase, payload, aiMessage, null, null, null);

    await logGeneration(adminClient, {
      work_id: renderWorkId,
      workflow_id: workId,
      phase: "render",
      parent_work_id: analysisWorkId,
      user_id: user.id,
      ai_model: RENDER_AI_MODEL,
      request_type: RENDER_REQUEST_TYPE,
      ...routeLogFields,
      ...patternPreparationLogFields,
      ...attachmentLogFields,
      ...userMessageLogFields,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      image_edit_prompt: imageEditPrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      missing_requirements: eligibility.missingRequirements,
      eligibility_reason: eligibility.eligibilityReason,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      error_type: renderTokenResult?.error ?? "insufficient_tokens",
      error_message: renderTokenResult?.error ?? "Token deduction was rejected",
    });
    return jsonResponse(403, {
      error: "insufficient_tokens",
      balance: renderTokenResult?.balance ?? 0,
      cost: renderTokenResult?.cost ?? 0,
      ...analysisResponseBody,
    });
  }

  renderTokensCharged = renderTokenResult.cost ?? 0;
  const recordRenderArtifact = async (
    input: RecordRenderArtifactInput,
  ): Promise<SaveGenerationArtifactResult | null> => {
    try {
      return await saveGenerationArtifact(
        {
          workflowId: workId,
          phase: "render",
          artifactType: input.artifactType,
          sourceWorkId: renderWorkId,
          parentArtifactId: input.parentArtifactId ?? null,
          image: input.image,
          meta: input.meta,
        },
        {
          recordArtifactRow: createArtifactRowRpcRecorder(adminClient),
        },
      );
    } catch (error) {
      errorLogger("artifact_record_failed", error, {
        workId,
        renderWorkId,
        artifactType: input.artifactType,
      });
      return null;
    }
  };
  await recordOptionalRenderArtifacts(recordRenderArtifact, {
    ...buildPlacedPreviewArtifacts({
      ciPlacement: payload.designContext?.ciPlacement ?? null,
      tiledBase64: payload.tiledBase64,
      tiledMimeType: payload.tiledMimeType,
    }),
  });

  try {
    if (route === "fal_edit") {
      if (!payload.baseImageUrl || !imageEditPrompt) {
        throw new Error(
          "fal_edit route requires baseImageUrl and imageEditPrompt",
        );
      }
      await recordRenderArtifact({
        artifactType: "fal_input_preview",
        image: {
          kind: "url",
          url: payload.baseImageUrl,
        },
      });

      const editImageUrls = [
        payload.baseImageUrl,
        ...(payload.ciImageBase64
          ? [
              toDataUri(
                payload.ciImageBase64,
                payload.ciImageMimeType ?? "image/png",
              ),
            ]
          : []),
      ];

      const falResult = await callFalNanoBananaEdit({
        imageUrls: editImageUrls,
        prompt: imageEditPrompt,
        seed: renderSeed ?? undefined,
        apiKey: falApiKey,
      });
      falImageUrl = falResult.imageUrl;
      falRequestId = falResult.requestId;
    } else if (route === "fal_controlnet") {
      if (!imagePrompt) {
        throw new Error("fal_controlnet route requires imagePrompt");
      }

      const sourceBase64 = payload.structureImageBase64 ?? payload.tiledBase64;
      const sourceMimeType =
        payload.structureImageMimeType ?? payload.tiledMimeType;

      if (!sourceBase64 || !sourceMimeType) {
        throw new Error(
          "fal_controlnet requires structureImageBase64 or tiledBase64",
        );
      }
      const controlImage = await prepareControlImage({
        base64: sourceBase64,
        mimeType: sourceMimeType,
        controlType: payload.controlType ?? "lineart",
        apiKey: falApiKey,
      });
      await recordOptionalRenderArtifacts(recordRenderArtifact, {
        falInputBase64: sourceBase64,
        falInputMimeType: sourceMimeType,
        controlImageBase64: controlImage.base64,
        controlImageMimeType: controlImage.mimeType,
      });
      const preset = resolveRenderCapability(
        payload.designContext?.fabricMethod ?? null,
      );

      renderBackend = "controlnet";
      const falResult = await callFalFluxControlNet({
        controlImageBase64: controlImage.base64,
        controlImageMimeType: controlImage.mimeType,
        prompt: imagePrompt,
        controlType: payload.controlType ?? "lineart",
        conditioningScale: preset?.controlNetConditioningScale,
        apiKey: falApiKey,
      });
      falImageUrl = falResult.imageUrl;
      falRequestId = falResult.requestId;
    } else if (route === "fal_inpaint") {
      if (!imageInpaintPrompt) {
        throw new Error("fal_inpaint route requires imageInpaintPrompt");
      }

      const baseImageBase64 = payload.baseImageBase64?.trim();
      const baseImageMimeType = payload.baseImageMimeType?.trim();
      const baseImage =
        baseImageBase64 && baseImageMimeType
          ? {
              base64: baseImageBase64,
              mimeType: baseImageMimeType,
            }
          : payload.baseImageUrl
            ? await readImageAsBase64(
                payload.baseImageUrl,
                allowedInpaintBaseImageHosts,
              )
            : null;

      if (!baseImage || !payload.maskBase64 || !payload.maskMimeType) {
        throw new Error(
          "fal_inpaint route requires base image and mask payload",
        );
      }
      await recordOptionalRenderArtifacts(recordRenderArtifact, {
        falInputBase64: baseImage.base64,
        falInputMimeType: baseImage.mimeType,
        inpaintBaseBase64: baseImage.base64,
        inpaintBaseMimeType: baseImage.mimeType,
        inpaintMaskBase64: payload.maskBase64,
        inpaintMaskMimeType: payload.maskMimeType,
      });

      renderBackend = "flux_fill";
      const falResult = await callFalFluxFill({
        imageBase64: baseImage.base64,
        imageMimeType: baseImage.mimeType,
        maskBase64: payload.maskBase64,
        maskMimeType: payload.maskMimeType,
        prompt: imageInpaintPrompt,
        apiKey: falApiKey,
      });
      falImageUrl = falResult.imageUrl;
      falRequestId = falResult.requestId;
    } else {
      const initialRenderPlan = planFalRender(payload, null);
      const workflowEnabled =
        Deno.env.get("FAL_REFERENCE_WORKFLOW_ENABLED") === "true";
      const referenceImageBase64 = payload.referenceImageBase64;
      if (
        !workflowEnabled &&
        initialRenderPlan.shouldUpscaleReference &&
        !referenceImageBase64
      ) {
        throw new Error("reference upscaling requires referenceImageBase64");
      }
      let processedReference = null;
      if (!workflowEnabled && initialRenderPlan.shouldUpscaleReference) {
        const upscaleReferenceBase64 = referenceImageBase64;
        if (!upscaleReferenceBase64) {
          throw new Error("reference upscaling requires referenceImageBase64");
        }
        processedReference = await maybeUpscaleReference({
          base64: upscaleReferenceBase64,
          mimeType: payload.referenceImageMimeType ?? "image/png",
          apiKey: falApiKey,
        });
        await recordOptionalRenderArtifacts(recordRenderArtifact, {
          upscaledReferenceBase64: processedReference.upscaled
            ? processedReference.base64
            : null,
          upscaledReferenceMimeType: processedReference.upscaled
            ? processedReference.mimeType
            : null,
        });
      }

      const renderPlan = planFalRender(payload, processedReference);

      if (renderPlan.isA2Scenario) {
        if (!imagePrompt) {
          throw new Error("ip_adapter render requires imagePrompt");
        }

        renderBackend = renderPlan.renderBackend;

        if (workflowEnabled) {
          if (!referenceImageBase64) {
            throw new Error("workflow render requires referenceImageBase64");
          }
          await recordOptionalRenderArtifacts(recordRenderArtifact, {
            falInputBase64: referenceImageBase64,
            falInputMimeType: payload.referenceImageMimeType ?? "image/png",
          });

          const falResult = await callFalReferenceToIpAdapterWorkflow({
            referenceBase64: referenceImageBase64,
            referenceMimeType: payload.referenceImageMimeType ?? "image/png",
            prompt: imagePrompt,
            apiKey: falApiKey,
          });
          falImageUrl = falResult.imageUrl;
          falRequestId = falResult.requestId;
        } else if (processedReference === null) {
          throw new Error("ip_adapter render requires processed reference");
        } else {
          await recordOptionalRenderArtifacts(recordRenderArtifact, {
            falInputBase64: processedReference.base64,
            falInputMimeType: processedReference.mimeType,
          });
          const falResult = await callFalFluxIpAdapter({
            referenceBase64: processedReference.base64,
            referenceMimeType: processedReference.mimeType,
            prompt: imagePrompt,
            apiKey: falApiKey,
          });
          falImageUrl = falResult.imageUrl;
          falRequestId = falResult.requestId;
        }
      } else if (
        !payload.tiledBase64 ||
        !payload.tiledMimeType ||
        !imagePrompt
      ) {
        throw new Error(
          "fal_tiling route requires tiled image input and imagePrompt",
        );
      } else {
        renderBackend = renderPlan.renderBackend;
        await recordOptionalRenderArtifacts(recordRenderArtifact, {
          falInputBase64: payload.tiledBase64,
          falInputMimeType: payload.tiledMimeType,
        });
        const preset = resolveRenderCapability(
          payload.designContext?.fabricMethod ?? null,
        );
        const falResult = await callFalFluxImg2Img({
          imageBase64: payload.tiledBase64,
          imageMimeType: payload.tiledMimeType,
          prompt: imagePrompt,
          strength: preset?.img2imgStrength,
          apiKey: falApiKey,
        });
        falImageUrl = falResult.imageUrl;
        falRequestId = falResult.requestId;
      }
    }
  } catch (error) {
    renderTokensRefunded = await tryRefund(adminClient, {
      userId: user.id,
      amount: renderTokensCharged,
      aiModel: RENDER_AI_MODEL,
      requestType: RENDER_REQUEST_TYPE,
      workId: `${renderWorkId}_failed_refund`,
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
      ...routeLogFields,
      ...patternPreparationLogFields,
      ...attachmentLogFields,
      ...userMessageLogFields,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      image_edit_prompt: imageEditPrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      missing_requirements: eligibility.missingRequirements,
      eligibility_reason: eligibility.eligibilityReason,
      fal_request_id: falRequestId,
      render_backend: renderBackend,
      seed: renderSeed,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      tokens_charged: renderTokensCharged,
      tokens_refunded: renderTokensRefunded,
      error_type: "fal_render_failed",
      error_message: error instanceof Error ? error.message : String(error),
    });

    return jsonResponse(
      500,
      buildFalErrorResponseBody("fal_render_failed", analysisResponseBody),
    );
  }

  const imageLatencyMs = Date.now() - imageStart;
  let finalImageUrl = falImageUrl;
  let finalImageFileId: string | null = null;
  let errorCode: "fal_image_fetch_failed" | "image_upload_failed" | null = null;
  let falRawImageBytes: Uint8Array | null = null;
  let falRawImageMimeType: string | null = null;

  try {
    let imageBytes: Uint8Array;
    let imageMimeType: string;

    try {
      const trustedFalImageUrl = getTrustedFalImageUrl(falImageUrl);
      if (!trustedFalImageUrl) {
        processLogger("fal_image_fetch_invalid_url", {
          workId,
          renderWorkId,
          falImageUrl,
        });
        throw new Error("Invalid Fal image URL");
      }

      processLogger("fal_image_fetch_start", { workId, renderWorkId });
      const falImageResp = await fetch(trustedFalImageUrl, {
        signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
      });
      if (!falImageResp.ok) {
        throw new Error(`Fal image fetch failed: ${falImageResp.status}`);
      }

      imageBytes = new Uint8Array(await falImageResp.arrayBuffer());
      imageMimeType =
        falImageResp.headers.get("content-type") ??
        payload.tiledMimeType ??
        "image/png";
      falRawImageBytes = imageBytes;
      falRawImageMimeType = imageMimeType;
    } catch (error) {
      errorCode = "fal_image_fetch_failed";
      if (
        !(error instanceof Error && error.message === "Invalid Fal image URL")
      ) {
        processLogger("fal_image_fetch_error", {
          workId,
          renderWorkId,
          falImageUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error("Fal image fetch timed out");
      }

      if (error instanceof Error) {
        throw error.message.startsWith("Fal image fetch")
          ? error
          : new Error(`Fal image fetch failed: ${error.message}`);
      }

      throw new Error(`Fal image fetch failed: ${String(error)}`);
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

    if (uploaded?.url) {
      finalImageUrl = uploaded.url;
      finalImageFileId = uploaded.fileId;
    } else if (
      Deno.env.get("PERSIST_FAL_URL_FALLBACK_TO_SUPABASE_STORAGE") === "true"
    ) {
      const fallbackUpload = await uploadGeneratedImageToSupabaseStorage(
        adminClient,
        {
          bytes: imageBytes,
          mimeType: imageMimeType,
          workId,
        },
      );

      finalImageUrl = fallbackUpload?.url ?? falImageUrl;
      finalImageFileId = null;
    } else {
      finalImageUrl = falImageUrl;
      finalImageFileId = null;
    }

    if (falRawImageBytes && falRawImageMimeType) {
      await recordFinalRenderArtifacts(recordRenderArtifact, {
        falImageUrl,
        finalImageUrl,
        falRequestId,
        renderBackend,
      });
    }
  } catch (error) {
    renderTokensRefunded = await tryRefund(adminClient, {
      userId: user.id,
      amount: renderTokensCharged,
      aiModel: RENDER_AI_MODEL,
      requestType: RENDER_REQUEST_TYPE,
      workId: `${renderWorkId}_failed_refund`,
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
      ...routeLogFields,
      ...patternPreparationLogFields,
      ...attachmentLogFields,
      ...userMessageLogFields,
      text_prompt: textPrompt,
      image_prompt: imagePrompt,
      image_edit_prompt: imageEditPrompt,
      ai_message: aiMessage,
      generate_image: true,
      eligible_for_render: eligibility.eligibleForRender,
      missing_requirements: eligibility.missingRequirements,
      eligibility_reason: eligibility.eligibilityReason,
      fal_request_id: falRequestId,
      render_backend: renderBackend,
      seed: renderSeed,
      image_generated: false,
      text_latency_ms: textLatencyMs,
      image_latency_ms: imageLatencyMs,
      total_latency_ms:
        textLatencyMs !== null ? textLatencyMs + imageLatencyMs : null,
      tokens_charged: renderTokensCharged,
      tokens_refunded: renderTokensRefunded,
      error_type: resolvedErrorCode,
      error_message: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse(
      500,
      buildFalErrorResponseBody(resolvedErrorCode, analysisResponseBody),
    );
  }

  await logGeneration(adminClient, {
    work_id: renderWorkId,
    workflow_id: workId,
    phase: "render",
    parent_work_id: analysisWorkId,
    user_id: user.id,
    ai_model: RENDER_AI_MODEL,
    request_type: RENDER_REQUEST_TYPE,
    ...routeLogFields,
    ...patternPreparationLogFields,
    ...attachmentLogFields,
    ...userMessageLogFields,
    text_prompt: textPrompt,
    image_prompt: imagePrompt,
    image_edit_prompt: imageEditPrompt,
    ai_message: aiMessage,
    generate_image: true,
    eligible_for_render: eligibility.eligibleForRender,
    missing_requirements: eligibility.missingRequirements,
    eligibility_reason: eligibility.eligibilityReason,
    fal_request_id: falRequestId,
    render_backend: renderBackend,
    seed: renderSeed,
    image_generated: true,
    generated_image_url: finalImageUrl,
    text_latency_ms: textLatencyMs,
    image_latency_ms: imageLatencyMs,
    total_latency_ms:
      textLatencyMs !== null ? textLatencyMs + imageLatencyMs : null,
    tokens_charged: renderTokensCharged,
    tokens_refunded: renderTokensRefunded,
  });

  await saveSessionIfNeeded(
    supabase,
    payload,
    aiMessage,
    finalImageUrl,
    finalImageFileId,
    renderWorkId,
  );

  return jsonResponse(200, {
    aiMessage,
    imageUrl: finalImageUrl,
    workId: renderWorkId,
    workflowId: workId,
    analysisWorkId,
    route,
    routeSignals: payload.routeSignals ?? [],
    routeReason: payload.routeReason ?? null,
    falRequestId,
    seed: renderSeed,
    generateImage: true,
    eligibleForRender: eligibility.eligibleForRender,
    eligibilityReason: eligibility.eligibilityReason,
    missingRequirements: eligibility.missingRequirements,
    contextChips,
  });
};

if (import.meta.main) {
  Deno.serve(handleRequest);
}
