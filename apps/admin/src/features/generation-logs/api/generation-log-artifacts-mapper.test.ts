import { describe, expect, it } from "vitest";
import { toAdminGenerationArtifactItem } from "@/features/generation-logs/api/generation-log-artifacts-mapper";

const baseRow = {
  id: "artifact-1",
  workflow_id: "workflow-1",
  phase: "prep",
  artifact_type: "prepared_tile",
  source_work_id: "work-1",
  parent_artifact_id: "parent-artifact-1",
  storage_provider: "imagekit",
  image_url: "https://ik.example/artifacts/prepared-tile.png",
  image_width: 1024,
  image_height: "1024",
  mime_type: "image/png",
  file_size_bytes: "12345",
  status: "success",
  meta: { repairApplied: true },
  created_at: "2026-04-01T10:00:00Z",
};

describe("toAdminGenerationArtifactItem", () => {
  it("정상 row를 올바르게 매핑한다", () => {
    expect(toAdminGenerationArtifactItem(baseRow)).toEqual({
      id: "artifact-1",
      workflowId: "workflow-1",
      phase: "prep",
      artifactType: "prepared_tile",
      sourceWorkId: "work-1",
      parentArtifactId: "parent-artifact-1",
      storageProvider: "imagekit",
      imageUrl: "https://ik.example/artifacts/prepared-tile.png",
      imageWidth: 1024,
      imageHeight: 1024,
      mimeType: "image/png",
      fileSizeBytes: 12345,
      status: "success",
      meta: { repairApplied: true },
      createdAt: "2026-04-01T10:00:00Z",
    });
  });

  it("알 수 없는 phase는 제외한다", () => {
    expect(
      toAdminGenerationArtifactItem({ ...baseRow, phase: "invalid" }),
    ).toEqual(
      expect.objectContaining({
        id: "artifact-1",
        workflowId: "workflow-1",
        artifactType: "prepared_tile",
      }),
    );

    expect(
      "phase" in
        toAdminGenerationArtifactItem({ ...baseRow, phase: "invalid" }),
    ).toBe(false);
  });

  it("알 수 없는 status는 failed로 폴백한다", () => {
    expect(
      toAdminGenerationArtifactItem({ ...baseRow, status: "unknown" }).status,
    ).toBe("failed");
  });

  it("meta가 객체가 아니면 빈 객체로 매핑한다", () => {
    expect(
      toAdminGenerationArtifactItem({ ...baseRow, meta: "invalid" }),
    ).toEqual(
      expect.objectContaining({
        meta: {},
      }),
    );
  });

  it("nullable 필드는 null로 매핑한다", () => {
    expect(
      toAdminGenerationArtifactItem({
        ...baseRow,
        image_url: null,
        image_width: null,
        image_height: null,
        mime_type: null,
        file_size_bytes: null,
        source_work_id: null,
        parent_artifact_id: null,
      }),
    ).toEqual(
      expect.objectContaining({
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        mimeType: null,
        fileSizeBytes: null,
        sourceWorkId: null,
        parentArtifactId: null,
      }),
    );
  });
});
