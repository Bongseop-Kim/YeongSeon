import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGenerationLogArtifacts } from "@/features/generation-logs/api/generation-log-artifacts-api";

const { rpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: rpcMock,
  },
}));

describe("getGenerationLogArtifacts", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it("workflowId로 admin_get_generation_log_artifacts RPC를 호출한다", async () => {
    const result = await getGenerationLogArtifacts("workflow-1");

    expect(rpcMock).toHaveBeenCalledWith("admin_get_generation_log_artifacts", {
      p_workflow_id: "workflow-1",
    });
    expect(result).toEqual([]);
  });

  it("RPC 오류를 에러로 전파한다", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(getGenerationLogArtifacts("workflow-1")).rejects.toThrow(
      "permission denied",
    );
  });

  it("비배열 데이터는 계약 위반으로 에러를 던진다", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(getGenerationLogArtifacts("workflow-1")).rejects.toThrow(
      "Unexpected artifact response shape",
    );
  });

  it("정상 데이터는 매핑하여 반환한다", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "artifact-1",
          workflow_id: "workflow-1",
          phase: "analysis",
          artifact_type: "rendered_preview",
          source_work_id: null,
          parent_artifact_id: null,
          storage_provider: "imagekit",
          image_url: null,
          image_width: 512,
          image_height: 512,
          mime_type: "image/png",
          file_size_bytes: 2048,
          status: "partial",
          meta: {},
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
      error: null,
    });

    expect(await getGenerationLogArtifacts("workflow-1")).toEqual([
      expect.objectContaining({
        id: "artifact-1",
        workflowId: "workflow-1",
        artifactType: "rendered_preview",
        sourceWorkId: null,
        parentArtifactId: null,
        status: "partial",
        storageProvider: "imagekit",
      }),
    ]);
  });
});
