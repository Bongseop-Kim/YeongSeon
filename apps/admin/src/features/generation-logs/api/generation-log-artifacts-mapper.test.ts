import { describe, expect, it, vi } from "vitest";
import { toAdminGenerationArtifactItem } from "@/features/generation-logs/api/generation-log-artifacts-mapper";

describe("toAdminGenerationArtifactItem", () => {
  it("safe integer 범위를 벗어난 bigint file_size_bytes는 null로 버린다", () => {
    expect(
      toAdminGenerationArtifactItem({
        id: "artifact-1",
        workflow_id: "workflow-1",
        artifact_type: "final",
        storage_provider: "imagekit",
        file_size_bytes: BigInt(Number.MAX_SAFE_INTEGER) + 1n,
        status: "success",
        meta: {},
        created_at: "2026-05-12T00:00:00Z",
      }).fileSizeBytes,
    ).toBeNull();
  });

  it("safe integer 범위를 벗어난 정수 문자열 file_size_bytes는 null로 버린다", () => {
    expect(
      toAdminGenerationArtifactItem({
        id: "artifact-2",
        workflow_id: "workflow-1",
        artifact_type: "final",
        storage_provider: "imagekit",
        file_size_bytes: "9007199254740992",
        status: "success",
        meta: {},
        created_at: "2026-05-12T00:00:00Z",
      }).fileSizeBytes,
    ).toBeNull();
  });

  it("공백이 섞인 safe integer 문자열은 숫자로 변환한다", () => {
    expect(
      toAdminGenerationArtifactItem({
        id: "artifact-3",
        workflow_id: "workflow-1",
        artifact_type: "final",
        storage_provider: "imagekit",
        file_size_bytes: " 1024 ",
        status: "success",
        meta: {},
        created_at: "2026-05-12T00:00:00Z",
      }).fileSizeBytes,
    ).toBe(1024);
  });

  it("부분 숫자 문자열은 null로 버린다", () => {
    expect(
      toAdminGenerationArtifactItem({
        id: "artifact-4",
        workflow_id: "workflow-1",
        artifact_type: "final",
        storage_provider: "imagekit",
        file_size_bytes: "12px",
        status: "success",
        meta: {},
        created_at: "2026-05-12T00:00:00Z",
      }).fileSizeBytes,
    ).toBeNull();
  });

  it("안전한 정수가 아닌 number는 null로 버린다", () => {
    expect(
      toAdminGenerationArtifactItem({
        id: "artifact-5",
        workflow_id: "workflow-1",
        artifact_type: "final",
        storage_provider: "imagekit",
        file_size_bytes: 1.5,
        status: "success",
        meta: {},
        created_at: "2026-05-12T00:00:00Z",
      }).fileSizeBytes,
    ).toBeNull();
  });

  it("critical field가 문자열이 아니면 null로 매핑하고 경고를 남긴다", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = toAdminGenerationArtifactItem({
      id: 123,
      workflow_id: null,
      artifact_type: "final",
      storage_provider: "imagekit",
      status: "success",
      meta: {},
      created_at: undefined,
    });

    expect(result.id).toBeNull();
    expect(result.workflowId).toBeNull();
    expect(result.createdAt).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(warnSpy).toHaveBeenCalledWith(
      "[toAdminGenerationArtifactItem] Invalid critical field",
      expect.objectContaining({ field: "id" }),
    );

    warnSpy.mockRestore();
  });
});
