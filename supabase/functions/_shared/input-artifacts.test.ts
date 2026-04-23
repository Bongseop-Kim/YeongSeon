import { assertEquals } from "jsr:@std/assert@1.0.19";
import { recordSourceInputArtifact } from "./input-artifacts.ts";
import type { SaveGenerationArtifactInput } from "./generation-artifacts.ts";

Deno.test(
  "recordSourceInputArtifact stores source_input from sourceImageBase64 before duplicated ciImageBase64",
  async () => {
    const calls: Array<Record<string, unknown>> = [];

    const result = await recordSourceInputArtifact({
      adminClient: {
        rpc: async () => ({ data: null, error: null }),
      } as never,
      workflowId: "workflow-1",
      sourceWorkId: "analysis-1",
      phase: "analysis",
      payload: {
        sourceImageBase64: " AAAA ",
        sourceImageMimeType: " image/png ",
        ciImageBase64: "BBBB",
        ciImageMimeType: "image/jpeg",
      },
      saveArtifact: async (input: SaveGenerationArtifactInput) => {
        calls.push({
          workflowId: input.workflowId,
          sourceWorkId: input.sourceWorkId,
          phase: input.phase,
          artifactType: input.artifactType,
          image: input.image,
          meta: input.meta,
        });
        return {
          artifactId: "artifact-1",
          status: "success",
          imageUrl: "https://ik.test/source.png",
          error: null,
        };
      },
    });

    assertEquals(result?.artifactId, "artifact-1");
    assertEquals(calls.length, 1);
    assertEquals(calls[0], {
      workflowId: "workflow-1",
      sourceWorkId: "analysis-1",
      phase: "analysis",
      artifactType: "source_input",
      image: {
        kind: "base64",
        base64: "AAAA",
        mimeType: "image/png",
      },
      meta: {
        inputKind: "source",
      },
    });
  },
);

Deno.test(
  "recordSourceInputArtifact falls back to referenceImageBase64 when no source or ci image exists",
  async () => {
    const calls: Array<Record<string, unknown>> = [];

    await recordSourceInputArtifact({
      adminClient: {
        rpc: async () => ({ data: null, error: null }),
      } as never,
      workflowId: "workflow-2",
      sourceWorkId: "analysis-2",
      phase: "analysis",
      payload: {
        referenceImageBase64: "CCCC",
        referenceImageMimeType: "image/webp",
      },
      saveArtifact: async (input: SaveGenerationArtifactInput) => {
        calls.push({
          image: input.image,
          meta: input.meta,
        });
        return {
          artifactId: "artifact-2",
          status: "success",
          imageUrl: "https://ik.test/reference.webp",
          error: null,
        };
      },
    });

    assertEquals(calls, [
      {
        image: {
          kind: "base64",
          base64: "CCCC",
          mimeType: "image/webp",
        },
        meta: {
          inputKind: "reference",
        },
      },
    ]);
  },
);

Deno.test(
  "recordSourceInputArtifact returns null when the request has no input image",
  async () => {
    let called = false;

    const result = await recordSourceInputArtifact({
      adminClient: {
        rpc: async () => ({ data: null, error: null }),
      } as never,
      workflowId: "workflow-3",
      sourceWorkId: "analysis-3",
      phase: "analysis",
      payload: {},
      saveArtifact: async () => {
        called = true;
        return {
          artifactId: "artifact-3",
          status: "success",
          imageUrl: "https://ik.test/unused.png",
          error: null,
        };
      },
    });

    assertEquals(result, null);
    assertEquals(called, false);
  },
);
