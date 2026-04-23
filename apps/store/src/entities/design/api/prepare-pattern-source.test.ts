import { describe, expect, it } from "vitest";
import {
  assessPatternPreparation,
  type PatternPreparationMetrics,
} from "@/entities/design/api/prepare-pattern-source";

const createMetrics = (
  overrides: Partial<PatternPreparationMetrics> = {},
): PatternPreparationMetrics => ({
  opaqueCoverageRatio: 0.18,
  dominantColorCount: 1,
  internalDetailRatio: 0.04,
  componentCount: 1,
  edgeTouchRatio: 0.01,
  outerMarginVariance: 0.05,
  spacingVariance: 0.05,
  singleMotifConfidence: 0.9,
  ...overrides,
});

describe("assessPatternPreparation", () => {
  it("균일한 단일 모티프는 one-point ready로 판정한다", () => {
    expect(
      assessPatternPreparation({
        placementMode: "one-point",
        fabricMethod: "yarn-dyed",
        metrics: createMetrics(),
      }),
    ).toEqual(
      expect.objectContaining({
        sourceStatus: "ready",
        fabricStatus: "ready",
        preparedSourceKind: "original",
      }),
    );
  });

  it("외곽 여백과 간격이 불균일하면 all-over repair_required로 판정한다", () => {
    expect(
      assessPatternPreparation({
        placementMode: "all-over",
        fabricMethod: "print",
        metrics: createMetrics({
          componentCount: 4,
          outerMarginVariance: 0.34,
          spacingVariance: 0.4,
        }),
      }),
    ).toEqual(
      expect.objectContaining({
        sourceStatus: "repair_required",
        preparedSourceKind: "repaired",
        reasonCodes: expect.arrayContaining([
          "uneven_outer_margin",
          "uneven_object_spacing",
        ]),
      }),
    );
  });

  it("선염에서 다색/세부 디테일이 많으면 fabric repair가 필요하다", () => {
    expect(
      assessPatternPreparation({
        placementMode: "all-over",
        fabricMethod: "yarn-dyed",
        metrics: createMetrics({
          dominantColorCount: 5,
          internalDetailRatio: 0.32,
        }),
      }),
    ).toEqual(
      expect.objectContaining({
        sourceStatus: "ready",
        fabricStatus: "repair_required",
        preparedSourceKind: "repaired",
        reasonCodes: expect.arrayContaining([
          "too_many_colors_for_yarn_dyed",
          "detail_too_fine_for_yarn_dyed",
        ]),
      }),
    );
  });
});
