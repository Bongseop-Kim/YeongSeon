import {
  assertEquals,
  assertLess,
  assertObjectMatch,
  assertRejects,
} from "jsr:@std/assert";
import {
  assessPatternPreparation,
  buildOpenAiEditCanvas,
  computeMetrics,
  resolveOnePointCompositeMetrics,
  resolveTileCompositeMetrics,
} from "@/functions/_shared/pattern-composite.ts";
import { createPreparePatternCompositeHandler } from "@/functions/prepare-pattern-composite/index.ts";

Deno.test(
  "resolveTileCompositeMetrics maps scale to deterministic tile sizes",
  () => {
    assertObjectMatch(resolveTileCompositeMetrics("small"), {
      tileSizePx: 72,
      gapPx: 20,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
    assertObjectMatch(resolveTileCompositeMetrics("medium"), {
      tileSizePx: 123,
      gapPx: 31,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
    assertObjectMatch(resolveTileCompositeMetrics("large"), {
      tileSizePx: 205,
      gapPx: 51,
      compositeCanvasWidth: 1024,
      compositeCanvasHeight: 1024,
    });
  },
);

Deno.test(
  "resolveOnePointCompositeMetrics keeps one-point canvas fixed",
  () => {
    assertObjectMatch(resolveOnePointCompositeMetrics("medium"), {
      tileSizePx: 38,
      gapPx: 0,
      compositeCanvasWidth: 316,
      compositeCanvasHeight: 600,
    });
  },
);

Deno.test(
  "assessPatternPreparation marks unsuitable one-point motifs for repair",
  () => {
    const result = assessPatternPreparation({
      placementMode: "one-point",
      fabricMethod: "yarn-dyed",
      metrics: {
        opaqueCoverageRatio: 0.5,
        dominantColorCount: 5,
        internalDetailRatio: 0.25,
        componentCount: 4,
        edgeTouchRatio: 0.01,
        outerMarginVariance: 0,
        spacingVariance: 0,
        singleMotifConfidence: 0.2,
      },
    });

    assertEquals(result.sourceStatus, "repair_required");
    assertEquals(result.fabricStatus, "repair_required");
    assertEquals(result.preparedSourceKind, "original");
    assertEquals(
      result.reasonCodes.includes("not_suitable_for_one_point"),
      true,
    );
    assertEquals(
      result.reasonCodes.includes("too_many_colors_for_yarn_dyed"),
      true,
    );
  },
);

Deno.test(
  "computeMetrics ignores a single contaminated corner when estimating background",
  () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4);

    for (let index = 0; index < width * height; index += 1) {
      const pixelIndex = index * 4;
      pixels[pixelIndex] = 255;
      pixels[pixelIndex + 1] = 255;
      pixels[pixelIndex + 2] = 255;
      pixels[pixelIndex + 3] = 255;
    }

    const setPixel = (x: number, y: number, rgb: [number, number, number]) => {
      const pixelIndex = (y * width + x) * 4;
      pixels[pixelIndex] = rgb[0];
      pixels[pixelIndex + 1] = rgb[1];
      pixels[pixelIndex + 2] = rgb[2];
    };

    setPixel(0, 0, [0, 0, 0]);
    setPixel(4, 4, [0, 0, 0]);
    setPixel(4, 5, [0, 0, 0]);
    setPixel(5, 4, [0, 0, 0]);
    setPixel(5, 5, [0, 0, 0]);

    const metrics = computeMetrics(pixels, width, height);

    assertLess(metrics.opaqueCoverageRatio, 0.2);
    assertEquals(metrics.componentCount, 2);
  },
);

Deno.test("buildOpenAiEditCanvas rejects empty input", async () => {
  await assertRejects(
    () => buildOpenAiEditCanvas(new Uint8Array()),
    Error,
    "prepared_source_empty",
  );
});

Deno.test("buildOpenAiEditCanvas accepts a small PNG input", async () => {
  const pngBytes = Uint8Array.from(
    atob(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4//8/AwAI/AL+KD9NAAAAAElFTkSuQmCC",
    ),
    (character) => character.charCodeAt(0),
  );

  await assertRejects(
    () => buildOpenAiEditCanvas(pngBytes),
    Error,
    "Requires read access",
  );
});

Deno.test(
  "prepare-pattern-composite records repaired all-over prep artifacts in order",
  async () => {
    const artifactCalls: Array<{
      artifactType: string;
      workflowId: string;
      sourceWorkId: string | null;
      parentArtifactId: string | null;
      status: string;
    }> = [];
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const logCalls: Array<Record<string, unknown>> = [];

    const handler = createPreparePatternCompositeHandler({
      getCorsHeaders: () => ({}),
      getOpenAiApiKey: () => "openai-key",
      createAuthenticatedSupabaseClient: () =>
        ({
          auth: {
            getUser: async () => ({
              data: { user: { id: "user-1" } },
              error: null,
            }),
          },
        }) as never,
      createAdminSupabaseClient: () =>
        ({
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args });
            if (fn === "use_design_tokens") {
              return {
                data: {
                  success: true,
                  balance: 9,
                  cost: 1,
                  remaining: 9,
                },
                error: null,
              };
            }

            return { data: null, error: null };
          },
          from: () => ({
            insert: async (row: Record<string, unknown>) => {
              artifactCalls.push({
                artifactType: String(row.artifact_type),
                workflowId: String(row.workflow_id),
                sourceWorkId: row.source_work_id as string | null,
                parentArtifactId: row.parent_artifact_id as string | null,
                status: String(row.status),
              });
              return { error: null };
            },
          }),
        }) as never,
      saveGenerationArtifact: async (input, deps) => {
        const artifactId = `artifact-${artifactCalls.length + 1}`;
        const insertResult = await deps.recordArtifactRow({
          id: artifactId,
          workflow_id: input.workflowId,
          phase: input.phase,
          artifact_type: input.artifactType,
          source_work_id: input.sourceWorkId ?? null,
          parent_artifact_id: input.parentArtifactId ?? null,
          storage_provider: "imagekit",
          image_url: "https://ik.test/image.png",
          image_width: null,
          image_height: null,
          mime_type: "image/png",
          file_size_bytes: 3,
          status: "success",
          meta: input.meta ?? {},
        });
        if (insertResult && "error" in insertResult && insertResult.error) {
          throw new Error(insertResult.error.message);
        }

        return {
          artifactId,
          status: "success",
          imageUrl: "https://ik.test/image.png",
          error: null,
        };
      },
      maybeDownscaleImage: async (bytes) => bytes,
      readImageRgba: async () => ({
        pixels: new Uint8ClampedArray([255, 255, 255, 255]),
        width: 128,
        height: 128,
      }),
      assessPatternPreparation: (input) => ({
        placementMode: input.placementMode,
        sourceStatus: "repair_required",
        fabricStatus: "repair_required",
        preparedSourceKind: "original",
        reasonCodes: ["too_many_colors_for_yarn_dyed"],
        userMessage: "repair needed",
        preparationBackend: "openai_repair",
        repairApplied: false,
        repairPromptKind: "all_over_tile",
        repairSummary: null,
        prepTokensCharged: null,
      }),
      renderPreparedSource: async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        width: 128,
        height: 128,
      }),
      buildOpenAiEditCanvas: async () => ({
        bytes: new Uint8Array([4, 5, 6]),
        sourceWidth: 1,
        sourceHeight: 1,
      }),
      composeAllOverTile: async () => ({
        tileBytes: new Uint8Array([7, 8, 9]),
        tileSizePx: 123,
        gapPx: 31,
        compositeCanvasWidth: 1024,
        compositeCanvasHeight: 1024,
      }),
      composeOnePointMotif: async () => ({
        motifBytes: new Uint8Array([7, 8, 9]),
        tileSizePx: 38,
        gapPx: 0,
        compositeCanvasWidth: 316,
        compositeCanvasHeight: 600,
      }),
      buildAllOverRepairPrompt: () => "all-over repair prompt",
      buildOnePointRepairPrompt: () => "one-point repair prompt",
      requestOpenAiRepair: async () => "AAEC",
      logGeneration: async (_client, payload) => {
        logCalls.push(payload as Record<string, unknown>);
      },
    });

    const response = await handler(
      new Request("http://localhost/prepare-pattern-composite", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
        },
        body: JSON.stringify({
          sourceImageBase64: "AAEC",
          sourceImageMimeType: "image/png",
          placementMode: "all-over",
          fabricMethod: "yarn-dyed",
        }),
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(
      artifactCalls.map((entry) => entry.artifactType),
      [
        "source_original",
        "openai_edit_canvas",
        "prepared_source",
        "prepared_tile",
      ],
    );
    const workflowId = artifactCalls[0]?.workflowId;
    const sourceWorkId = artifactCalls[0]?.sourceWorkId;
    assertEquals(
      artifactCalls.map((entry) => entry.workflowId),
      [workflowId, workflowId, workflowId, workflowId],
    );
    assertEquals(
      artifactCalls.map((entry) => entry.sourceWorkId),
      [sourceWorkId, sourceWorkId, sourceWorkId, sourceWorkId],
    );
    assertEquals(workflowId, String(logCalls[0]?.workflow_id));
    assertEquals(sourceWorkId, String(logCalls[0]?.work_id));
    assertEquals(artifactCalls[3]?.parentArtifactId, "artifact-3");
    assertEquals(
      rpcCalls.map((entry) => entry.fn),
      ["use_design_tokens"],
    );
    assertEquals(logCalls.length > 0, true);
  },
);

Deno.test(
  "prepare-pattern-composite records original one-point artifacts without repair",
  async () => {
    const artifactCalls: Array<{
      artifactType: string;
      workflowId: string;
      sourceWorkId: string | null;
      parentArtifactId: string | null;
      status: string;
    }> = [];
    const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
    const logCalls: Array<Record<string, unknown>> = [];

    const handler = createPreparePatternCompositeHandler({
      getCorsHeaders: () => ({}),
      getOpenAiApiKey: () => "openai-key",
      createAuthenticatedSupabaseClient: () =>
        ({
          auth: {
            getUser: async () => ({
              data: { user: { id: "user-2" } },
              error: null,
            }),
          },
        }) as never,
      createAdminSupabaseClient: () =>
        ({
          rpc: async (fn: string, args: Record<string, unknown>) => {
            rpcCalls.push({ fn, args });
            return { data: null, error: null };
          },
          from: () => ({
            insert: async (row: Record<string, unknown>) => {
              artifactCalls.push({
                artifactType: String(row.artifact_type),
                workflowId: String(row.workflow_id),
                sourceWorkId: row.source_work_id as string | null,
                parentArtifactId: row.parent_artifact_id as string | null,
                status: String(row.status),
              });
              return { error: null };
            },
          }),
        }) as never,
      saveGenerationArtifact: async (input, deps) => {
        const artifactId = `artifact-${artifactCalls.length + 1}`;
        const insertResult = await deps.recordArtifactRow({
          id: artifactId,
          workflow_id: input.workflowId,
          phase: input.phase,
          artifact_type: input.artifactType,
          source_work_id: input.sourceWorkId ?? null,
          parent_artifact_id: input.parentArtifactId ?? null,
          storage_provider: "imagekit",
          image_url: "https://ik.test/image.png",
          image_width: null,
          image_height: null,
          mime_type: "image/png",
          file_size_bytes: 3,
          status: "success",
          meta: input.meta ?? {},
        });
        if (insertResult && "error" in insertResult && insertResult.error) {
          throw new Error(insertResult.error.message);
        }

        return {
          artifactId,
          status: "success",
          imageUrl: "https://ik.test/image.png",
          error: null,
        };
      },
      maybeDownscaleImage: async (bytes) => bytes,
      readImageRgba: async () => ({
        pixels: new Uint8ClampedArray([255, 255, 255, 255]),
        width: 96,
        height: 96,
      }),
      assessPatternPreparation: (input) => ({
        placementMode: input.placementMode,
        sourceStatus: "ready",
        fabricStatus: "ready",
        preparedSourceKind: "original",
        reasonCodes: [],
        userMessage: "ready",
        preparationBackend: "local",
        repairApplied: false,
        repairPromptKind: "one_point_motif",
        repairSummary: null,
        prepTokensCharged: null,
      }),
      renderPreparedSource: async () => ({
        bytes: new Uint8Array([1, 2, 3]),
        width: 96,
        height: 96,
      }),
      buildOpenAiEditCanvas: async () => ({
        bytes: new Uint8Array([4, 5, 6]),
        sourceWidth: 1,
        sourceHeight: 1,
      }),
      composeAllOverTile: async () => ({
        tileBytes: new Uint8Array([7, 8, 9]),
        tileSizePx: 123,
        gapPx: 31,
        compositeCanvasWidth: 1024,
        compositeCanvasHeight: 1024,
      }),
      composeOnePointMotif: async () => ({
        motifBytes: new Uint8Array([9, 8, 7]),
        tileSizePx: 38,
        gapPx: 0,
        compositeCanvasWidth: 316,
        compositeCanvasHeight: 600,
      }),
      buildAllOverRepairPrompt: () => "all-over repair prompt",
      buildOnePointRepairPrompt: () => "one-point repair prompt",
      requestOpenAiRepair: async () => {
        throw new Error("repair should not run");
      },
      logGeneration: async (_client, payload) => {
        logCalls.push(payload as Record<string, unknown>);
      },
    });

    const response = await handler(
      new Request("http://localhost/prepare-pattern-composite", {
        method: "POST",
        headers: {
          authorization: "Bearer user-token",
        },
        body: JSON.stringify({
          sourceImageBase64: "AAEC",
          sourceImageMimeType: "image/png",
          placementMode: "one-point",
          fabricMethod: "digital-print",
        }),
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(
      artifactCalls.map((entry) => entry.artifactType),
      ["source_original", "prepared_point_motif"],
    );
    const workflowId = artifactCalls[0]?.workflowId;
    const sourceWorkId = artifactCalls[0]?.sourceWorkId;
    assertEquals(
      artifactCalls.map((entry) => entry.workflowId),
      [workflowId, workflowId],
    );
    assertEquals(
      artifactCalls.map((entry) => entry.sourceWorkId),
      [sourceWorkId, sourceWorkId],
    );
    assertEquals(workflowId, String(logCalls[0]?.workflow_id));
    assertEquals(sourceWorkId, String(logCalls[0]?.work_id));
    assertEquals(artifactCalls[1]?.parentArtifactId, null);
    assertEquals(rpcCalls.length, 0);
    assertEquals(logCalls.length > 0, true);
  },
);
