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

  it("핸들러가 없으면 관련 CTA를 렌더하지 않는다", () => {
    render(
      <AnalysisStatusCard
        eligibleForRender={true}
        missingRequirements={[]}
        summaryChips={["네이비"]}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "이대로 렌더링" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "요청 더 수정" }),
    ).not.toBeInTheDocument();
  });

  it("옵션 CTA는 핸들러가 있을 때만 렌더한다", () => {
    render(
      <AnalysisStatusCard
        eligibleForRender={false}
        missingRequirements={["CI 이미지 필요"]}
        summaryChips={["원포인트"]}
        onOpenOptions={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "옵션 열기" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "요청 더 수정" }),
    ).not.toBeInTheDocument();
  });
});
