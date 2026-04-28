import "@supabase/functions-js/edge-runtime.d.ts";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
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
import { analyzeIntent } from "./analysis.ts";
import {
  chargeTileRenderTokens,
  refundTileRenderTokens,
  TILE_RENDER_REQUEST_TYPE,
} from "./billing.ts";
import { resolveFabricType } from "./fabric-type-resolver.ts";
import { generateTileImage } from "./image-generator.ts";
import {
  resolveAccentReferenceImageUrls,
  resolveEffectiveReferenceImageUsage,
  resolveRepeatReferenceImageUrls,
  shouldFallbackToPreviousAccentLayout,
  shouldReuseRepeatTile,
} from "./generation-plan.ts";
import { buildSuccessfulTileGenerationLogs } from "./log-plan.ts";
import { buildAccentPrompt, buildRepeatPrompt } from "./prompt-builder.ts";
import type { TileGenerationRequest, TileGenerationResponse } from "./types.ts";

const TILE_GENERATION_AI_MESSAGE = "타일 기반 디자인을 생성했습니다.";

function getLatestUserRequestAttachments(body: TileGenerationRequest) {
  for (let index = body.allMessages.length - 1; index >= 0; index -= 1) {
    const message = body.allMessages[index];
    if (message.role === "user" && message.attachments) {
      return sanitizeLogRequestAttachments(message.attachments);
    }
  }

  return null;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  const jsonResponse = createJsonResponse(corsHeaders);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const body = (await req.json()) as TileGenerationRequest;
    const authClient = createAuthenticatedSupabaseClient(authHeader);
    const adminClient = createAdminSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const fabricType = resolveFabricType(
      body.uiFabricType,
      body.userMessage,
      body.previousFabricType,
    );
    const requestAttachments = getLatestUserRequestAttachments(body);
    const renderWorkId = crypto.randomUUID();

    const baseLogFields = {
      work_id: renderWorkId,
      workflow_id: body.workflowId,
      phase: "render" as const,
      parent_work_id: null,
      user_id: user.id,
      ai_model: "openai" as const,
      request_type: TILE_RENDER_REQUEST_TYPE,
      quality: "standard" as const,
      user_message: body.userMessage,
      prompt_length: 0,
      request_attachments: requestAttachments,
      route: body.route,
    };
    const { data: tokenResult, error: tokenError } =
      await chargeTileRenderTokens(adminClient, {
        userId: user.id,
        workId: renderWorkId,
      });

    if (tokenError) {
      await logGeneration(adminClient, {
        ...baseLogFields,
        image_generated: false,
        tokens_charged: 0,
        tokens_refunded: 0,
        error_type: "token_processing_failed",
        error_message: tokenError.message,
      });
      return jsonResponse(500, { error: "token_processing_failed" });
    }

    if (!tokenResult?.success) {
      await logGeneration(adminClient, {
        ...baseLogFields,
        image_generated: false,
        tokens_charged: 0,
        tokens_refunded: 0,
        error_type: tokenResult?.error ?? "insufficient_tokens",
        error_message: tokenResult?.error ?? "Token deduction was rejected",
      });
      return jsonResponse(403, {
        error: "insufficient_tokens",
        balance: tokenResult?.balance ?? 0,
        cost: tokenResult?.cost ?? 0,
      });
    }

    const tokensCharged = tokenResult.cost;
    let tokensRefunded = 0;

    try {
      const analysis = await analyzeIntent(body);
      const fabricChanged =
        body.previousFabricType !== null &&
        body.previousFabricType !== fabricType;

      if (fabricChanged && analysis.editTarget !== "new") {
        analysis.editTarget = "both";
      }

      if (shouldFallbackToPreviousAccentLayout(analysis, body)) {
        analysis.accentLayout = body.previousAccentLayoutJson;
      }
      if (body.selectedColors?.[0]) {
        // Current UI allows one selected color and treats it as the background.
        // If color roles are added, pass role/intent metadata into analysis
        // instead of assuming selectedColors[0] is the background color.
        analysis.tileLayout.backgroundColor = body.selectedColors[0];
      }
      analysis.referenceImageUsage = resolveEffectiveReferenceImageUsage(
        analysis,
        body,
      );

      const selectedBackgroundColor = body.selectedColors?.[0] ?? null;
      const reuseRepeatTile = shouldReuseRepeatTile(
        analysis,
        body,
        selectedBackgroundColor,
      );
      const repeatReferenceImageUrls = resolveRepeatReferenceImageUrls(
        analysis,
        body,
      );
      const repeatPrompt = reuseRepeatTile
        ? null
        : buildRepeatPrompt(
            analysis.tileLayout,
            fabricType,
            analysis.referenceImageUsage,
            repeatReferenceImageUrls.length,
          );
      const accentBuilt =
        analysis.patternType === "one_point" && analysis.accentLayout
          ? buildAccentPrompt(
              analysis.accentLayout,
              analysis.tileLayout.backgroundColor,
              fabricType,
              resolveAccentReferenceImageUrls(analysis, body),
            )
          : null;
      const promptLength =
        (repeatPrompt?.length ?? 0) + (accentBuilt?.prompt.length ?? 0);
      const parentWorkId = reuseRepeatTile
        ? (body.previousAccentTileWorkId ??
          body.previousRepeatTileWorkId ??
          null)
        : (body.previousRepeatTileWorkId ?? null);
      const promptParts = [
        repeatPrompt ? `repeat_prompt:\n${repeatPrompt}` : null,
        accentBuilt ? `accent_prompt:\n${accentBuilt.prompt}` : null,
      ].filter((part): part is string => part !== null);
      const referenceImageCount =
        repeatReferenceImageUrls.length +
        (accentBuilt?.referenceImageUrls.length ?? 0);
      const renderLogFields = {
        ...baseLogFields,
        parent_work_id: parentWorkId,
        prompt_length: promptLength,
        image_prompt: promptParts.length > 0 ? promptParts.join("\n\n") : null,
        normalized_design: {
          ...analysis,
          attachedImageCount: body.attachedImageUrls.length,
          repeatReferenceImageCount: repeatReferenceImageUrls.length,
          accentReferenceImageCount:
            accentBuilt?.referenceImageUrls.length ?? 0,
          imageEndpoint: referenceImageCount > 0 ? "edits" : "generations",
        } as Record<string, unknown>,
        has_reference_image: referenceImageCount > 0,
        has_previous_image:
          body.previousRepeatTileUrl !== null ||
          body.previousAccentTileUrl !== null,
      };

      let reusableRepeatTile: { url: string; workId: string } | null = null;
      if (reuseRepeatTile) {
        const previousRepeatTileUrl = body.previousRepeatTileUrl;
        const previousRepeatTileWorkId = body.previousRepeatTileWorkId;
        if (previousRepeatTileUrl == null || previousRepeatTileWorkId == null) {
          const missingFields = [
            previousRepeatTileUrl == null ? "previousRepeatTileUrl" : null,
            previousRepeatTileWorkId == null
              ? "previousRepeatTileWorkId"
              : null,
          ].filter((value): value is string => value !== null);
          throw new Error(
            `reuseRepeatTile missing required field(s): ${missingFields.join(
              ", ",
            )}`,
          );
        }
        reusableRepeatTile = {
          url: previousRepeatTileUrl,
          workId: previousRepeatTileWorkId,
        };
      }

      const [repeatResult, accentResult] = await Promise.all([
        reusableRepeatTile
          ? Promise.resolve(reusableRepeatTile)
          : generateTileImage(
              repeatPrompt as string,
              repeatReferenceImageUrls,
              renderWorkId,
            ),
        accentBuilt
          ? generateTileImage(
              accentBuilt.prompt,
              accentBuilt.referenceImageUrls,
              reuseRepeatTile ? renderWorkId : undefined,
            )
          : Promise.resolve(null),
      ]);

      const primaryResult =
        reuseRepeatTile && accentResult ? accentResult : repeatResult;
      const representativeResult = primaryResult;

      try {
        const generationLogs = buildSuccessfulTileGenerationLogs({
          baseLog: renderLogFields,
          repeatResult,
          accentResult,
          primaryWorkId: primaryResult.workId,
          tokensCharged,
          tokensRefunded,
          patternType: analysis.patternType,
          fabricType,
          accentLayout: analysis.accentLayout,
          reusedRepeatTile: reuseRepeatTile,
        });
        for (const generationLog of generationLogs) {
          await logGeneration(adminClient, generationLog, {
            requireSuccess: true,
          });
        }
      } catch (error) {
        console.error("generate-tile logGeneration failed:", {
          workId: primaryResult.workId,
          error,
        });
        return jsonResponse(500, { error: "persistence_failed" });
      }

      try {
        await saveDesignSession(
          authClient,
          {
            sessionId: body.sessionId,
            aiModel: "openai",
            firstMessage: body.firstMessage,
            repeatTileUrl: repeatResult.url,
            repeatTileWorkId: repeatResult.workId,
            accentTileUrl: accentResult?.url ?? null,
            accentTileWorkId: accentResult?.workId ?? null,
            accentLayout: analysis.accentLayout
              ? (analysis.accentLayout as unknown as Record<string, unknown>)
              : null,
            patternType: analysis.patternType,
            fabricType,
            messages: buildSessionMessages(body.allMessages, {
              id: crypto.randomUUID(),
              role: "ai",
              content: TILE_GENERATION_AI_MESSAGE,
              image_url: representativeResult.url,
              image_file_id: null,
              attachments: null,
              sequence_number: body.allMessages.length,
            } satisfies SessionMessage),
          },
          { requireSuccess: true },
        );
      } catch (error) {
        console.error("generate-tile saveDesignSession failed:", {
          workId: primaryResult.workId,
          error,
        });
        return jsonResponse(500, { error: "persistence_failed" });
      }

      const result: TileGenerationResponse = {
        repeatTileUrl: repeatResult.url,
        repeatTileWorkId: repeatResult.workId,
        accentTileUrl: accentResult?.url ?? null,
        accentTileWorkId: accentResult?.workId ?? null,
        patternType: analysis.patternType,
        fabricType,
        accentLayout: analysis.accentLayout,
      };

      return jsonResponse(200, result as unknown as Record<string, unknown>);
    } catch (error) {
      const refunded = await refundTileRenderTokens(adminClient, {
        userId: user.id,
        amount: tokensCharged,
        workId: `${renderWorkId}_tile_failed_refund`,
      });
      if (refunded === "succeeded") {
        tokensRefunded = tokensCharged;
      }

      await logGeneration(adminClient, {
        ...baseLogFields,
        work_id: renderWorkId,
        generate_image: true,
        image_generated: false,
        tokens_charged: tokensCharged,
        tokens_refunded: tokensRefunded,
        fabric_type: fabricType,
        error_type: "tile_generation_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      });

      return jsonResponse(500, { error: "tile_generation_failed" });
    }
  } catch (error) {
    console.error("generate-tile error:", error);
    return jsonResponse(500, { error: "internal_error" });
  }
});
