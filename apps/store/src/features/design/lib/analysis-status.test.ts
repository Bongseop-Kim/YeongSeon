import { describe, expect, it } from "vitest";
import {
  toAnalysisMissingRequirementLabels,
  toAnalysisSummaryChips,
} from "@/features/design/lib/analysis-status";

describe("analysis-status", () => {
  it("maps known missing requirements to user-facing labels", () => {
    expect(
      toAnalysisMissingRequirementLabels(["ciImage", "referenceImage"]),
    ).toEqual(["CI 이미지 필요", "참고 이미지 있으면 더 정확함"]);
  });

  it("falls back to a generic label for unknown requirements", () => {
    expect(toAnalysisMissingRequirementLabels(["unknown_requirement"])).toEqual(
      ["추가 입력이 필요합니다"],
    );
  });

  it("builds up to three summary chips from the latest design context", () => {
    expect(
      toAnalysisSummaryChips({
        colors: ["#1a2c5b", "#8B0000"],
        pattern: "stripe",
        fabricMethod: "yarn-dyed",
        ciPlacement: "one-point",
      }),
    ).toEqual(["네이비", "스트라이프", "원포인트"]);
  });
});
