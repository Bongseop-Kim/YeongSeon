import {
  assertEquals,
  assert,
  assertObjectMatch,
} from "jsr:@std/assert@1.0.19";
import { saveGenerationArtifact } from "@/functions/_shared/generation-artifacts.ts";

Deno.test(
  "saveGenerationArtifact stores a success artifact for base64 input",
  async () => {
    const uploaded: Array<{
      bytes: Uint8Array;
      fileName: string;
      folder: string;
      mimeType: string;
    }> = [];
    const inserted: unknown[] = [];

    const result = await saveGenerationArtifact(
      {
        workflowId: "workflow-1",
        phase: "prep",
        artifactType: "prepared_tile",
        sourceWorkId: "workflow-1-analysis",
        parentArtifactId: "parent-artifact-1",
        meta: { repairApplied: true, artifactKind: "prepared_tile" },
        image: {
          kind: "base64",
          base64: "data:image/png;base64,AAEC",
        },
      },
      {
        generateArtifactId: () => "artifact-1",
        uploadImage: async (input) => {
          uploaded.push(input);
          return {
            url: "https://ik.example/artifacts/prepared-tile.png",
            fileId: "file-1",
          };
        },
        recordArtifactRow: async (row) => {
          inserted.push(row);
          return { error: null };
        },
      },
    );

    assertEquals(result, {
      artifactId: "artifact-1",
      status: "success",
      imageUrl: "https://ik.example/artifacts/prepared-tile.png",
      error: null,
    });

    assertEquals(uploaded.length, 1);
    assertEquals(Array.from(uploaded[0]?.bytes ?? []), [0, 1, 2]);
    assertEquals(uploaded[0]?.mimeType, "image/png");

    assertEquals(inserted.length, 1);
    assertObjectMatch(inserted[0] as Record<string, unknown>, {
      id: "artifact-1",
      workflow_id: "workflow-1",
      phase: "prep",
      artifact_type: "prepared_tile",
      source_work_id: "workflow-1-analysis",
      parent_artifact_id: "parent-artifact-1",
      status: "success",
      image_url: "https://ik.example/artifacts/prepared-tile.png",
      meta: { repairApplied: true, artifactKind: "prepared_tile" },
    });
  },
);

Deno.test(
  "saveGenerationArtifact stores failed status when upload fails",
  async () => {
    const inserted: unknown[] = [];

    const result = await saveGenerationArtifact(
      {
        workflowId: "workflow-2",
        phase: "render",
        artifactType: "rendered_preview",
        meta: { repairApplied: false },
        image: {
          kind: "buffer",
          bytes: new Uint8Array([9, 8, 7]),
          mimeType: "image/png",
        },
      },
      {
        generateArtifactId: () => "artifact-2",
        uploadImage: async () => {
          throw new Error("upload failed");
        },
        recordArtifactRow: async (row) => {
          inserted.push(row);
          return { error: null };
        },
      },
    );

    assertEquals(result, {
      artifactId: "artifact-2",
      status: "failed",
      imageUrl: null,
      error: "upload failed",
    });

    assertEquals(inserted.length, 1);
    assertObjectMatch(inserted[0] as Record<string, unknown>, {
      id: "artifact-2",
      workflow_id: "workflow-2",
      phase: "render",
      artifact_type: "rendered_preview",
      status: "failed",
      image_url: null,
    });
    assertObjectMatch(
      (inserted[0] as { meta?: Record<string, unknown> }).meta ?? {},
      {
        repairApplied: false,
        error: "upload failed",
      },
    );
  },
);

Deno.test(
  "saveGenerationArtifact records failed status for malformed base64 input",
  async () => {
    const inserted: unknown[] = [];

    const result = await saveGenerationArtifact(
      {
        workflowId: "workflow-3",
        phase: "prep",
        artifactType: "prepared_tile",
        image: {
          kind: "base64",
          base64: "data:image/png;base64,###",
        },
      },
      {
        generateArtifactId: () => "artifact-3",
        uploadImage: () => {
          throw new Error("upload should not be called");
        },
        recordArtifactRow: async (row) => {
          inserted.push(row);
          return { error: null };
        },
      },
    );

    assertEquals(result.status, "failed");
    assertEquals(inserted.length, 1);
    assertEquals((inserted[0] as { status?: string }).status, "failed");
    assert(
      typeof ((inserted[0] as { meta?: Record<string, unknown> }).meta ?? {})
        .error === "string" &&
        (
          (inserted[0] as { meta?: Record<string, unknown> }).meta
            ?.error as string
        ).length > 0,
    );
  },
);
