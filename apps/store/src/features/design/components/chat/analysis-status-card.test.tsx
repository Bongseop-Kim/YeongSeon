import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisStatusCard } from "@/features/design/components/chat/analysis-status-card";

describe("AnalysisStatusCard", () => {
  it("shows render CTA when eligibleForRender is true", () => {
    const onRender = vi.fn();

    render(
      <AnalysisStatusCard
        eligibleForRender={true}
        missingRequirements={[]}
        summaryChips={["네이비", "원포인트"]}
        onRender={onRender}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "이대로 렌더링" }));

    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it("shows missing requirement chips when render is not eligible", () => {
    render(
      <AnalysisStatusCard
        eligibleForRender={false}
        missingRequirements={["CI 이미지 필요"]}
        summaryChips={["원포인트"]}
      />,
    );

    expect(screen.getByText("입력 더 필요")).toBeInTheDocument();
    expect(screen.getByText("CI 이미지 필요")).toBeInTheDocument();
  });
});
