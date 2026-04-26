import "@supabase/functions-js/edge-runtime.d.ts";

import { getCorsHeaders } from "@/functions/_shared/cors.ts";
import { logGeneration } from "@/functions/_shared/log-generation.ts";
import { createJsonResponse } from "@/functions/_shared/response.ts";
import {
  buildSessionMessages,
  saveDesignSession,
  type SessionMessage,
} from "@/functions/_shared/session-save.ts";
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
  resolveAccentReferenceImageUrl,
  shouldFallbackToPreviousAccentLayout,
  shouldReuseRepeatTile,
} from "./generation-plan.ts";
import { buildAccentPrompt, buildRepeatPrompt } from "./prompt-builder.ts";
import type { TileGenerationRequest, TileGenerationResponse } from "./types.ts";

const TILE_GENERATION_AI_MESSAGE = "타일 기반 디자인을 생성했습니다.";

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
    const renderWorkId = crypto.randomUUID();

    const [analysis, { data: tokenResult, error: tokenError }] =
      await Promise.all([
        analyzeIntent(body),
        chargeTileRenderTokens(adminClient, {
          userId: user.id,
          workId: renderWorkId,
        }),
      ]);

    const fabricChanged =
      body.previousFabricType !== null &&
      body.previousFabricType !== fabricType;

    if (fabricChanged && analysis.editTarget !== "new") {
      analysis.editTarget = "both";
    }

    if (shouldFallbackToPreviousAccentLayout(analysis, body)) {
      analysis.accentLayout = body.previousAccentLayoutJson;
    }

    const reuseRepeatTile = shouldReuseRepeatTile(analysis, body);
    const repeatPrompt = reuseRepeatTile
      ? null
      : buildRepeatPrompt(analysis.tileLayout, fabricType);
    let tokensRefunded = 0;

    const accentBuilt =
      analysis.patternType === "one_point" && analysis.accentLayout
        ? buildAccentPrompt(
            analysis.accentLayout,
            analysis.tileLayout.backgroundColor,
            fabricType,
            resolveAccentReferenceImageUrl(analysis, body),
          )
        : null;

    let accentResult: { url: string; workId: string } | null = null;

    const promptLength =
      (repeatPrompt?.length ?? 0) + (accentBuilt?.prompt.length ?? 0);
    const parentWorkId = reuseRepeatTile
      ? (body.previousAccentTileWorkId ?? body.previousRepeatTileWorkId ?? null)
      : (body.previousRepeatTileWorkId ?? null);

    const baseLogFields = {
      work_id: renderWorkId,
      workflow_id: body.workflowId,
      phase: "render" as const,
      parent_work_id: parentWorkId,
      user_id: user.id,
      ai_model: "openai" as const,
      request_type: TILE_RENDER_REQUEST_TYPE,
      quality: "standard" as const,
      user_message: body.userMessage,
      prompt_length: promptLength,
      route: body.route,
    };

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

    let repeatResult: { url: string; workId: string };
    try {
      [repeatResult, accentResult] = await Promise.all([
        reuseRepeatTile
          ? Promise.resolve({
              url: body.previousRepeatTileUrl as string,
              workId: body.previousRepeatTileWorkId as string,
            })
          : generateTileImage(repeatPrompt as string, null, renderWorkId),
        accentBuilt
          ? generateTileImage(
              accentBuilt.prompt,
              accentBuilt.referenceImageUrl ?? null,
              reuseRepeatTile ? renderWorkId : undefined,
            )
          : Promise.resolve(null),
      ]);
    } catch (error) {
      const refunded = await refundTileRenderTokens(adminClient, {
        userId: user.id,
        amount: tokensCharged,
        workId: `${renderWorkId}_tile_failed_refund`,
      });

      if (refunded) {
        tokensRefunded += tokensCharged;
      }

      await logGeneration(adminClient, {
        ...baseLogFields,
        generate_image: true,
        image_generated: false,
        tokens_charged: tokensCharged,
        tokens_refunded: tokensRefunded,
        pattern_type: analysis.patternType,
        fabric_type: fabricType,
        error_type: "tile_generation_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
      });

      return jsonResponse(500, { error: "tile_generation_failed" });
    }

    const accentLayoutRecord = analysis.accentLayout
      ? (analysis.accentLayout as unknown as Record<string, unknown>)
      : null;
    const primaryResult =
      reuseRepeatTile && accentResult ? accentResult : repeatResult;

    await Promise.all([
      logGeneration(adminClient, {
        ...baseLogFields,
        work_id: primaryResult.workId,
        generate_image: true,
        image_generated: true,
        generated_image_url: primaryResult.url,
        tokens_charged: tokensCharged,
        tokens_refunded: tokensRefunded,
        repeat_tile_url: repeatResult.url,
        repeat_tile_work_id: repeatResult.workId,
        accent_tile_url: accentResult?.url ?? null,
        accent_tile_work_id: accentResult?.workId ?? null,
        pattern_type: analysis.patternType,
        fabric_type: fabricType,
        tile_role: reuseRepeatTile ? "accent" : "repeat",
        paired_tile_work_id: reuseRepeatTile
          ? repeatResult.workId
          : (accentResult?.workId ?? null),
        accent_layout_json: accentLayoutRecord,
      }),
      saveDesignSession(authClient, {
        sessionId: body.sessionId,
        aiModel: "openai",
        firstMessage: body.firstMessage,
        lastImageUrl: repeatResult.url,
        lastImageFileId: null,
        lastImageWorkId: repeatResult.workId,
        repeatTileUrl: repeatResult.url,
        repeatTileWorkId: repeatResult.workId,
        accentTileUrl: accentResult?.url ?? null,
        accentTileWorkId: accentResult?.workId ?? null,
        accentLayout: accentLayoutRecord,
        patternType: analysis.patternType,
        fabricType,
        messages: buildSessionMessages(body.allMessages, {
          id: crypto.randomUUID(),
          role: "ai",
          content: TILE_GENERATION_AI_MESSAGE,
          image_url: repeatResult.url,
          image_file_id: null,
          attachments: null,
          sequence_number: body.allMessages.length,
        } satisfies SessionMessage),
      }),
    ]);

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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("generate-tile error:", message);
    return jsonResponse(500, { error: message });
  }
});
