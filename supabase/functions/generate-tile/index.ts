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
import { analyzeIntent, planDiversity } from "./analysis.ts";
import {
  chargeTileRenderTokens,
  refundTileRenderTokens,
  TILE_RENDER_REQUEST_TYPE,
} from "./billing.ts";
import { resolveFabricType } from "./fabric-type-resolver.ts";
import { type GeneratedTile, generateTileImage } from "./image-generator.ts";
import {
  resolveAccentReferenceImageUrls,
  resolveEffectiveReferenceImageUsage,
  resolveRepeatReferenceImageUrls,
  shouldFallbackToPreviousAccentLayout,
  shouldReuseRepeatTile,
} from "./generation-plan.ts";
import { buildSuccessfulTileGenerationLogs } from "./log-plan.ts";
import { persistDesignGeneration } from "./generation-persistence.ts";
import { buildAccentPrompt, buildRepeatPrompt } from "./prompt-builder.ts";
import type {
  AnalysisOutput,
  GenerationSpec,
  TileGenerationRequest,
  TileGenerationResponse,
} from "./types.ts";
import { buildTileGenerationVariantResponse } from "./variant-response.ts";

const TILE_GENERATION_AI_MESSAGE = "타일 기반 디자인을 생성했습니다.";
const TILE_VARIANT_COUNT = 4;

function getLatestUserRequestAttachments(body: TileGenerationRequest) {
  for (let index = body.allMessages.length - 1; index >= 0; index -= 1) {
    const message = body.allMessages[index];
    if (message.role === "user" && message.attachments) {
      return sanitizeLogRequestAttachments(message.attachments);
    }
  }

  return null;
}

const repeatTile = (tile: GeneratedTile): GeneratedTile[] =>
  Array.from({ length: TILE_VARIANT_COUNT }, () => tile);

const analysisForVariant = (
  baseAnalysis: AnalysisOutput,
  variant: GenerationSpec,
): AnalysisOutput => ({
  ...baseAnalysis,
  tileLayout: variant.tileLayout,
  accentLayout: variant.accentLayout,
  referenceImageUsage: variant.referenceImageUsage,
});

const buildGenerationRequestMetadata = (
  body: TileGenerationRequest,
  analysis: Record<string, unknown>,
  selectedBackgroundColor: string | null,
  reuseRepeatTile: boolean,
  referenceImageCount: number,
): Record<string, unknown> => ({
  route: body.route,
  sessionId: body.sessionId,
  workflowId: body.workflowId,
  selectedColors: body.selectedColors,
  attachments: body.allMessages.at(-1)?.attachments ?? [],
  selectedBackgroundColor,
  attachedImageUrls: body.attachedImageUrls,
  previousRepeatTileWorkId: body.previousRepeatTileWorkId,
  previousAccentTileWorkId: body.previousAccentTileWorkId,
  reusedRepeatTile: reuseRepeatTile,
  referenceImageCount,
  analysis,
});

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
    let persistenceSucceeded = false;

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
      const diversityPlan = reuseRepeatTile
        ? null
        : await planDiversity(body, analysis, fabricType);
      const repeatGenerationPlans =
        reuseRepeatTile || !diversityPlan
          ? []
          : diversityPlan.variants.map((variant) => {
              const variantAnalysis = analysisForVariant(analysis, variant);
              const referenceImageUrls = resolveRepeatReferenceImageUrls(
                variantAnalysis,
                body,
              );
              return {
                variant,
                referenceImageUrls,
                prompt: buildRepeatPrompt(
                  variant.tileLayout,
                  fabricType,
                  variant.referenceImageUsage,
                  referenceImageUrls.length,
                  variant,
                ),
              };
            });
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

      const repeatResults = reusableRepeatTile
        ? repeatTile(reusableRepeatTile)
        : await Promise.all(
            repeatGenerationPlans.map((plan, index) =>
              generateTileImage(
                plan.prompt,
                plan.referenceImageUrls,
                index === 0 ? renderWorkId : undefined,
              ),
            ),
          );

      const accentGenerationPlans =
        analysis.patternType === "one_point"
          ? reuseRepeatTile || !diversityPlan
            ? repeatResults.map((repeatResult) => {
                if (!analysis.accentLayout) {
                  throw new Error("one_point generation requires accentLayout");
                }

                return {
                  accentLayout: analysis.accentLayout,
                  ...buildAccentPrompt(
                    analysis.accentLayout,
                    analysis.tileLayout.backgroundColor,
                    fabricType,
                    repeatResult.url,
                    resolveAccentReferenceImageUrls(analysis, body),
                  ),
                };
              })
            : diversityPlan.variants.map((variant, index) => {
                if (!variant.accentLayout) {
                  throw new Error("one_point variant requires accentLayout");
                }
                const repeatResult = repeatResults[index];
                if (!repeatResult) {
                  throw new Error("one_point variant missing repeat tile");
                }
                const variantAnalysis = analysisForVariant(analysis, variant);

                return {
                  accentLayout: variant.accentLayout,
                  ...buildAccentPrompt(
                    variant.accentLayout,
                    variant.tileLayout.backgroundColor,
                    fabricType,
                    repeatResult.url,
                    resolveAccentReferenceImageUrls(variantAnalysis, body),
                  ),
                };
              })
          : [];

      if (reuseRepeatTile && accentGenerationPlans.length === 0) {
        throw new Error("reuseRepeatTile requires an accent generation");
      }

      const promptLength =
        repeatGenerationPlans.reduce(
          (sum, plan) => sum + plan.prompt.length,
          0,
        ) +
        accentGenerationPlans.reduce(
          (sum, plan) => sum + plan.prompt.length,
          0,
        );
      const parentWorkId = reuseRepeatTile
        ? (body.previousAccentTileWorkId ??
          body.previousRepeatTileWorkId ??
          null)
        : (body.previousRepeatTileWorkId ?? null);
      const promptParts = [
        ...repeatGenerationPlans.map(
          (plan, index) => `repeat_prompt_${index + 1}:\n${plan.prompt}`,
        ),
        ...accentGenerationPlans.map(
          (plan, index) => `accent_prompt_${index + 1}:\n${plan.prompt}`,
        ),
      ].filter((part): part is string => part !== null);
      const generationPrompt =
        promptParts.length > 0 ? promptParts.join("\n\n") : body.userMessage;
      const referenceImageCount =
        repeatGenerationPlans.reduce(
          (sum, plan) => sum + plan.referenceImageUrls.length,
          0,
        ) +
        accentGenerationPlans.reduce(
          (sum, plan) => sum + plan.referenceImageUrls.length,
          0,
        );
      const renderLogFields = {
        ...baseLogFields,
        parent_work_id: parentWorkId,
        prompt_length: promptLength,
        image_prompt: generationPrompt,
        normalized_design: {
          ...analysis,
          attachedImageCount: body.attachedImageUrls.length,
          repeatReferenceImageCount: repeatGenerationPlans.reduce(
            (sum, plan) => sum + plan.referenceImageUrls.length,
            0,
          ),
          accentReferenceImageCount: accentGenerationPlans.reduce(
            (sum, plan) => sum + plan.referenceImageUrls.length,
            0,
          ),
          imageEndpoint: referenceImageCount > 0 ? "edits" : "generations",
          diversityPlan,
        } as Record<string, unknown>,
        has_reference_image: referenceImageCount > 0,
        has_previous_image:
          body.previousRepeatTileUrl !== null ||
          body.previousAccentTileUrl !== null,
      };

      const accentResults =
        accentGenerationPlans.length > 0
          ? await Promise.all(
              accentGenerationPlans.map((plan, index) =>
                generateTileImage(
                  plan.prompt,
                  plan.referenceImageUrls,
                  reuseRepeatTile && index === 0 ? renderWorkId : undefined,
                ),
              ),
            )
          : [];
      const accentLayouts = accentGenerationPlans.map(
        (plan) => plan.accentLayout,
      );

      const firstRepeatResult = repeatResults[0];
      const firstAccentResult = accentResults[0] ?? null;
      if (!firstRepeatResult) {
        throw new Error("repeat generation returned no variants");
      }

      const primaryResult =
        reuseRepeatTile && firstAccentResult
          ? firstAccentResult
          : firstRepeatResult;
      const representativeResult = primaryResult;
      const generationId = crypto.randomUUID();
      const result: TileGenerationResponse = buildTileGenerationVariantResponse(
        {
          generationId,
          prompt: generationPrompt,
          patternType: analysis.patternType,
          fabricType,
          repeatResults,
          accentResults,
          accentLayouts,
        },
      );

      try {
        const generationLogs = buildSuccessfulTileGenerationLogs({
          baseLog: renderLogFields,
          repeatResults,
          accentResults,
          primaryWorkId: primaryResult.workId,
          tokensCharged,
          tokensRefunded,
          patternType: analysis.patternType,
          fabricType,
          accentLayouts,
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
          generationId,
          error,
        });
        throw error;
      }

      try {
        await persistDesignGeneration(adminClient, {
          generationId,
          userId: user.id,
          prompt: generationPrompt,
          patternType: analysis.patternType,
          fabricType,
          requestMetadata: buildGenerationRequestMetadata(
            body,
            {
              ...(analysis as unknown as Record<string, unknown>),
              diversityPlan,
            },
            selectedBackgroundColor,
            reuseRepeatTile,
            referenceImageCount,
          ),
          variants: result.variants,
        });
        persistenceSucceeded = true;
      } catch (error) {
        console.error("generate-tile persistDesignGeneration failed:", {
          workId: primaryResult.workId,
          generationId,
          error,
        });
        throw error;
      }

      try {
        await saveDesignSession(
          authClient,
          {
            sessionId: body.sessionId,
            aiModel: "openai",
            firstMessage: body.firstMessage,
            repeatTileUrl: firstRepeatResult.url,
            repeatTileWorkId: firstRepeatResult.workId,
            accentTileUrl: firstAccentResult?.url ?? null,
            accentTileWorkId: firstAccentResult?.workId ?? null,
            accentLayout: result.variants[0]?.accentLayout
              ? (result.variants[0].accentLayout as unknown as Record<
                  string,
                  unknown
                >)
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
          generationId,
          error,
        });
        throw error;
      }

      return jsonResponse(200, result as unknown as Record<string, unknown>);
    } catch (error) {
      if (!persistenceSucceeded) {
        const refunded = await refundTileRenderTokens(adminClient, {
          userId: user.id,
          amount: tokensCharged,
          workId: `${renderWorkId}_tile_failed_refund`,
        });
        if (refunded === "succeeded") {
          tokensRefunded = tokensCharged;
        }
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
