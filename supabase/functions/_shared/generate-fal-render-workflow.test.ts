import { assertEquals } from "jsr:@std/assert@1.0.19";
import {
  appendArtifactWarnings,
  buildArtifactWarningMessage,
  buildInitialRenderLogPayload,
  resolveRenderWorkflowContext,
} from "./generate-fal-render-workflow.ts";

Deno.test(
  "resolveRenderWorkflowContext reuses prep workflow and parent work ids",
  () => {
    const context = resolveRenderWorkflowContext({
      payloadWorkflowId: " prep-workflow-1 ",
      payloadPrepWorkId: " prep-work-1 ",
      analysisSnapshot: null,
    });

    assertEquals(context, {
      workflowId: "prep-workflow-1",
      analysisWorkId: "prep-workflow-1_analysis",
      renderWorkId: "prep-workflow-1_render",
      parentWorkId: "prep-work-1",
    });
  },
);

Deno.test(
  "resolveRenderWorkflowContext prefers analysis parent over prep work id",
  () => {
    const context = resolveRenderWorkflowContext({
      payloadWorkflowId: "prep-workflow-1",
      payloadPrepWorkId: "prep-work-1",
      analysisSnapshot: {
        workflowId: "analysis-workflow-1",
        analysisWorkId: "analysis-work-1",
      },
    });

    assertEquals(context, {
      workflowId: "analysis-workflow-1",
      analysisWorkId: "analysis-work-1",
      renderWorkId: "analysis-workflow-1_render",
      parentWorkId: "analysis-work-1",
    });
  },
);

Deno.test(
  "buildInitialRenderLogPayload keeps artifact warnings out of error_type",
  () => {
    const payload = buildInitialRenderLogPayload({
      workId: "workflow-1_render",
      workflowId: "workflow-1",
      parentWorkId: "prep-work-1",
      userId: "user-1",
      userMessage: "render",
      promptLength: 6,
      imageGenerated: false,
      route: "fal_tiling",
      routeReason: "ci_image_with_pattern_repeat",
      routeSignals: ["ci_image_present"],
      tokensCharged: 5,
    });

    assertEquals(payload.parent_work_id, "prep-work-1");
    assertEquals(payload.error_type, undefined);
    assertEquals(payload.error_message, undefined);
    assertEquals(payload.tokens_charged, 5);
  },
);

Deno.test("buildArtifactWarningMessage serializes warnings as JSON", () => {
  assertEquals(
    buildArtifactWarningMessage([
      {
        artifactType: "final:preview",
        error: "schema; cache miss",
      },
    ]),
    '[{"artifactType":"final:preview","error":"schema; cache miss"}]',
  );
});

Deno.test(
  "appendArtifactWarnings prefixes the serialized warning payload",
  () => {
    assertEquals(
      appendArtifactWarnings(undefined, [
        {
          artifactType: "control_image",
          error: "upload_failed",
        },
      ]),
      'artifact_warnings: [{"artifactType":"control_image","error":"upload_failed"}]',
    );
  },
);
