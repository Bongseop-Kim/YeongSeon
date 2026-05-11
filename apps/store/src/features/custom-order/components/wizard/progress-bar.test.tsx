import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProgressBar } from "./progress-bar";
import type { StepConfig } from "@/features/custom-order/types/wizard";

vi.mock("@/shared/composite/utility-page", () => ({
  UtilityPageIntro: ({
    meta,
    trailing,
  }: {
    meta?: React.ReactNode;
    trailing?: React.ReactNode;
  }) => (
    <section data-testid="utility-page-intro">
      {meta}
      {trailing}
    </section>
  ),
}));

const steps: StepConfig[] = [
  {
    id: "quantity",
    label: "수량",
    validate: () => null,
    isSkippable: () => false,
  },
  {
    id: "fabric",
    label: "원단",
    validate: () => null,
    isSkippable: () => false,
  },
];

describe("ProgressBar", () => {
  it("페이지 헤더 문구 없이 현재 단계와 단계 인디케이터만 렌더링한다", () => {
    render(
      <ProgressBar
        steps={steps}
        currentStepIndex={0}
        visitedSteps={new Set([0])}
        completedSteps={new Set()}
        shouldShowStep={() => true}
        isHiddenStep={() => false}
        onStepClick={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("utility-page-intro")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom Order")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "주문 제작" })).toBeNull();
    expect(
      screen.queryByText(
        "수량과 제작 사양을 순서대로 정리하면 예상 제작 기간과 비용을 바로 확인할 수 있습니다.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Current Step")).toBeInTheDocument();
    expect(screen.getByText("수량")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });
});
