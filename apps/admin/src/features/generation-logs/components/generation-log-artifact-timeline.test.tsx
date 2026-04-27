import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GenerationLogArtifactTimeline } from "@/features/generation-logs/components/generation-log-artifact-timeline";

const { useGenerationLogArtifactsQueryMock } = vi.hoisted(() => ({
  useGenerationLogArtifactsQueryMock: vi.fn(),
}));

vi.mock("@/features/generation-logs/api/generation-logs-query", () => ({
  useGenerationLogArtifactsQuery: useGenerationLogArtifactsQueryMock,
}));

describe("GenerationLogArtifactTimeline", () => {
  it("아티팩트가 없고 artifact_warnings가 있으면 저장 실패 안내를 보여준다", () => {
    useGenerationLogArtifactsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      errorMessage: null,
    });

    render(
      <GenerationLogArtifactTimeline
        workflowId="workflow-1"
        logErrorMessage="artifact_warnings: final: schema cache miss"
      />,
    );

    expect(
      screen.getByText("아티팩트 저장이 실패해 타임라인이 비어 있습니다"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/artifact_warnings: final: schema cache miss/),
    ).toBeInTheDocument();
  });
});
