import { beforeEach, describe, expect, it, vi } from "vitest";
import { useGenerationLogArtifactsQuery } from "@/features/generation-logs/api/generation-logs-query";

const { useQueryMock, getGenerationLogArtifactsMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  getGenerationLogArtifactsMock: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: useQueryMock,
}));

vi.mock("@/features/generation-logs/api/generation-log-artifacts-api", () => ({
  getGenerationLogArtifacts: getGenerationLogArtifactsMock,
}));

vi.mock("@/features/generation-logs/api/generation-logs-api", () => ({
  getGenerationStats: vi.fn(),
  getGenerationLogs: vi.fn(),
}));

describe("generation logs artifact query contract", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    getGenerationLogArtifactsMock.mockReset();
    useQueryMock.mockImplementation((options) => ({
      data: [],
      isLoading: false,
      error: null,
      options,
    }));
  });

  it("workflowId 앞뒤 공백을 query key와 fetch 인자에 동일하게 정규화한다", async () => {
    useGenerationLogArtifactsQuery({
      workflowId: "  workflow-1  ",
    });

    const options = useQueryMock.mock.calls[0]?.[0];

    expect(options.queryKey).toEqual([
      "generation-logs",
      "artifacts",
      "workflow-1",
    ]);

    await options.queryFn();

    expect(getGenerationLogArtifactsMock).toHaveBeenCalledWith("workflow-1");
    expect(options.enabled).toBe(true);
  });
});
