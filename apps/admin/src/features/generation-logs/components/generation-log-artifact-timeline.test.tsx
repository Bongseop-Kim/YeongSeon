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

  it("artifact_warnings가 접두사가 아니면 저장 실패 안내를 보여주지 않는다", () => {
    useGenerationLogArtifactsQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      errorMessage: null,
    });

    render(
      <GenerationLogArtifactTimeline
        workflowId="workflow-1"
        logErrorMessage="render failed after artifact_warnings: final"
      />,
    );

    expect(
      screen.queryByText("아티팩트 저장이 실패해 타임라인이 비어 있습니다"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("워크플로우 아티팩트가 없습니다"),
    ).toBeInTheDocument();
  });

  it("알 수 없는 phase는 미분류로 표시한다", () => {
    useGenerationLogArtifactsQueryMock.mockReturnValue({
      data: [
        {
          id: "artifact-unknown",
          workflowId: "workflow-1",
          phase: "unexpected",
          artifactType: "debug_tile",
          sourceWorkId: null,
          parentArtifactId: null,
          storageProvider: null,
          imageUrl: null,
          imageWidth: null,
          imageHeight: null,
          mimeType: null,
          fileSizeBytes: null,
          status: "success",
          meta: {},
          createdAt: "2026-05-12T00:00:00Z",
        },
      ],
      isLoading: false,
      errorMessage: null,
    });

    render(
      <GenerationLogArtifactTimeline
        workflowId="workflow-1"
        logErrorMessage={null}
      />,
    );

    expect(screen.getByText("미분류 (1)")).toBeInTheDocument();
    expect(screen.getByText("debug_tile")).toBeInTheDocument();
  });
});
